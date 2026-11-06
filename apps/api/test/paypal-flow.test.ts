import type { Server } from 'node:http'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import type * as OrderFlow from '../src/services/order-flow.js'
import type * as Paypal from '../src/services/payments/paypal.js'

vi.mock('../src/lib/prisma.js', () => ({
  prisma: {
    order: { findUnique: vi.fn() },
    payment: { findUnique: vi.fn(), findFirst: vi.fn(), updateMany: vi.fn(), update: vi.fn() },
  },
}))
vi.mock('../src/services/email.js', () => ({ sendEmail: vi.fn().mockResolvedValue(true) }))
vi.mock('../src/services/order-flow.js', async (importOriginal) => ({
  ...(await importOriginal<typeof OrderFlow>()),
  markOrderPaid: vi.fn(),
}))
vi.mock('../src/services/refunds.js', () => ({ syncProviderRefund: vi.fn() }))
vi.mock('../src/services/payments/paypal.js', async (importOriginal) => ({
  ...(await importOriginal<typeof Paypal>()),
  capturePaypalOrder: vi.fn(),
  verifyPaypalWebhook: vi.fn(),
}))

const { createApp } = await import('../src/app.js')
const { prisma } = await import('../src/lib/prisma.js')
const { sendEmail } = await import('../src/services/email.js')
const { markOrderPaid } = await import('../src/services/order-flow.js')
const { syncProviderRefund } = await import('../src/services/refunds.js')
const { capturePaypalOrder, verifyPaypalWebhook, PaypalApiError } =
  await import('../src/services/payments/paypal.js')

const orderFind = vi.mocked(prisma.order.findUnique)
const paymentFind = vi.mocked(prisma.payment.findUnique)
const paymentFindFirst = vi.mocked(prisma.payment.findFirst)
const updateMany = vi.mocked(prisma.payment.updateMany)
const update = vi.mocked(prisma.payment.update)
const capture = vi.mocked(capturePaypalOrder)
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

const ORDER = { id: 'order_1', orderNumber: 'PS-1', accessToken: 'acc' }

function payment(overrides: Record<string, unknown> = {}) {
  return {
    id: 'pay_1',
    orderId: 'order_1',
    method: 'paypal',
    status: 'pending',
    amountCents: 5699,
    paypalOrderId: 'PP1',
    paypalCaptureId: null,
    stripeSessionId: null,
    order: { id: 'order_1', orderNumber: 'PS-1', status: 'awaiting_payment' },
    ...overrides,
  } as never
}

const completed = { captureId: 'CAP1', status: 'COMPLETED', amountCents: 5699, currency: 'EUR' }

beforeEach(() => {
  vi.clearAllMocks()
  orderFind.mockResolvedValue(ORDER as never)
  paymentFind.mockResolvedValue(payment())
  updateMany.mockResolvedValue({ count: 1 })
  capture.mockResolvedValue(completed)
  vi.mocked(verifyPaypalWebhook).mockResolvedValue(true)
})

async function paypalReturn(query = 'order=PS-1&access=acc&token=PP1&PayerID=X') {
  const res = await fetch(`${baseUrl}/api/payments/paypal/return?${query}`, { redirect: 'manual' })
  expect(res.status).toBe(303)
  return res.headers.get('location') ?? ''
}

const adminAlerts = () =>
  vi.mocked(sendEmail).mock.calls.filter(([, template]) => template === 'admin_notification')

describe('GET /api/payments/paypal/return', () => {
  it('captures an awaiting order, stores the capture and marks it paid', async () => {
    expect(await paypalReturn()).toMatch(/\/checkout\/success\?order=PS-1&token=acc$/)
    expect(updateMany).toHaveBeenCalledWith({
      where: {
        id: 'pay_1',
        method: 'paypal',
        paypalOrderId: 'PP1',
        status: { in: ['pending', 'processing'] },
        order: { status: 'awaiting_payment' },
      },
      data: { status: 'processing' },
    })
    expect(capture).toHaveBeenCalledWith('PP1')
    expect(update).toHaveBeenCalledWith({
      where: { id: 'pay_1' },
      data: { paypalCaptureId: 'CAP1' },
    })
    expect(vi.mocked(markOrderPaid)).toHaveBeenCalledWith('order_1', 'pay_1')
  })

  it('does not capture when the claim fails (cancelled order / switched method)', async () => {
    updateMany.mockResolvedValueOnce({ count: 0 })
    expect(await paypalReturn()).toMatch(/\/order\/PS-1\?token=acc&paypal=failed$/)
    expect(capture).not.toHaveBeenCalled()
    expect(vi.mocked(markOrderPaid)).not.toHaveBeenCalled()
  })

  it('cancel goes back to the order page without capturing', async () => {
    expect(await paypalReturn('order=PS-1&access=acc&cancelled=1&token=PP1')).toMatch(
      /\/order\/PS-1\?token=acc&paypal=cancelled$/,
    )
    expect(capture).not.toHaveBeenCalled()
  })

  it('refuses a token that is not the payment’s current PayPal order', async () => {
    paymentFind.mockResolvedValueOnce(null)
    expect(await paypalReturn('order=PS-1&access=acc&token=OLD')).toContain('paypal=failed')
    expect(paymentFind).toHaveBeenCalledWith(
      expect.objectContaining({ where: { paypalOrderId: 'OLD' } }),
    )
    expect(capture).not.toHaveBeenCalled()
  })

  it('refuses a PayPal order belonging to another order', async () => {
    paymentFind.mockResolvedValueOnce(payment({ orderId: 'order_2' }))
    expect(await paypalReturn()).toContain('paypal=failed')
    expect(capture).not.toHaveBeenCalled()
  })

  it('never reveals the order page for a wrong access token', async () => {
    const location = await paypalReturn('order=PS-1&access=nope&token=PP1')
    expect(location).not.toContain('acc')
    expect(capture).not.toHaveBeenCalled()
  })

  it('is idempotent on a double return', async () => {
    paymentFind.mockResolvedValueOnce(payment({ status: 'paid', paypalCaptureId: 'CAP1' }))
    expect(await paypalReturn()).toContain('/checkout/success')
    expect(capture).not.toHaveBeenCalled()
    expect(vi.mocked(markOrderPaid)).not.toHaveBeenCalled()
  })

  it('does not mark paid when the captured amount differs', async () => {
    capture.mockResolvedValueOnce({ ...completed, amountCents: 100 })
    expect(await paypalReturn()).toContain('paypal=failed')
    expect(vi.mocked(markOrderPaid)).not.toHaveBeenCalled()
    expect(adminAlerts()).toHaveLength(1)
  })

  it('treats a pending capture as success without marking paid', async () => {
    capture.mockResolvedValueOnce({ ...completed, status: 'PENDING' })
    expect(await paypalReturn()).toContain('/checkout/success')
    expect(vi.mocked(markOrderPaid)).not.toHaveBeenCalled()
  })

  it('releases the claim when PayPal declines the capture', async () => {
    capture.mockRejectedValueOnce(new PaypalApiError(422, 'INSTRUMENT_DECLINED', 'declined'))
    expect(await paypalReturn()).toContain('paypal=failed')
    expect(updateMany).toHaveBeenLastCalledWith({
      where: { id: 'pay_1', status: 'processing' },
      data: { status: 'pending' },
    })
  })

  it('keeps the claim and alerts when the capture outcome is unknown (timeout/5xx)', async () => {
    capture.mockRejectedValueOnce(new PaypalApiError(503, undefined, 'unavailable'))
    expect(await paypalReturn()).toContain('paypal=failed')
    expect(updateMany).toHaveBeenCalledTimes(1) // only the claim, never released to pending
    expect(adminAlerts()).toHaveLength(1)
  })
})

function webhook(body: unknown) {
  return fetch(`${baseUrl}/api/webhooks/paypal`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/webhooks/paypal', () => {
  it('rejects an invalid signature', async () => {
    vi.mocked(verifyPaypalWebhook).mockResolvedValueOnce(false)
    const res = await webhook({ event_type: 'CHECKOUT.ORDER.APPROVED', resource: { id: 'PP1' } })
    expect(res.status).toBe(400)
    expect(capture).not.toHaveBeenCalled()
  })

  it('captures an approved order through the same gated path', async () => {
    const res = await webhook({ event_type: 'CHECKOUT.ORDER.APPROVED', resource: { id: 'PP1' } })
    expect(res.status).toBe(200)
    expect(updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: 'processing' } }),
    )
    expect(capture).toHaveBeenCalledWith('PP1')
    expect(vi.mocked(markOrderPaid)).toHaveBeenCalledWith('order_1', 'pay_1')
  })

  it('marks paid on PAYMENT.CAPTURE.COMPLETED', async () => {
    paymentFindFirst.mockResolvedValueOnce(payment({ status: 'processing' }))
    const res = await webhook({
      event_type: 'PAYMENT.CAPTURE.COMPLETED',
      resource: {
        id: 'CAP1',
        status: 'COMPLETED',
        amount: { value: '56.99', currency_code: 'EUR' },
        supplementary_data: { related_ids: { order_id: 'PP1' } },
      },
    })
    expect(res.status).toBe(200)
    expect(vi.mocked(markOrderPaid)).toHaveBeenCalledWith('order_1', 'pay_1')
  })

  it('alerts on a verified capture that matches no payment', async () => {
    paymentFindFirst.mockResolvedValueOnce(null)
    await webhook({
      event_type: 'PAYMENT.CAPTURE.COMPLETED',
      resource: { id: 'CAP9', status: 'COMPLETED', amount: { value: '56.99', currency_code: 'EUR' } },
    })
    expect(vi.mocked(markOrderPaid)).not.toHaveBeenCalled()
    expect(adminAlerts()).toHaveLength(1)
  })

  it('alerts instead of marking a cancelled order paid', async () => {
    paymentFindFirst.mockResolvedValueOnce(
      payment({ order: { id: 'order_1', orderNumber: 'PS-1', status: 'cancelled' } }),
    )
    await webhook({
      event_type: 'PAYMENT.CAPTURE.COMPLETED',
      resource: {
        id: 'CAP1',
        status: 'COMPLETED',
        amount: { value: '56.99', currency_code: 'EUR' },
      },
    })
    expect(vi.mocked(markOrderPaid)).not.toHaveBeenCalled()
    expect(adminAlerts()).toHaveLength(1)
  })

  it('forwards refunds to syncProviderRefund', async () => {
    const res = await webhook({
      event_type: 'PAYMENT.CAPTURE.REFUNDED',
      resource: {
        id: 'R1',
        status: 'COMPLETED',
        amount: { value: '10.00', currency_code: 'EUR' },
        links: [{ rel: 'up', href: 'https://api-m.paypal.com/v2/payments/captures/CAP1' }],
      },
    })
    expect(res.status).toBe(200)
    expect(vi.mocked(syncProviderRefund)).toHaveBeenCalledWith({
      provider: 'paypal',
      payment: { paypalCaptureId: 'CAP1' },
      providerRefundId: 'R1',
      amountCents: 1000,
      status: 'succeeded',
      failureReason: null,
    })
  })
})

function orderWith(p: Record<string, unknown>, status = 'awaiting_payment') {
  return {
    ...ORDER,
    status,
    email: 'a@b.c',
    locale: 'de',
    items: [],
    invoice: null,
    payments: [{ ...(payment() as object), bitcoinPayment: null, ...p }],
  } as never
}

describe('switching the payment method on the order page', () => {
  it('switches a pending Stripe payment to a fresh PayPal order', async () => {
    orderFind.mockResolvedValueOnce(
      orderWith({ method: 'stripe', stripeSessionId: 'mock_cs_1', paypalOrderId: null }),
    )
    const res = await fetch(`${baseUrl}/api/orders/PS-1/paypal-order?token=acc`, {
      method: 'POST',
    })
    expect(res.status).toBe(200)
    const { redirectUrl } = (await res.json()) as { redirectUrl: string }
    expect(redirectUrl).toContain(
      '/api/payments/paypal/return?order=PS-1&access=acc&token=mock_pp_5699_',
    )
    expect(updateMany).toHaveBeenCalledWith({
      where: {
        id: 'pay_1',
        status: 'pending',
        method: 'stripe',
        stripeSessionId: 'mock_cs_1',
        paypalOrderId: null,
      },
      data: {
        method: 'paypal',
        paypalOrderId: expect.stringMatching(/^mock_pp_/),
        stripePaymentLinkUrl: null,
      },
    })
  })

  it('reports a lost race', async () => {
    orderFind.mockResolvedValueOnce(orderWith({}))
    updateMany.mockResolvedValueOnce({ count: 0 })
    const res = await fetch(`${baseUrl}/api/orders/PS-1/paypal-order?token=acc`, {
      method: 'POST',
    })
    expect(res.status).toBe(409)
  })

  it('refuses Vorkasse orders', async () => {
    orderFind.mockResolvedValueOnce(
      orderWith({ method: 'bank_transfer', paypalOrderId: null }, 'awaiting_bank_transfer'),
    )
    const res = await fetch(`${baseUrl}/api/orders/PS-1/paypal-order?token=acc`, {
      method: 'POST',
    })
    expect(res.status).toBe(409)
    expect(updateMany).not.toHaveBeenCalled()
  })

  it('switches back to Stripe and drops the PayPal order', async () => {
    orderFind.mockResolvedValueOnce(orderWith({}))
    const res = await fetch(`${baseUrl}/api/orders/PS-1/stripe-session?token=acc`, {
      method: 'POST',
    })
    expect(res.status).toBe(200)
    expect(((await res.json()) as { redirectUrl: string }).redirectUrl).toContain('mock=1')
    expect(updateMany).toHaveBeenCalledWith({
      where: {
        id: 'pay_1',
        status: 'pending',
        method: 'paypal',
        stripeSessionId: null,
        paypalOrderId: 'PP1',
      },
      data: expect.objectContaining({ method: 'stripe', paypalOrderId: null }),
    })
  })
})

describe('GET /api/payments/methods', () => {
  it('offers PayPal in dev mock mode', async () => {
    const res = await fetch(`${baseUrl}/api/payments/methods`)
    expect(((await res.json()) as { methods: string[] }).methods).toContain('paypal')
  })
})
