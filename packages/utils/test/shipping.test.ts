import { describe, expect, it } from 'vitest'
import {
  calcShippingCents,
  centsUntilFreeShipping,
  isFreeShipping,
  isShippingCountry,
  qualifiesForFreeBox,
  SHIPPING_COUNTRIES,
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

  it('charges DHL zone prices abroad below 200 €, free from 200 €', () => {
    expect(calcShippingCents(1, 'AT')).toBe(1749)
    expect(calcShippingCents(19999, 'SE')).toBe(1749)
    expect(calcShippingCents(9999, 'CH')).toBe(2699)
    expect(calcShippingCents(19999, 'ch')).toBe(2699)
    expect(calcShippingCents(5000, 'IS')).toBe(2999)
    expect(calcShippingCents(20000, 'ch')).toBe(0)
    expect(calcShippingCents(20000, 'IS')).toBe(0)
    expect(calcShippingCents(999999, 'NL')).toBe(0)
  })

  it('falls back to the highest European rate for unlisted countries', () => {
    expect(calcShippingCents(5000, 'NO')).toBe(2999)
  })

  it('ships to all EU countries, Switzerland and Iceland only', () => {
    expect(SHIPPING_COUNTRIES[0]).toBe('DE')
    expect(SHIPPING_COUNTRIES).toHaveLength(29)
    expect(isShippingCountry('is')).toBe(true)
    expect(isShippingCountry('NO')).toBe(false)
    expect(isShippingCountry('toString')).toBe(false)
  })

  it('costs nothing for an empty cart', () => {
    expect(calcShippingCents(0, 'DE')).toBe(0)
    expect(calcShippingCents(-5, 'AT')).toBe(0)
  })

  it('reports free-shipping state per country', () => {
    expect(isFreeShipping(7999, 'DE')).toBe(false)
    expect(isFreeShipping(8000, 'DE')).toBe(true)
    expect(isFreeShipping(8000, 'NL')).toBe(false)
    expect(isFreeShipping(10000, 'NL')).toBe(false)
    expect(isFreeShipping(20000, 'NL')).toBe(true)
  })

  it('computes cents until free shipping per country', () => {
    expect(centsUntilFreeShipping(7000, 'DE')).toBe(1000)
    expect(centsUntilFreeShipping(8000, 'DE')).toBe(0)
    expect(centsUntilFreeShipping(8000, 'PL')).toBe(12000)
    expect(centsUntilFreeShipping(20000, 'PL')).toBe(0)
  })

  it('grants the free 50 box from exactly 100 €', () => {
    expect(qualifiesForFreeBox(9999)).toBe(false)
    expect(qualifiesForFreeBox(10000)).toBe(true)
  })
})
