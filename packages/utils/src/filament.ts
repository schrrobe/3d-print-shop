/** Filament stock helpers (pure, unit-testable). */

export interface SpoolStockInfo {
  remainingGrams: number | null
  minRemainingGrams: number | null
  reorder: boolean
  active: boolean
}

/** Spool belongs on the shopping list: flagged manually or below its own minimum. */
export function spoolNeedsReorder(spool: SpoolStockInfo): boolean {
  if (!spool.active) return false
  if (spool.reorder) return true
  return spoolBelowMinimum(spool)
}

export function spoolBelowMinimum(spool: SpoolStockInfo): boolean {
  if (!spool.active) return false
  if (spool.minRemainingGrams == null || spool.remainingGrams == null) return false
  return spool.remainingGrams < spool.minRemainingGrams
}

export type ColorStockStatus = 'ok' | 'low' | 'unknown'

/**
 * Aggregated stock status of a color across all its active spools.
 * `low` when the sum of remaining grams is below the color's minimum stock.
 */
export function colorStockStatus(
  minStockGrams: number | null,
  spoolRemainingGrams: Array<number | null>,
): ColorStockStatus {
  if (minStockGrams == null) return 'unknown'
  const known = spoolRemainingGrams.filter((g): g is number => g != null)
  if (known.length === 0) return 'unknown'
  const total = known.reduce((sum, g) => sum + g, 0)
  return total < minStockGrams ? 'low' : 'ok'
}
