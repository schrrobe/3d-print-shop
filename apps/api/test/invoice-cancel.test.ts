import type { Invoice } from '@prisma/client'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../src/lib/prisma.js', () => {
  const prisma = {
    invoiceCounter: { upsert: vi.fn() },
    invoice: { updateMany: vi.fn(), findUniqueOrThrow: vi.fn() },
    $transaction: vi.fn(),
  }
  prisma.$transaction.mockImplementation((fn: (tx: unknown) => unknown) => fn(prisma))
  return { prisma }
})

const { prisma } = await import('../src/lib/prisma.js')
const { cancelInvoice } = await import('../src/services/invoice.js')

const invoice = { id: 'inv1', number: 'RE-2026-AAAAAA', cancellationNumber: null } as Invoice

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(prisma.invoiceCounter.upsert).mockResolvedValue({ year: 2026, lastSequence: 7 })
  vi.mocked(prisma.invoice.findUniqueOrThrow).mockResolvedValue({
    ...invoice,
    cancellationNumber: 'RE-2026-BBBBBB',
  } as never)
})

describe('cancelInvoice', () => {
  it('takes the next number of the invoice range for the Stornorechnung', async () => {
    vi.mocked(prisma.invoice.updateMany).mockResolvedValue({ count: 1 })

    const cancelled = await cancelInvoice(invoice)

    expect(cancelled.cancellationNumber).toBe('RE-2026-BBBBBB')
    expect(vi.mocked(prisma.invoice.updateMany)).toHaveBeenCalledWith({
      where: { id: 'inv1', cancellationNumber: null },
      data: {
        cancellationNumber: expect.stringMatching(/-2026-/),
        cancellationYear: 2026,
        cancellationSequence: 7,
        cancelledAt: expect.any(Date),
      },
    })
  })

  it('aborts its transaction (no gap) and returns the winner when a concurrent call cancelled first', async () => {
    vi.mocked(prisma.invoice.updateMany).mockResolvedValue({ count: 0 })

    await expect(cancelInvoice(invoice)).resolves.toMatchObject({
      cancellationNumber: 'RE-2026-BBBBBB',
    })
    await expect(vi.mocked(prisma.$transaction).mock.results[0]!.value).rejects.toThrow()
  })

  it('does nothing for an invoice that already has its Stornorechnung', async () => {
    const done = { ...invoice, cancellationNumber: 'RE-2026-CCCCCC' }
    await expect(cancelInvoice(done)).resolves.toBe(done)
    expect(vi.mocked(prisma.$transaction)).not.toHaveBeenCalled()
  })
})
