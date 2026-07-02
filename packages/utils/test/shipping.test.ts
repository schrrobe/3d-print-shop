import { describe, expect, it } from 'vitest'
import {
  calcShippingCents,
  centsUntilFreeShipping,
  FREE_SHIPPING_THRESHOLD_CENTS,
  isFreeShipping,
  SHIPPING_FLAT_CENTS,
} from '../src/shipping.js'

describe('shipping', () => {
  it('charges the 6,99 € flat rate below 150 €', () => {
    expect(calcShippingCents(1)).toBe(SHIPPING_FLAT_CENTS)
    expect(calcShippingCents(9999)).toBe(699)
    expect(calcShippingCents(14999)).toBe(699)
  })

  it('is free from exactly 150 €', () => {
    expect(calcShippingCents(FREE_SHIPPING_THRESHOLD_CENTS)).toBe(0)
    expect(calcShippingCents(15000)).toBe(0)
    expect(calcShippingCents(999999)).toBe(0)
  })

  it('costs nothing for an empty cart', () => {
    expect(calcShippingCents(0)).toBe(0)
    expect(calcShippingCents(-5)).toBe(0)
  })

  it('reports free-shipping state', () => {
    expect(isFreeShipping(14999)).toBe(false)
    expect(isFreeShipping(15000)).toBe(true)
  })

  it('computes cents until free shipping', () => {
    expect(centsUntilFreeShipping(14000)).toBe(1000)
    expect(centsUntilFreeShipping(15000)).toBe(0)
    expect(centsUntilFreeShipping(20000)).toBe(0)
  })
})
