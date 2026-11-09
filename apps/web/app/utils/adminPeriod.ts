/** [from, to) ISO range in local time for admin report period selects. */
export function adminPeriodRange(period: 'this' | 'last' | 'year' | 'all') {
  const now = new Date()
  if (period === 'all')
    return {
      from: new Date(0).toISOString(),
      to: new Date(now.getTime() + 86_400_000).toISOString(),
    }
  if (period === 'year')
    return {
      from: new Date(now.getFullYear(), 0, 1).toISOString(),
      to: new Date(now.getFullYear() + 1, 0, 1).toISOString(),
    }
  const m = now.getMonth() - (period === 'last' ? 1 : 0)
  return {
    from: new Date(now.getFullYear(), m, 1).toISOString(),
    to: new Date(now.getFullYear(), m + 1, 1).toISOString(),
  }
}
