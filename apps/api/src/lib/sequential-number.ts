import { createHmac } from 'node:crypto'
import { env } from '../env.js'

/**
 * Structural shape of the per-year counter delegates (InvoiceCounter,
 * ComplaintCounter, ShipmentCounter, TicketCounter) — pass e.g.
 * `tx.invoiceCounter` to participate in an outer transaction or
 * `prisma.complaintCounter` for a standalone atomic increment.
 */
export interface SequentialCounterDelegate {
  upsert(args: {
    where: { year: number }
    create: { year: number; lastSequence: number }
    update: { lastSequence: { increment: number } }
  }): Promise<{ year: number; lastSequence: number }>
}

export interface SequentialNumber {
  /** Formatted number, e.g. RE-2026-7Q3K9X. */
  number: string
  year: number
  sequence: number
}

const CROCKFORD = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'
const HALF = 15
const MASK = (1 << HALF) - 1

/**
 * Feistel permutation over 30 bits: bijective, so distinct sequences never map
 * to the same value. Keyed with DOCUMENT_NUMBER_KEY — never change it in a
 * running shop, or new numbers can collide with already issued ones.
 */
export function permute(name: string, n: number, key = env.DOCUMENT_NUMBER_KEY): number {
  let l = (n >>> HALF) & MASK
  let r = n & MASK
  for (let round = 0; round < 4; round++) {
    const f =
      createHmac('sha256', key).update(`${name}:${round}:${r}`).digest().readUInt16BE(0) & MASK
    ;[l, r] = [r, l ^ f]
  }
  return (l << HALF) | r
}

const base32 = (n: number): string =>
  Array.from({ length: 6 }, (_, i) => CROCKFORD[(n >>> (5 * (5 - i))) & 31]).join('')

/**
 * RE-2026-7Q3K9X: the gapless per-year sequence, obfuscated so customers can't
 * read the shop's volume off their documents. Room for 2³⁰ numbers per prefix
 * and year. 6 base32 chars never collide with the old 5-digit numbers.
 */
export function formatSequentialNumber(
  prefix: string,
  year: number,
  sequence: number,
  key = env.DOCUMENT_NUMBER_KEY,
): string {
  const name = `${prefix}-${year}`
  return `${name}-${base32(permute(name, sequence, key))}`
}

/**
 * Next per-year number. The counter row update is atomic (row lock during
 * UPDATE), so concurrent calls cannot produce duplicates.
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
  return {
    number: formatSequentialNumber(prefix, year, row.lastSequence),
    year,
    sequence: row.lastSequence,
  }
}
