import { describe, expect, it } from 'vitest'
import { calcCartTotals, calcSubtotalCents } from '../src/pricing.js'

describe('pricing', () => {
  it('sums line items', () => {
    expect(
      calcSubtotalCents([
        { unitPriceCents: 1999, quantity: 2 },
        { unitPriceCents: 500, quantity: 1 },
      ]),
    ).toBe(4498)
  })

  it('rejects invalid quantities and prices', () => {
    expect(() => calcSubtotalCents([{ unitPriceCents: 100, quantity: 0 }])).toThrow()
    expect(() => calcSubtotalCents([{ unitPriceCents: 100, quantity: 1.5 }])).toThrow()
    expect(() => calcSubtotalCents([{ unitPriceCents: -1, quantity: 1 }])).toThrow()
    expect(() => calcSubtotalCents([{ unitPriceCents: 10.5, quantity: 1 }])).toThrow()
  })

  it('adds shipping below the free threshold', () => {
    const totals = calcCartTotals([{ unitPriceCents: 2999, quantity: 1 }])
    expect(totals).toEqual({
      subtotalCents: 2999,
      shippingCents: 699,
      totalCents: 3698,
      freeShippingApplied: false,
    })
  })

  it('applies free shipping at 150 €', () => {
    const totals = calcCartTotals([{ unitPriceCents: 15000, quantity: 1 }])
    expect(totals.shippingCents).toBe(0)
    expect(totals.totalCents).toBe(15000)
    expect(totals.freeShippingApplied).toBe(true)
  })

  it('handles an empty cart', () => {
    const totals = calcCartTotals([])
    expect(totals).toEqual({
      subtotalCents: 0,
      shippingCents: 0,
      totalCents: 0,
      freeShippingApplied: false,
    })
  })
})
