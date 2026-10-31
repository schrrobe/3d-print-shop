export type SortDirection = 'asc' | 'desc'

const collator = new Intl.Collator('de', { numeric: true, sensitivity: 'base' })

/**
 * Returns a sorted copy of `rows`. Numbers/booleans compare numerically,
 * everything else via a German, digit-aware collator (so ISO dates and
 * "PS-2026-0142" sort naturally). Empty values always go last.
 */
export function sortRows<T>(rows: readonly T[], value: (row: T) => unknown, direction: SortDirection): T[] {
  const sign = direction === 'asc' ? 1 : -1
  return [...rows].sort((a, b) => {
    const x = value(a)
    const y = value(b)
    const xEmpty = x === null || x === undefined || x === ''
    const yEmpty = y === null || y === undefined || y === ''
    if (xEmpty || yEmpty) return Number(xEmpty) - Number(yEmpty)
    if (typeof x === 'number' || typeof x === 'boolean') {
      if (typeof y === 'number' || typeof y === 'boolean') return sign * (Number(x) - Number(y))
    }
    return sign * collator.compare(String(x), String(y))
  })
}
