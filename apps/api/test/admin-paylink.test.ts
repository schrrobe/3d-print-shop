import type { Server } from 'node:http'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../src/lib/prisma.js', () => {
  const prisma = {
    user: { findUnique: vi.fn() },
    adminAuditLog: { create: vi.fn().mockResolvedValue({}) },
    product: { count: vi.fn() },
    order: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      updateMany: vi.fn(),
    },
    payment: { updateMany: vi.fn(), create: vi.fn() },
    orderItem: { deleteMany: vi.fn(), createMany: vi.fn() },
    providerAssignment: { findFirst: vi.fn().mockResolvedValue(null) },
    shipment: { findMany: vi.fn().mockResolvedValue([]) },
    $queryRaw: vi.fn().mockResolvedValue([{ locked: true }]),
    $transaction: vi.fn(),
  }
  prisma.$transaction.mockImplementation((fn: (tx: unknown) => unknown) => fn(prisma))
  return { prisma }
})
vi.mock('../src/services/email.js', () => ({ sendEmail: vi.fn().mockResolvedValue(true) }))
vi.mock('../src/services/company.js', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  assertCompanyComplete: vi.fn(),
}))
vi.mock('../src/services/order-flow.js', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  issuePrepaymentInvoice: vi.fn().mockResolvedValue(undefined),
  notifyOrderEnded: vi.fn().mockResolvedValue(true),
}))
vi.mock('../src/services/payments/stripe.js', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  createStripePaymentLink: vi
    .fn()
    .mockResolvedValue({ sessionId: 'plink_1', url: 'https://buy.stripe.com/x' }),
  deactivateStripePaymentLink: vi.fn().mockResolvedValue(undefined),
  refundStripeSession: vi.fn().mockResolvedValue(undefined),
}))
vi.mock('../src/services/providers.js', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  cancelOpenAssignment: vi.fn().mockResolvedValue(null),
}))

const { createApp } = await import('../src/app.js')
const { prisma } = await import('../src/lib/prisma.js')
const { signSession, SESSION_COOKIE } = await import('../src/middleware/auth.js')
const { sendEmail } = await import('../src/services/email.js')
const { issuePrepaymentInvoice, notifyOrderEnded } = await import('../src/services/order-flow.js')
const { createStripePaymentLink, deactivateStripePaymentLink, refundStripeSession } =
  await import('../src/services/payments/stripe.js')
const { cancelOpenAssignment } = await import('../src/services/providers.js')

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

function post(path: string, body: unknown, method = 'POST') {
  return fetch(`${baseUrl}${path}`, {
    method,
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

describe('PUT /api/admin/orders/:id/items (edit paylink)', () => {
  const openOrder = (over: Record<string, unknown> = {}) =>
    vi.mocked(prisma.order.findUnique).mockResolvedValue({
      id: 'order_1',
      orderNumber: 'ORD-1',
      accessToken: 'tok',
      email: 'max@example.com',
      locale: 'de',
      source: 'admin',
      status: 'awaiting_payment',
      totalCents: 5699,
      payments: [
        {
          id: 'pay_old',
          method: 'stripe_payment_link',
          status: 'pending',
          stripeSessionId: 'plink_old',
        },
      ],
      ...over,
    } as never)
  const edit = {
    shippingCents: 699,
    items: [
      { name: '9mm Sonderbox', quantity: 2, unitPriceCents: 2500 },
      { name: '.308 Box', quantity: 1, unitPriceCents: 3000 },
    ],
  }

  it('swaps the link, replaces the items and mails the new link', async () => {
    openOrder()
    vi.mocked(prisma.payment.updateMany).mockResolvedValue({ count: 1 })
    vi.mocked(prisma.order.updateMany).mockResolvedValue({ count: 1 })
    vi.mocked(prisma.order.findUniqueOrThrow).mockResolvedValue({
      id: 'order_1',
      orderNumber: 'ORD-1',
      accessToken: 'tok',
      firstName: 'Max',
      email: 'max@example.com',
      locale: 'de',
      shippingCents: 699,
      totalCents: 8699,
      items: edit.items,
    } as never)

    const res = await post('/api/admin/orders/order_1/items', edit, 'PUT')

    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({ paymentUrl: 'https://buy.stripe.com/x' })
    expect(vi.mocked(deactivateStripePaymentLink)).toHaveBeenCalledWith('plink_old')
    expect(vi.mocked(createStripePaymentLink)).toHaveBeenCalledWith(
      expect.objectContaining({ amountCents: 8699 }),
    )
    expect(vi.mocked(prisma.payment.updateMany)).toHaveBeenCalledWith({
      where: { id: 'pay_old', status: 'pending', reference: null },
      data: { status: 'expired' },
    })
    expect(vi.mocked(prisma.order.updateMany)).toHaveBeenCalledWith({
      where: { id: 'order_1', status: 'awaiting_payment' },
      data: { subtotalCents: 8000, shippingCents: 699, totalCents: 8699 },
    })
    expect(vi.mocked(prisma.orderItem.deleteMany)).toHaveBeenCalledWith({
      where: { orderId: 'order_1' },
    })
    expect(vi.mocked(prisma.payment.create)).toHaveBeenCalledWith({
      data: expect.objectContaining({
        amountCents: 8699,
        stripeSessionId: 'plink_1',
        status: 'pending',
      }),
    })
    expect(vi.mocked(sendEmail)).toHaveBeenCalledWith(
      'max@example.com',
      'payment_link',
      expect.anything(),
    )
  })

  it('refuses Vorkasse, shop and already paid orders', async () => {
    for (const over of [
      { payments: [{ id: 'p', method: 'bank_transfer', status: 'pending' }] },
      { source: 'shop' },
      { status: 'paid' },
    ]) {
      openOrder(over)
      const res = await post('/api/admin/orders/order_1/items', edit, 'PUT')
      expect(res.status).toBe(409)
    }
    expect(vi.mocked(createStripePaymentLink)).not.toHaveBeenCalled()
  })

  it('leaves the old link working when the new link cannot be created', async () => {
    openOrder()
    vi.mocked(createStripePaymentLink).mockRejectedValueOnce(new Error('stripe down'))

    const res = await post('/api/admin/orders/order_1/items', edit, 'PUT')

    expect(res.status).toBe(500)
    expect(vi.mocked(deactivateStripePaymentLink)).not.toHaveBeenCalled()
  })

  it('keeps the order when the old link was paid meanwhile', async () => {
    openOrder()
    vi.mocked(prisma.payment.updateMany).mockResolvedValue({ count: 0 })
    vi.mocked(prisma.order.updateMany).mockResolvedValue({ count: 1 })

    const res = await post('/api/admin/orders/order_1/items', edit, 'PUT')

    expect(res.status).toBe(409)
    expect(vi.mocked(prisma.orderItem.deleteMany)).not.toHaveBeenCalled()
    expect(vi.mocked(deactivateStripePaymentLink)).toHaveBeenCalledWith('plink_1')
    expect(vi.mocked(sendEmail)).not.toHaveBeenCalled()
  })
})

describe('POST /api/admin/orders/:id/status cancelled', () => {
  it('deactivates an open payment link before cancelling', async () => {
    vi.mocked(prisma.order.findUnique).mockResolvedValue({
      id: 'order_1',
      status: 'awaiting_payment',
      shipments: [],
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
      shipments: [],
      payments: [],
    } as never)
    vi.mocked(prisma.order.updateMany).mockResolvedValue({ count: 0 })

    const res = await post('/api/admin/orders/order_1/status', { status: 'cancelled' })

    expect(res.status).toBe(409)
  })
})

describe('POST /api/admin/orders/:id/status refunds paid money', () => {
  const paidOrder = (payments: unknown[]) => {
    vi.mocked(prisma.order.findUnique).mockResolvedValue({
      id: 'order_1',
      status: 'paid',
      shipments: [],
      payments,
    } as never)
    vi.mocked(prisma.order.updateMany).mockResolvedValue({ count: 1 })
    vi.mocked(prisma.order.findUniqueOrThrow).mockResolvedValue({ id: 'order_1' } as never)
  }

  it('refunds a paid stripe payment link via its checkout session', async () => {
    paidOrder([
      {
        id: 'pay_1',
        method: 'stripe_payment_link',
        status: 'paid',
        stripeSessionId: 'plink_1',
        reference: 'cs_1',
        amountCents: 5699,
      },
    ])

    const res = await post('/api/admin/orders/order_1/status', { status: 'cancelled' })

    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({ manualRefund: false, customerEmailSent: true })
    expect(vi.mocked(refundStripeSession)).toHaveBeenCalledWith('cs_1', 'pay_1')
    expect(vi.mocked(notifyOrderEnded)).toHaveBeenCalledWith('order_1', 'cancelled', {
      stripeCents: 5699,
      manualCents: 0,
    })
    expect(vi.mocked(prisma.payment.updateMany)).toHaveBeenCalledWith({
      where: { id: 'pay_1', status: 'paid' },
      data: { status: 'refunded' },
    })
  })

  it('leaves the order unchanged when the stripe refund fails', async () => {
    paidOrder([{ id: 'pay_1', method: 'stripe', status: 'paid', stripeSessionId: 'cs_1' }])
    vi.mocked(refundStripeSession).mockRejectedValueOnce(new Error('stripe down'))

    const res = await post('/api/admin/orders/order_1/status', { status: 'refunded' })

    expect(res.status).toBe(500)
    expect(vi.mocked(prisma.order.updateMany)).not.toHaveBeenCalled()
    expect(vi.mocked(notifyOrderEnded)).not.toHaveBeenCalled()
  })

  it('says the money is back when the order changed after the refund, and a retry does not refund twice', async () => {
    const stripePayment = {
      id: 'pay_1',
      method: 'stripe',
      status: 'paid',
      stripeSessionId: 'cs_1',
      amountCents: 5699,
    }
    paidOrder([stripePayment])
    vi.mocked(prisma.order.updateMany).mockResolvedValueOnce({ count: 0 })

    const res = await post('/api/admin/orders/order_1/status', { status: 'cancelled' })

    expect(res.status).toBe(409)
    expect(((await res.json()) as { message: string }).message).toMatch(
      /56,99.*bereits über Stripe erstattet/,
    )
    expect(vi.mocked(prisma.adminAuditLog.create)).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: 'order.refund_without_status' }),
      }),
    )
    expect(vi.mocked(notifyOrderEnded)).not.toHaveBeenCalled()

    // Retry: the payment is refunded now, so only the status is set.
    vi.clearAllMocks()
    paidOrder([{ ...stripePayment, status: 'refunded' }])
    const retry = await post('/api/admin/orders/order_1/status', { status: 'cancelled' })

    expect(retry.status).toBe(200)
    expect(vi.mocked(refundStripeSession)).not.toHaveBeenCalled()
    expect(vi.mocked(notifyOrderEnded)).toHaveBeenCalledWith('order_1', 'cancelled', {
      stripeCents: 5699,
      manualCents: 0,
    })
  })

  it('flags a bank transfer for manual repayment', async () => {
    paidOrder([
      {
        id: 'pay_1',
        method: 'bank_transfer',
        status: 'paid',
        reference: 'RE-2026-1',
        amountCents: 4900,
      },
    ])

    const res = await post('/api/admin/orders/order_1/status', { status: 'refunded' })

    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({ manualRefund: true })
    expect(vi.mocked(notifyOrderEnded)).toHaveBeenCalledWith('order_1', 'refunded', {
      stripeCents: 0,
      manualCents: 4900,
    })
    expect(vi.mocked(refundStripeSession)).not.toHaveBeenCalled()
  })

  it('refunds an order in production: stripe refund, open link off, provider job cancelled', async () => {
    paidOrder([
      { id: 'pay_1', method: 'stripe', status: 'paid', stripeSessionId: 'cs_1', amountCents: 5699 },
      { id: 'pay_2', method: 'stripe_payment_link', status: 'pending', stripeSessionId: 'plink_2' },
    ])
    vi.mocked(prisma.order.findUnique).mockResolvedValue({
      ...(await prisma.order.findUnique({ where: { id: 'order_1' } }))!,
      status: 'in_production',
    } as never)

    const res = await post('/api/admin/orders/order_1/status', { status: 'refunded' })

    expect(res.status).toBe(200)
    expect(vi.mocked(refundStripeSession)).toHaveBeenCalledWith('cs_1', 'pay_1')
    expect(vi.mocked(deactivateStripePaymentLink)).toHaveBeenCalledWith('plink_2')
    expect(vi.mocked(cancelOpenAssignment)).toHaveBeenCalledWith('order_1')
    expect(vi.mocked(prisma.order.updateMany)).toHaveBeenCalledWith({
      where: { id: 'order_1', status: 'in_production' },
      data: { status: 'refunded' },
    })
  })

  it('still mails the customer when cancelling the provider job fails after the status write', async () => {
    paidOrder([])
    vi.mocked(cancelOpenAssignment).mockRejectedValueOnce(new Error('db hiccup'))

    const res = await post('/api/admin/orders/order_1/status', { status: 'refunded' })

    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({ providerCancelFailed: true })
    expect(vi.mocked(notifyOrderEnded)).toHaveBeenCalledWith('order_1', 'refunded', {
      stripeCents: 0,
      manualCents: 0,
    })
  })
})
