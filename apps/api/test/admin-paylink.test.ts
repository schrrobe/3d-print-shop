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
  closeStripeCheckoutSession: vi.fn().mockResolvedValue(true),
  deactivateStripePaymentLink: vi.fn().mockResolvedValue(undefined),
}))

const { createApp } = await import('../src/app.js')
const { prisma } = await import('../src/lib/prisma.js')
const { signSession, SESSION_COOKIE } = await import('../src/middleware/auth.js')
const { sendEmail } = await import('../src/services/email.js')
const { issuePrepaymentInvoice } = await import('../src/services/order-flow.js')
const { closeStripeCheckoutSession, deactivateStripePaymentLink } =
  await import('../src/services/payments/stripe.js')
const { env } = await import('../src/env.js')

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

describe('POST /api/admin/orders (Admin-Bestellung)', () => {
  it('creates an online order and mails the Zahlungslink to the order page', async () => {
    const res = await post('/api/admin/orders', { ...base, paymentMethod: 'online' })

    expect(res.status).toBe(201)
    const data = orderCreate.mock.calls[0]![0].data as Record<string, unknown>
    const orderPage = `${env.WEB_URL}/order/${String(data.orderNumber)}?token=${String(data.accessToken)}`
    expect(await res.json()).toMatchObject({ paymentUrl: orderPage, emailSent: true })
    expect(data).toMatchObject({
      source: 'admin',
      status: 'awaiting_payment',
      subtotalCents: 5000,
      totalCents: 5699,
      payments: { create: { method: 'stripe', status: 'pending', amountCents: 5699 } },
    })
    // No Stripe object up front: the order page starts card or PayPal.
    expect(data.payments).not.toHaveProperty('create.stripeSessionId')
    expect(data.payments).not.toHaveProperty('create.stripePaymentLinkUrl')
    const mail = vi.mocked(sendEmail).mock.calls.find((c) => c[1] === 'payment_link')
    expect(mail?.[0]).toBe('max@example.com')
    expect(mail?.[2].text).toContain(orderPage)
    expect(vi.mocked(issuePrepaymentInvoice)).not.toHaveBeenCalled()
  })

  it('creates a Vorkasse order and issues the invoice instead of a link', async () => {
    const res = await post('/api/admin/orders', { ...base, paymentMethod: 'bank_transfer' })

    expect(res.status).toBe(201)
    expect(await res.json()).toMatchObject({ paymentUrl: null })
    expect(orderCreate.mock.calls[0]![0].data).toMatchObject({
      status: 'awaiting_bank_transfer',
      payments: { create: { method: 'bank_transfer' } },
    })
    expect(vi.mocked(issuePrepaymentInvoice)).toHaveBeenCalledWith('order_1')
    expect(vi.mocked(sendEmail)).not.toHaveBeenCalledWith(
      expect.anything(),
      'payment_link',
      expect.anything(),
    )
  })

  it('rejects the retired stripe_payment_link method', async () => {
    const res = await post('/api/admin/orders', { ...base, paymentMethod: 'stripe_payment_link' })
    expect(res.status).toBe(400)
    expect(orderCreate).not.toHaveBeenCalled()
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
      paymentMethod: 'online',
      shippingCents: 0,
      items: [{ name: 'X', quantity: 1, unitPriceCents: 10 }],
    })
    expect(tooSmall.status).toBe(400)
    expect(orderCreate).not.toHaveBeenCalled()
  })
})

function mockOrder(status: string, payments: unknown[] = []) {
  vi.mocked(prisma.order.findUnique).mockResolvedValue({ id: 'order_1', status, payments } as never)
  vi.mocked(prisma.order.updateMany).mockResolvedValue({ count: 1 })
  vi.mocked(prisma.order.findUniqueOrThrow).mockResolvedValue({ id: 'order_1' } as never)
}

describe('POST /api/admin/orders/:id/status', () => {
  it('expires the open Stripe checkout session before cancelling', async () => {
    mockOrder('awaiting_payment', [
      { id: 'pay_1', method: 'stripe', status: 'pending', stripeSessionId: 'cs_1' },
    ])

    const res = await post('/api/admin/orders/order_1/status', { status: 'cancelled' })

    expect(res.status).toBe(200)
    expect(vi.mocked(closeStripeCheckoutSession)).toHaveBeenCalledWith('cs_1')
    expect(vi.mocked(deactivateStripePaymentLink)).not.toHaveBeenCalled()
    expect(vi.mocked(prisma.payment.updateMany)).toHaveBeenCalledWith({
      where: { id: 'pay_1', status: 'pending' },
      data: { status: 'expired' },
    })
  })

  it('refuses to cancel when the Stripe session just completed', async () => {
    mockOrder('awaiting_payment', [
      { id: 'pay_1', method: 'stripe', status: 'pending', stripeSessionId: 'cs_1' },
    ])
    vi.mocked(closeStripeCheckoutSession).mockResolvedValueOnce(false)

    const res = await post('/api/admin/orders/order_1/status', { status: 'cancelled' })

    expect(res.status).toBe(409)
    expect(vi.mocked(prisma.order.updateMany)).not.toHaveBeenCalled()
  })

  it('cancels an online order without a Stripe session yet (or a PayPal one) directly', async () => {
    mockOrder('awaiting_payment', [
      { id: 'pay_1', method: 'paypal', status: 'pending', stripeSessionId: null },
    ])

    const res = await post('/api/admin/orders/order_1/status', { status: 'cancelled' })

    expect(res.status).toBe(200)
    expect(vi.mocked(closeStripeCheckoutSession)).not.toHaveBeenCalled()
    expect(vi.mocked(prisma.payment.updateMany)).not.toHaveBeenCalled()
  })

  it('still deactivates a legacy Stripe payment link before cancelling', async () => {
    mockOrder('awaiting_payment', [
      { id: 'pay_1', method: 'stripe_payment_link', status: 'pending', stripeSessionId: 'plink_1' },
    ])

    const res = await post('/api/admin/orders/order_1/status', { status: 'cancelled' })

    expect(res.status).toBe(200)
    expect(vi.mocked(deactivateStripePaymentLink)).toHaveBeenCalledWith('plink_1')
    expect(vi.mocked(prisma.payment.updateMany)).toHaveBeenCalledWith({
      where: { id: 'pay_1', status: 'pending' },
      data: { status: 'expired' },
    })
  })

  it('refuses to cancel an order a webhook just marked paid', async () => {
    mockOrder('awaiting_payment')
    vi.mocked(prisma.order.updateMany).mockResolvedValue({ count: 0 })

    const res = await post('/api/admin/orders/order_1/status', { status: 'cancelled' })

    expect(res.status).toBe(409)
  })

  it('rejects a manual switch to refunded (refunds go through the refund function)', async () => {
    mockOrder('paid')

    const res = await post('/api/admin/orders/order_1/status', { status: 'refunded' })

    expect(res.status).toBe(409)
    expect(((await res.json()) as { message: string }).message).toContain('Erstattung')
    expect(vi.mocked(prisma.order.updateMany)).not.toHaveBeenCalled()
  })

  it('rejects paid → cancelled (use "Stornieren & erstatten")', async () => {
    mockOrder('paid')

    const res = await post('/api/admin/orders/order_1/status', { status: 'cancelled' })

    expect(res.status).toBe(409)
    expect(((await res.json()) as { message: string }).message).toContain('Stornieren & erstatten')
    expect(vi.mocked(prisma.order.updateMany)).not.toHaveBeenCalled()
  })
})
