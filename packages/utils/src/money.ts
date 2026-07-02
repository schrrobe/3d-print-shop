import type { Locale } from '@print-shop/types'

/** All prices are stored as integer cents (EUR). */
export function formatCents(cents: number, locale: Locale = 'de'): string {
  return new Intl.NumberFormat(locale, { style: 'currency', currency: 'EUR' }).format(cents / 100)
}

export function eurosToCents(euros: number): number {
  return Math.round(euros * 100)
}
