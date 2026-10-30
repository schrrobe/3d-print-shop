import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('node:fs/promises', () => ({ readFile: vi.fn().mockResolvedValue(Buffer.from('pdf')) }))
vi.mock('../src/lib/prisma.js', () => {
  const tx = {
    order: { updateMany: vi.fn() },
    payment: { update: vi.fn() },
    printerJob: { createMany: vi.fn() },
    invoice: { updateMany: vi.fn() },
  }
  return {
    prisma: {
      tx,
      order: { findUniqueOrThrow: vi.fn() },
      invoice: { update: vi.fn() },
      $transaction: vi.fn((fn: (t: unknown) => unknown) => fn(tx)),
    },
  }
})
vi.mock('../src/services/email.js', () => ({ sendEmail: vi.fn() }))
vi.mock('../src/services/invoice.js', () => ({
  createInvoiceForOrder: vi.fn(),
  generateInvoicePdf: vi.fn().mockResolvedValue('/invoices/R-1.pdf'),
}))
vi.mock('../src/services/company.js', () => ({ company: () => ({ invoiceBcc: '' }) }))
vi.mock('../src/services/tracking/attribution.js', () => ({
  computeAndPersistAttribution: vi.fn(),
}))
vi.mock('../src/services/tracking/outbox.js', () => ({ recordPurchaseWithOutbox: vi.fn() }))

const { prisma } = await import('../src/lib/prisma.js')
const { sendEmail } = await import('../src/services/email.js')
const { generateInvoicePdf } = await import('../src/services/invoice.js')
const { markOrderPaid } = await import('../src/services/order-flow.js')

const db = prisma as unknown as {
  tx: {
    order: { updateMany: ReturnType<typeof vi.fn> }
    invoice: { updateMany: ReturnType<typeof vi.fn> }
  }
  order: { findUniqueOrThrow: ReturnType<typeof vi.fn> }
  invoice: { update: ReturnType<typeof vi.fn> }
}

function order(status: string, invoice: Record<string, unknown>) {
  return {
    id: 'o1',
    orderNumber: 'B-1',
    accessToken: 't',
    email: 'kunde@example.com',
    firstName: 'K',
    totalCents: 1000,
    locale: 'de',
    status,
    items: [{ id: 'i1', name: 'Box', quantity: 1, unitPriceCents: 1000 }],
    payments: [{ id: 'p1', status: 'pending', createdAt: new Date() }],
    invoice: { id: 'inv1', number: 'R-1', totalCents: 1000, ...invoice },
  }
}

beforeEach(() => vi.clearAllMocks())

describe('markOrderPaid invoice handling', () => {
  it('re-renders a pre-issued Vorkasse PDF as paid without re-mailing it', async () => {
    db.tx.order.updateMany.mockResolvedValue({ count: 1 })
    db.order.findUniqueOrThrow
      .mockResolvedValueOnce(
        order('awaiting_bank_transfer', { pdfPath: '/old.pdf', sentAt: new Date() }),
      )
      // Claim cleared pdfPath.
      .mockResolvedValueOnce(order('paid', { pdfPath: null, sentAt: new Date() }))
    vi.mocked(sendEmail).mockResolvedValue(true)

    await markOrderPaid('o1', 'p1')

    expect(db.tx.invoice.updateMany).toHaveBeenCalledWith({
      where: { orderId: 'o1' },
      data: { pdfPath: null },
    })
    expect(generateInvoicePdf).toHaveBeenCalledOnce()
    expect(vi.mocked(sendEmail).mock.calls.map((c) => c[1])).toEqual(['payment_received'])
  })

  it('retries an undelivered invoice email on a non-claiming retry and marks it sent', async () => {
    db.tx.order.updateMany.mockResolvedValue({ count: 1 })
    db.order.findUniqueOrThrow.mockResolvedValue(order('paid', { pdfPath: '/p.pdf', sentAt: null }))
    vi.mocked(sendEmail).mockResolvedValue(true)

    await markOrderPaid('o1', 'p1')

    expect(generateInvoicePdf).not.toHaveBeenCalled()
    expect(vi.mocked(sendEmail).mock.calls.map((c) => c[1])).toEqual(['invoice'])
    expect(db.invoice.update).toHaveBeenCalledWith({
      where: { id: 'inv1' },
      data: { sentAt: expect.any(Date) },
    })
  })

  it('leaves sentAt unset when delivery fails', async () => {
    db.tx.order.updateMany.mockResolvedValue({ count: 1 })
    db.order.findUniqueOrThrow.mockResolvedValue(order('paid', { pdfPath: '/p.pdf', sentAt: null }))
    vi.mocked(sendEmail).mockResolvedValue(false)

    await markOrderPaid('o1', 'p1')

    expect(db.invoice.update).not.toHaveBeenCalled()
  })
})
