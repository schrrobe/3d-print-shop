import { beforeEach, describe, expect, it, vi } from 'vitest'

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
vi.mock('../src/services/payments/stripe.js', () => ({
  stripeConfigured: true,
  createStripeRefund: vi.fn(),
  stripePaymentIntentForSession: vi.fn(),
}))
vi.mock('../src/services/payments/paypal.js', () => ({ refundPaypalCapture: vi.fn() }))

const { state, resetState } = await import('./refund-fake-db.js')
const { createRefund, getOrderRefunds, onRefundSucceeded } =
  await import('../src/services/refunds.js')
const { createInvoiceCorrection, sendInvoiceCorrectionEmail } =
  await import('../src/services/invoice-correction.js')
const { emitRefund } = await import('../src/services/tracking/events.js')
const { createStripeRefund, stripePaymentIntentForSession } =
  await import('../src/services/payments/stripe.js')
const { refundPaypalCapture } = await import('../src/services/payments/paypal.js')

const stripeRefund = vi.mocked(createStripeRefund)
let reId = 0

beforeEach(() => {
  vi.clearAllMocks()
  resetState()
  reId = 0
  stripeRefund.mockImplementation(async () => ({
    id: `re_${++reId}`,
    status: 'succeeded',
    failureReason: null,
  }))
})

const refund = (over: Partial<Parameters<typeof createRefund>[0]> = {}) =>
  createRefund({ orderId: 'order_1', reason: 'Kulanz', adminUserId: 'admin_1', ...over })

describe('createRefund', () => {
  it('partially refunds via Stripe and issues a correction without status change', async () => {
    const r = await refund({ amountCents: 2500 })

    expect(stripeRefund).toHaveBeenCalledWith({
      paymentIntentId: 'pi_1',
      amountCents: 2500,
      idempotencyKey: r.id,
    })
    expect(r).toMatchObject({ status: 'succeeded', providerRefundId: 're_1', provider: 'stripe' })
    expect(createInvoiceCorrection).toHaveBeenCalledTimes(1)
    expect(sendInvoiceCorrectionEmail).toHaveBeenCalledWith(`rk_${r.id}`)
    expect(state.payment.status).toBe('paid')
    expect(state.order.status).toBe('paid')
    expect(emitRefund).not.toHaveBeenCalled()
    expect((await getOrderRefunds('order_1')).refundableCents).toBe(7500)
  })

  it('allows multiple refunds up to the paid amount, then finalizes once', async () => {
    state.jobs = [
      { id: 'j1', orderId: 'order_1', status: 'waiting', printerId: null },
      { id: 'j2', orderId: 'order_1', status: 'assigned', printerId: 'pr_1' },
      { id: 'j3', orderId: 'order_1', status: 'printing', printerId: 'pr_2' },
    ]
    state.printers = [
      { id: 'pr_1', status: 'prepared' },
      { id: 'pr_2', status: 'printing' },
    ]
    state.order.status = 'in_production'

    await refund({ amountCents: 4000 })
    expect(state.order.status).toBe('in_production')
    const last = await refund({ amountCents: 6000 })

    expect(state.payment.status).toBe('refunded')
    expect(state.order.status).toBe('refunded')
    expect(state.jobs.map((j) => j.status)).toEqual(['failed', 'failed', 'printing'])
    expect(state.printers.map((p) => p.status)).toEqual(['idle', 'printing'])
    expect(emitRefund).toHaveBeenCalledTimes(1)

    // Retry (webhook) is idempotent: no second status claim.
    await onRefundSucceeded(last.id)
    expect(state.order.status).toBe('refunded')
    await expect(refund({ amountCents: 1 })).rejects.toThrow(/Keine bezahlte Zahlung/)
  })

  it('rejects an amount above the refundable remainder without calling the provider', async () => {
    await refund({ amountCents: 9000 })
    stripeRefund.mockClear()
    await expect(refund({ amountCents: 1001 })).rejects.toThrow(/erstattbaren Rest \(1000 Cent\)/)
    expect(stripeRefund).not.toHaveBeenCalled()
  })

  it('counts pending refunds against the remainder', async () => {
    stripeRefund.mockResolvedValueOnce({ id: 're_p', status: 'pending', failureReason: null })
    const pending = await refund({ amountCents: 6000 })
    expect(pending.status).toBe('pending')
    expect(createInvoiceCorrection).not.toHaveBeenCalled()

    await expect(refund({ amountCents: 4001 })).rejects.toThrow(/erstattbaren Rest/)
    const full = await refund({ full: true })
    expect(full.amountCents).toBe(4000)
  })

  it('marks provider errors as failed, issues no correction and frees the amount', async () => {
    stripeRefund.mockRejectedValueOnce(new Error('card_declined'))
    const failed = await refund({ amountCents: 3000 })

    expect(failed).toMatchObject({ status: 'failed', failureReason: 'card_declined' })
    expect(createInvoiceCorrection).not.toHaveBeenCalled()
    expect((await getOrderRefunds('order_1')).refundableCents).toBe(10000)
  })

  it('requires an invoice', async () => {
    resetState({ invoice: null })
    await expect(refund({ amountCents: 100 })).rejects.toThrow('Rechnung zuerst erzeugen')
  })

  it('records manual refunds for bank transfers only after confirmation', async () => {
    resetState({ payment: { method: 'bank_transfer', stripePaymentIntentId: null } })
    await expect(refund({ amountCents: 500 })).rejects.toThrow(/zurücküberwiesen/)

    const r = await refund({ amountCents: 500, confirmManual: true })
    expect(r).toMatchObject({ provider: 'manual', status: 'succeeded', providerRefundId: null })
    expect(stripeRefund).not.toHaveBeenCalled()
    expect(createInvoiceCorrection).toHaveBeenCalledTimes(1)
  })

  it('refunds PayPal captures with the refund id as request id', async () => {
    resetState({
      payment: { method: 'paypal', paypalCaptureId: 'cap_1', stripePaymentIntentId: null },
    })
    vi.mocked(refundPaypalCapture).mockResolvedValue({ id: 'ppr_1', status: 'succeeded' })
    const r = await refund({ full: true })
    expect(refundPaypalCapture).toHaveBeenCalledWith({
      captureId: 'cap_1',
      amountCents: 10000,
      requestId: r.id,
    })
    expect(state.order.status).toBe('refunded')
  })

  it('resolves and persists the PaymentIntent of legacy Stripe payments', async () => {
    resetState({ payment: { stripePaymentIntentId: null, reference: 'cs_legacy' } })
    vi.mocked(stripePaymentIntentForSession).mockResolvedValue('pi_legacy')
    await refund({ amountCents: 100 })
    expect(stripePaymentIntentForSession).toHaveBeenCalledWith('cs_legacy')
    expect(state.payment.stripePaymentIntentId).toBe('pi_legacy')
    expect(stripeRefund).toHaveBeenCalledWith(
      expect.objectContaining({ paymentIntentId: 'pi_legacy' }),
    )
  })

  it('"Stornieren & erstatten" only for paid orders', async () => {
    state.order.status = 'shipped'
    await expect(refund({ full: true, requireStatus: 'paid' })).rejects.toThrow(/storniert/)
  })

  it('rejects a complaint of another order', async () => {
    state.complaints = [{ id: 'c1', orderId: 'other' }]
    await expect(refund({ amountCents: 100, complaintId: 'c1' })).rejects.toThrow(/Reklamation/)
  })
})
