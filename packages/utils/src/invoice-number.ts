/**
 * Sequential invoice numbers: <PREFIX>-<YEAR>-<SEQ, zero-padded to 5>.
 * Example: RE-2026-00042. The sequence resets each year.
 * Persistence/locking happens in the API (single-row counter, SELECT … FOR UPDATE).
 */
export function formatInvoiceNumber(prefix: string, year: number, sequence: number): string {
  if (sequence < 1 || !Number.isInteger(sequence)) {
    throw new Error(`Invalid invoice sequence: ${sequence}`)
  }
  return `${prefix}-${year}-${String(sequence).padStart(5, '0')}`
}

export function parseInvoiceNumber(
  value: string,
): { prefix: string; year: number; sequence: number } | null {
  const match = /^([A-Z]+)-(\d{4})-(\d{5,})$/.exec(value)
  if (!match) return null
  return { prefix: match[1]!, year: Number(match[2]), sequence: Number(match[3]) }
}

/** Next sequence for a counter that resets on year change. */
export function nextInvoiceSequence(
  counter: { year: number; lastSequence: number } | null,
  currentYear: number,
): { year: number; sequence: number } {
  if (!counter || counter.year !== currentYear) {
    return { year: currentYear, sequence: 1 }
  }
  return { year: currentYear, sequence: counter.lastSequence + 1 }
}
