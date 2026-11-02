import type { Server } from 'node:http'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../src/lib/prisma.js', () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    adminAuditLog: { create: vi.fn().mockResolvedValue({}) },
    product: { count: vi.fn() },
    order: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      updateMany: vi.fn(),
    },
    payment: { updateMany: vi.fn() },
  },
}))
vi.mock('../src/services/email.js', () => ({ sendEmail: vi.fn().mockResolvedValue(true) }))
vi.mock('../src/services/company.js', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  assertCompanyComplete: vi.fn(),
}))
vi.mock('../src/services/order-flow.js', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  issuePrepaymentInvoice: vi.fn().mockResolvedValue(undefined),
}))
vi.mock('../src/services/payments/stripe.js', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  createStripePaymentLink: vi
    .fn()
    .mockResolvedValue({ sessionId: 'plink_1', url: 'https://buy.stripe.com/x' }),
  deactivateStripePaymentLink: vi.fn().mockResolvedValue(undefined),
}))

const { createApp } = await import('../src/app.js')
const { prisma } = await import('../src/lib/prisma.js')
const { signSession, SESSION_COOKIE } = await import('../src/middleware/auth.js')
const { sendEmail } = await import('../src/services/email.js')
const { issuePrepaymentInvoice } = await import('../src/services/order-flow.js')
const { createStripePaymentLink, deactivateStripePaymentLink } =
  await import('../src/services/payments/stripe.js')

const orderCreate = vi.mocked(prisma.order.create)
let server: Server
let baseUrl: string
const cookie = `${SESSION_COOKIE}=${signSession(
  { id: 'user_1', email: 'admin@example.com', name: 'Admin', role: 'admin' },
  0,
)}`

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

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(prisma.user.findUnique).mockResolvedValue({
    id: 'user_1',
    email: 'admin@example.com',
    name: 'Admin',
    active: true,
    sessionVersion: 0,
    sessionsInvalidatedAt: null,
    role: { name: 'admin' },
  } as never)
  orderCreate.mockImplementation((async (args: { data: Record<string, unknown> }) => ({
    id: 'order_1',
    accessToken: 'tok',
    ...args.data,
    items: [{ name: '9mm Sonderbox', quantity: 2, unitPriceCents: 2500 }],
  })) as never)
})

function post(path: string, body: unknown) {
  return fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', cookie },
    body: JSON.stringify(body),
  })
}

const base = {
  address: {
    firstName: 'Max',
    lastName: 'Muster',
    street: 'Hauptstr. 1',
    zip: '10115',
    city: 'Berlin',
    country: 'DE',
    email: 'max@example.com',
  },
  shippingCents: 699,
  items: [{ name: '9mm Sonderbox', quantity: 2, unitPriceCents: 2500 }],
}

describe('POST /api/admin/orders (paylink)', () => {
  it('creates a stripe paylink order and mails the link', async () => {
    const res = await post('/api/admin/orders', { ...base, paymentMethod: 'stripe_payment_link' })

    expect(res.status).toBe(201)
    expect(await res.json()).toMatchObject({
      paymentUrl: 'https://buy.stripe.com/x',
      emailSent: true,
    })
    expect(vi.mocked(createStripePaymentLink)).toHaveBeenCalledWith(
      expect.objectContaining({ amountCents: 5699 }),
    )
    const data = orderCreate.mock.calls[0]![0].data
    expect(data).toMatchObject({
      source: 'admin',
      status: 'awaiting_payment',
      subtotalCents: 5000,
      totalCents: 5699,
      payments: {
        create: { method: 'stripe_payment_link', amountCents: 5699, stripeSessionId: 'plink_1' },
      },
    })
    expect(vi.mocked(sendEmail)).toHaveBeenCalledWith(
      'max@example.com',
      'payment_link',
      expect.anything(),
    )
    expect(vi.mocked(issuePrepaymentInvoice)).not.toHaveBeenCalled()
  })

  it('creates a Vorkasse order and issues the invoice instead of a link', async () => {
    const res = await post('/api/admin/orders', { ...base, paymentMethod: 'bank_transfer' })

    expect(res.status).toBe(201)
    expect(vi.mocked(createStripePaymentLink)).not.toHaveBeenCalled()
    expect(orderCreate.mock.calls[0]![0].data).toMatchObject({
      status: 'awaiting_bank_transfer',
    })
    expect(vi.mocked(issuePrepaymentInvoice)).toHaveBeenCalledWith('order_1')
    expect(vi.mocked(sendEmail)).not.toHaveBeenCalledWith(
      expect.anything(),
      'payment_link',
      expect.anything(),
    )
  })

  it('rejects unknown products and totals below 0,50 €', async () => {
    vi.mocked(prisma.product.count).mockResolvedValue(0)
    const unknown = await post('/api/admin/orders', {
      ...base,
      paymentMethod: 'bank_transfer',
      items: [{ productId: 'nope', name: 'X', quantity: 1, unitPriceCents: 1000 }],
    })
    expect(unknown.status).toBe(400)

    const tooSmall = await post('/api/admin/orders', {
      ...base,
      paymentMethod: 'stripe_payment_link',
      shippingCents: 0,
      items: [{ name: 'X', quantity: 1, unitPriceCents: 10 }],
    })
    expect(tooSmall.status).toBe(400)
    expect(orderCreate).not.toHaveBeenCalled()
  })

  it('deactivates the stripe link when the order cannot be stored', async () => {
    orderCreate.mockRejectedValueOnce(new Error('db down'))
    const res = await post('/api/admin/orders', { ...base, paymentMethod: 'stripe_payment_link' })

    expect(res.status).toBe(500)
    expect(vi.mocked(deactivateStripePaymentLink)).toHaveBeenCalledWith('plink_1')
  })
})

describe('POST /api/admin/orders/:id/status cancelled', () => {
  it('deactivates an open payment link before cancelling', async () => {
    vi.mocked(prisma.order.findUnique).mockResolvedValue({
      id: 'order_1',
      status: 'awaiting_payment',
      payments: [
        {
          id: 'pay_1',
          method: 'stripe_payment_link',
          status: 'pending',
          stripeSessionId: 'plink_1',
        },
      ],
    } as never)
    vi.mocked(prisma.order.updateMany).mockResolvedValue({ count: 1 })
    vi.mocked(prisma.order.findUniqueOrThrow).mockResolvedValue({ id: 'order_1' } as never)

    const res = await post('/api/admin/orders/order_1/status', { status: 'cancelled' })

    expect(res.status).toBe(200)
    expect(vi.mocked(deactivateStripePaymentLink)).toHaveBeenCalledWith('plink_1')
    expect(vi.mocked(prisma.payment.updateMany)).toHaveBeenCalledWith({
      where: { id: 'pay_1', status: 'pending' },
      data: { status: 'expired' },
    })
  })

  it('refuses to cancel an order a webhook just marked paid', async () => {
    vi.mocked(prisma.order.findUnique).mockResolvedValue({
      id: 'order_1',
      status: 'awaiting_payment',
      payments: [],
    } as never)
    vi.mocked(prisma.order.updateMany).mockResolvedValue({ count: 0 })

    const res = await post('/api/admin/orders/order_1/status', { status: 'cancelled' })

    expect(res.status).toBe(409)
  })
})
