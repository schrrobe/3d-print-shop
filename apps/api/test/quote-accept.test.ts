import type { Server } from 'node:http'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../src/lib/prisma.js', () => {
  const prisma = {
    quote: { findUnique: vi.fn(), updateMany: vi.fn(), update: vi.fn() },
    quoteRequest: { update: vi.fn() },
    order: { create: vi.fn() },
    $transaction: vi.fn(),
  }
  prisma.$transaction.mockImplementation((cb: (tx: typeof prisma) => unknown) => cb(prisma))
  return { prisma }
})
vi.mock('../src/services/email.js', () => ({ sendEmail: vi.fn().mockResolvedValue(true) }))
vi.mock('../src/services/company.js', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  assertCompanyComplete: vi.fn(),
}))
vi.mock('../src/services/payments/stripe.js', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  createStripeCheckoutSession: vi.fn(),
}))

const { createApp } = await import('../src/app.js')
const { prisma } = await import('../src/lib/prisma.js')
const { sendEmail } = await import('../src/services/email.js')
const { createStripeCheckoutSession } = await import('../src/services/payments/stripe.js')
const { env } = await import('../src/env.js')

let server: Server
let baseUrl: string

beforeAll(async () => {
  server = createApp().listen(0)
  await new Promise((resolve) => server.once('listening', resolve))
  const address = server.address()
  if (address === null || typeof address === 'string') throw new Error('No server port')
  baseUrl = `http://127.0.0.1:${address.port}`
})

afterAll(() => {
  server.close()
})

const quoteRequest = { name: 'Halter', quantity: 3, locale: 'de' }
const sentQuote = {
  id: 'quote_1',
  status: 'sent',
  priceCents: 12900,
  validUntil: new Date(Date.now() + 86_400_000),
  quoteRequestId: 'qr_1',
  quoteRequest,
  order: null,
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(prisma.quote.updateMany).mockResolvedValue({ count: 1 })
  vi.mocked(prisma.order.create).mockImplementation((async (args: {
    data: Record<string, unknown> & { payments: { create: object } }
  }) => ({
    id: 'order_1',
    ...args.data,
    payments: [{ id: 'pay_1', ...args.data.payments.create }],
  })) as never)
})

function accept() {
  return fetch(`${baseUrl}/api/quotes/tok_123/accept`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      address: {
        firstName: 'Andrea',
        lastName: 'Annahme',
        street: 'Angebotsweg 1',
        zip: '10115',
        city: 'Berlin',
        country: 'DE',
        email: 'andrea@example.com',
      },
    }),
  })
}

describe('POST /api/quotes/:token/accept', () => {
  it('creates an online order and sends the order page as Zahlungslink', async () => {
    vi.mocked(prisma.quote.findUnique).mockResolvedValue(sentQuote as never)

    const res = await accept()

    expect(res.status).toBe(200)
    const body = (await res.json()) as {
      paymentUrl: string
      orderNumber: string
      accessToken: string
    }
    expect(body.paymentUrl).toBe(
      `${env.WEB_URL}/order/${body.orderNumber}?token=${body.accessToken}`,
    )
    expect(vi.mocked(prisma.order.create).mock.calls[0]![0].data).toMatchObject({
      source: 'quote',
      status: 'awaiting_payment',
      totalCents: 12900,
      payments: { create: { method: 'stripe', status: 'pending', amountCents: 12900 } },
    })
    expect(vi.mocked(createStripeCheckoutSession)).not.toHaveBeenCalled()
    expect(vi.mocked(sendEmail)).toHaveBeenCalledWith(
      'andrea@example.com',
      'quote_accepted',
      expect.objectContaining({
        text: expect.stringContaining(`/order/${body.orderNumber}?token=`),
      }),
    )
  })

  it('returns the same order page link when an accepted quote is retried, without a new mail', async () => {
    vi.mocked(prisma.quote.findUnique).mockResolvedValue({
      ...sentQuote,
      status: 'accepted',
      order: {
        orderNumber: 'PS-1',
        accessToken: 'acc',
        payments: [{ method: 'stripe', status: 'pending', stripePaymentLinkUrl: null }],
      },
    } as never)

    const res = await accept()

    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({ paymentUrl: `${env.WEB_URL}/order/PS-1?token=acc` })
    expect(vi.mocked(prisma.order.create)).not.toHaveBeenCalled()
    expect(vi.mocked(sendEmail)).not.toHaveBeenCalled()
  })

  it('keeps returning an already-sent legacy Stripe Payment Link', async () => {
    vi.mocked(prisma.quote.findUnique).mockResolvedValue({
      ...sentQuote,
      status: 'accepted',
      order: {
        orderNumber: 'PS-2',
        accessToken: 'acc',
        payments: [
          {
            method: 'stripe_payment_link',
            status: 'pending',
            stripePaymentLinkUrl: 'https://buy.stripe.com/legacy',
          },
        ],
      },
    } as never)

    const res = await accept()

    expect(await res.json()).toMatchObject({ paymentUrl: 'https://buy.stripe.com/legacy' })
  })
})
