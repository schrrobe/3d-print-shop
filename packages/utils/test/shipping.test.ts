import { describe, expect, it } from 'vitest'
import {
  calcShippingCents,
  centsUntilFreeShipping,
  isFreeShipping,
  qualifiesForFreeBox,
} from '../src/shipping.js'

describe('shipping', () => {
  it('charges 6,99 € within Germany below 80 €', () => {
    expect(calcShippingCents(1, 'DE')).toBe(699)
    expect(calcShippingCents(7999, 'DE')).toBe(699)
    expect(calcShippingCents(7999, 'de')).toBe(699)
  })

  it('is free within Germany from exactly 80 €', () => {
    expect(calcShippingCents(8000, 'DE')).toBe(0)
    expect(calcShippingCents(999999, 'DE')).toBe(0)
  })

  it('charges 15 € abroad below 100 €, free from exactly 100 €', () => {
    expect(calcShippingCents(1, 'AT')).toBe(1500)
    expect(calcShippingCents(8000, 'AT')).toBe(1500)
    expect(calcShippingCents(9999, 'CH')).toBe(1500)
    expect(calcShippingCents(10000, 'FR')).toBe(0)
  })

  it('costs nothing for an empty cart', () => {
    expect(calcShippingCents(0, 'DE')).toBe(0)
    expect(calcShippingCents(-5, 'AT')).toBe(0)
  })

  it('reports free-shipping state per country', () => {
    expect(isFreeShipping(7999, 'DE')).toBe(false)
    expect(isFreeShipping(8000, 'DE')).toBe(true)
    expect(isFreeShipping(8000, 'NL')).toBe(false)
    expect(isFreeShipping(10000, 'NL')).toBe(true)
  })

  it('computes cents until free shipping per country', () => {
    expect(centsUntilFreeShipping(7000, 'DE')).toBe(1000)
    expect(centsUntilFreeShipping(8000, 'DE')).toBe(0)
    expect(centsUntilFreeShipping(8000, 'PL')).toBe(2000)
    expect(centsUntilFreeShipping(20000, 'PL')).toBe(0)
  })

  it('grants the free 50 box from exactly 100 €', () => {
    expect(qualifiesForFreeBox(9999)).toBe(false)
    expect(qualifiesForFreeBox(10000)).toBe(true)
  })
})
