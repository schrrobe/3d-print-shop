import { describe, expect, it } from 'vitest'
import { eurosToCents, formatCents } from '../src/money.js'

describe('money', () => {
  it('formats cents as EUR for the locale', () => {
    // Intl uses non-breaking spaces (U+00A0 / U+202F) — normalize before comparing
    expect(formatCents(699, 'de').replace(/[\u00a0\u202f]/g, ' ')).toBe('6,99 €')
    expect(formatCents(15000, 'en')).toBe('€150.00')
  })

  it('converts euros to integer cents without float drift', () => {
    expect(eurosToCents(6.99)).toBe(699)
    expect(eurosToCents(150)).toBe(15000)
    expect(eurosToCents(0.1 + 0.2)).toBe(30)
  })
})
