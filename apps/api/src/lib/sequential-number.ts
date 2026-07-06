import { formatInvoiceNumber } from '@print-shop/utils'

/**
 * Structural shape of the per-year counter delegates (InvoiceCounter,
 * ComplaintCounter, ShipmentCounter) — pass e.g. `tx.invoiceCounter` to
 * participate in an outer transaction or `prisma.complaintCounter` for a
 * standalone atomic increment.
 */
export interface SequentialCounterDelegate {
  upsert(args: {
    where: { year: number }
    create: { year: number; lastSequence: number }
    update: { lastSequence: { increment: number } }
  }): Promise<{ year: number; lastSequence: number }>
}

export interface SequentialNumber {
  /** Formatted number, e.g. RE-2026-00012. */
  number: string
  year: number
  sequence: number
}

/**
 * Next sequential per-year number. The counter row update is atomic (row
 * lock during UPDATE), so concurrent calls cannot produce duplicates.
 */
export async function nextSequentialNumber(
  counter: SequentialCounterDelegate,
  prefix: string,
): Promise<SequentialNumber> {
  const year = new Date().getFullYear()
  const row = await counter.upsert({
    where: { year },
    create: { year, lastSequence: 1 },
    update: { lastSequence: { increment: 1 } },
  })
  return { number: formatInvoiceNumber(prefix, year, row.lastSequence), year, sequence: row.lastSequence }
}
