import { describe, expect, it } from 'vitest'
import { colorStockStatus, spoolBelowMinimum, spoolNeedsReorder } from '../src/filament.js'

const spool = (overrides: Partial<Parameters<typeof spoolNeedsReorder>[0]> = {}) => ({
  remainingGrams: 800,
  minRemainingGrams: 200,
  reorder: false,
  active: true,
  ...overrides,
})

describe('spoolBelowMinimum', () => {
  it('true only when remaining < minimum', () => {
    expect(spoolBelowMinimum(spool({ remainingGrams: 100 }))).toBe(true)
    expect(spoolBelowMinimum(spool({ remainingGrams: 200 }))).toBe(false)
    expect(spoolBelowMinimum(spool({ remainingGrams: 800 }))).toBe(false)
  })

  it('false when minimum or remaining is unknown', () => {
    expect(spoolBelowMinimum(spool({ minRemainingGrams: null }))).toBe(false)
    expect(spoolBelowMinimum(spool({ remainingGrams: null }))).toBe(false)
  })

  it('inactive spools never count', () => {
    expect(spoolBelowMinimum(spool({ remainingGrams: 0, active: false }))).toBe(false)
  })
})

describe('spoolNeedsReorder', () => {
  it('manual reorder flag wins', () => {
    expect(spoolNeedsReorder(spool({ reorder: true }))).toBe(true)
  })

  it('below-minimum spools land on the shopping list', () => {
    expect(spoolNeedsReorder(spool({ remainingGrams: 150 }))).toBe(true)
    expect(spoolNeedsReorder(spool())).toBe(false)
  })

  it('inactive spools are never reordered', () => {
    expect(spoolNeedsReorder(spool({ reorder: true, active: false }))).toBe(false)
  })
})

describe('colorStockStatus', () => {
  it('low when the summed remaining grams fall below the color minimum', () => {
    expect(colorStockStatus(500, [100, 200])).toBe('low')
    expect(colorStockStatus(500, [300, 200])).toBe('ok')
    expect(colorStockStatus(500, [600])).toBe('ok')
  })

  it('unknown without a configured minimum or without any known spool weight', () => {
    expect(colorStockStatus(null, [100, 200])).toBe('unknown')
    expect(colorStockStatus(500, [])).toBe('unknown')
    expect(colorStockStatus(500, [null, null])).toBe('unknown')
  })

  it('ignores null spool weights in the sum', () => {
    expect(colorStockStatus(500, [null, 600])).toBe('ok')
    expect(colorStockStatus(500, [null, 400])).toBe('low')
  })
})
