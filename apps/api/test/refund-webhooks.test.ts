import type { Server } from 'node:http'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../src/lib/prisma.js', async () => ({
  prisma: (await import('./refund-fake-db.js')).fakeDb,
}))
vi.mock('../src/services/invoice-correction.js', () => ({
  createInvoiceCorrection: vi.fn(async (r: { id: string }) => ({
    id: `rk_${r.id}`,
    pdfPath: null,
    sentAt: null,
  })),
  generateInvoiceCorrectionPdf: vi.fn().mockResolvedValue('/invoices/RK.pdf'),
  sendInvoiceCorrectionEmail: vi.fn().mockResolvedValue('sent'),
}))
vi.mock('../src/services/tracking/events.js', () => ({ emitRefund: vi.fn() }))
vi.mock('../src/services/order-flow.js', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  markOrderPaid: vi.fn(),
}))

const { createApp } = await import('../src/app.js')
const { state, resetState } = await import('./refund-fake-db.js')
const { createInvoiceCorrection } = await import('../src/services/invoice-correction.js')
const { markOrderPaid } = await import('../src/services/order-flow.js')

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
beforeEach(() => {
  vi.clearAllMocks()
  resetState()
})

/** Mock mode (no STRIPE_SECRET_KEY): unsigned JSON events. */
function send(type: string, object: unknown) {
  return fetch(`${baseUrl}/api/webhooks/stripe`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ id: 'evt_1', type, data: { object } }),
  })
}

const stripeRefund = (over: Record<string, unknown> = {}) => ({
  id: 're_dash',
  object: 'refund',
  amount: 2000,
  payment_intent: 'pi_1',
  status: 'succeeded',
  failure_reason: null,
  ...over,
})

describe('Stripe refund webhooks', () => {
  it('imports a refund made in the Stripe dashboard (charge.refunded) and issues a correction', async () => {
    const res = await send('charge.refunded', {
      id: 'ch_1',
      refunds: { data: [stripeRefund()] },
    })
    expect(res.status).toBe(200)
    expect(state.refunds).toHaveLength(1)
    expect(state.refunds[0]).toMatchObject({
      providerRefundId: 're_dash',
      provider: 'stripe',
      status: 'succeeded',
      amountCents: 2000,
      createdById: null,
    })
    expect(createInvoiceCorrection).toHaveBeenCalledTimes(1)
  })

  it('is idempotent across redeliveries and refund.created + charge.refunded', async () => {
    await send('refund.created', stripeRefund())
    await send('refund.created', stripeRefund())
    await send('charge.refunded', { id: 'ch_1', refunds: { data: [stripeRefund()] } })
    expect(state.refunds).toHaveLength(1)
  })

  it('advances a pending refund via refund.updated', async () => {
    state.refunds.push({
      id: 'ref_own',
      paymentId: 'pay_1',
      provider: 'stripe',
      providerRefundId: 're_1',
      status: 'pending',
      amountCents: 10000,
    })
    await send('refund.updated', stripeRefund({ id: 're_1', amount: 10000 }))
    expect(state.refunds).toHaveLength(1)
    expect(state.refunds[0]!.status).toBe('succeeded')
    expect(state.order.status).toBe('refunded')
  })

  it('matches our own refund whose provider id is not stored yet', async () => {
    state.refunds.push({
      id: 'ref_own',
      paymentId: 'pay_1',
      provider: 'stripe',
      providerRefundId: null,
      status: 'pending',
      amountCents: 2000,
    })
    await send('refund.created', stripeRefund({ status: 'pending' }))
    expect(state.refunds).toHaveLength(1)
    expect(state.refunds[0]!.providerRefundId).toBe('re_dash')
  })

  it('records failed refunds without a correction', async () => {
    await send(
      'refund.failed',
      stripeRefund({ status: 'failed', failure_reason: 'expired_or_canceled_card' }),
    )
    expect(state.refunds[0]).toMatchObject({
      status: 'failed',
      failureReason: 'expired_or_canceled_card',
    })
    expect(createInvoiceCorrection).not.toHaveBeenCalled()
  })

  it('ignores refunds of unknown payments', async () => {
    const res = await send('refund.created', stripeRefund({ payment_intent: 'pi_unknown' }))
    expect(res.status).toBe(200)
    expect(state.refunds).toHaveLength(0)
  })

  it('stores the PaymentIntent when claiming a completed checkout session', async () => {
    resetState({
      payment: {
        status: 'pending',
        reference: null,
        stripePaymentIntentId: null,
        amountCents: 5699,
      },
    })
    state.order.status = 'awaiting_payment'
    vi.mocked((await import('./refund-fake-db.js')).fakeDb.payment.findFirst).mockResolvedValueOnce(
      {
        ...state.payment,
        order: { id: 'order_1', orderNumber: 'PS-1', status: 'awaiting_payment' },
      } as never,
    )
    await send('checkout.session.completed', {
      id: 'cs_1',
      payment_status: 'paid',
      payment_intent: 'pi_new',
      currency: 'eur',
      amount_total: 5699,
    })
    expect(state.payment.stripePaymentIntentId).toBe('pi_new')
    expect(markOrderPaid).toHaveBeenCalledWith('order_1', 'pay_1')
  })
})
