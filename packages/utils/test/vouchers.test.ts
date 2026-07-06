import { describe, expect, it } from 'vitest'
import {
  calcCartTotalsWithVoucher,
  calcVoucherDiscountCents,
  checkVoucher,
  normalizeVoucherCode,
  type RedeemableVoucher,
} from '../src/vouchers.js'

function voucher(overrides: Partial<RedeemableVoucher> = {}): RedeemableVoucher {
  return {
    type: 'percent',
    value: 10,
    active: true,
    validFrom: null,
    validUntil: null,
    maxRedemptions: null,
    redemptionCount: 0,
    minOrderCents: 0,
    ...overrides,
  }
}

describe('normalizeVoucherCode', () => {
  it('uppercases and trims', () => {
    expect(normalizeVoucherCode('  sommer10 ')).toBe('SOMMER10')
  })
})

describe('checkVoucher', () => {
  const now = new Date('2026-07-04T12:00:00Z')

  it('accepts a valid voucher', () => {
    expect(checkVoucher(voucher(), 5000, now)).toEqual({ ok: true })
  })

  it('rejects a missing voucher', () => {
    expect(checkVoucher(null, 5000, now)).toEqual({ ok: false, reason: 'not_found' })
  })

  it('rejects an inactive voucher', () => {
    expect(checkVoucher(voucher({ active: false }), 5000, now)).toEqual({
      ok: false,
      reason: 'inactive',
    })
  })

  it('rejects before validFrom and after validUntil', () => {
    expect(
      checkVoucher(voucher({ validFrom: new Date('2026-08-01') }), 5000, now),
    ).toEqual({ ok: false, reason: 'not_yet_valid' })
    expect(
      checkVoucher(voucher({ validUntil: new Date('2026-06-01') }), 5000, now),
    ).toEqual({ ok: false, reason: 'expired' })
  })

  it('accepts inside the validity window', () => {
    expect(
      checkVoucher(
        voucher({ validFrom: new Date('2026-07-01'), validUntil: new Date('2026-07-31') }),
        5000,
        now,
      ),
    ).toEqual({ ok: true })
  })

  it('rejects when redemptions are exhausted', () => {
    expect(
      checkVoucher(voucher({ maxRedemptions: 5, redemptionCount: 5 }), 5000, now),
    ).toEqual({ ok: false, reason: 'exhausted' })
    expect(
      checkVoucher(voucher({ maxRedemptions: 5, redemptionCount: 4 }), 5000, now),
    ).toEqual({ ok: true })
  })

  it('rejects below the minimum order value', () => {
    expect(checkVoucher(voucher({ minOrderCents: 5001 }), 5000, now)).toEqual({
      ok: false,
      reason: 'min_order_not_met',
    })
  })
})

describe('calcVoucherDiscountCents', () => {
  it('calculates percent discounts rounded to cents', () => {
    expect(calcVoucherDiscountCents({ type: 'percent', value: 10 }, 4498)).toBe(450)
    expect(calcVoucherDiscountCents({ type: 'percent', value: 100 }, 4498)).toBe(4498)
  })

  it('caps fixed discounts at the subtotal', () => {
    expect(calcVoucherDiscountCents({ type: 'fixed', value: 500 }, 4498)).toBe(500)
    expect(calcVoucherDiscountCents({ type: 'fixed', value: 5000 }, 4498)).toBe(4498)
  })

  it('never discounts an empty cart', () => {
    expect(calcVoucherDiscountCents({ type: 'fixed', value: 500 }, 0)).toBe(0)
  })
})

describe('calcCartTotalsWithVoucher', () => {
  it('matches plain totals without a voucher', () => {
    expect(calcCartTotalsWithVoucher([{ unitPriceCents: 2999, quantity: 1 }], null)).toEqual({
      subtotalCents: 2999,
      shippingCents: 699,
      discountCents: 0,
      totalCents: 3698,
      freeShippingApplied: false,
    })
  })

  it('subtracts the discount from the total', () => {
    const totals = calcCartTotalsWithVoucher(
      [{ unitPriceCents: 2999, quantity: 1 }],
      { type: 'percent', value: 10 },
    )
    expect(totals.discountCents).toBe(300)
    expect(totals.totalCents).toBe(2999 - 300 + 699)
  })

  it('keeps free shipping based on the pre-discount subtotal', () => {
    const totals = calcCartTotalsWithVoucher(
      [{ unitPriceCents: 15000, quantity: 1 }],
      { type: 'fixed', value: 5000 },
    )
    expect(totals.shippingCents).toBe(0)
    expect(totals.freeShippingApplied).toBe(true)
    expect(totals.totalCents).toBe(10000)
  })

  it('drops the discount when the minimum order value is not met', () => {
    const totals = calcCartTotalsWithVoucher(
      [{ unitPriceCents: 2999, quantity: 1 }],
      { type: 'percent', value: 10, minOrderCents: 5000 },
    )
    expect(totals.discountCents).toBe(0)
    expect(totals.totalCents).toBe(3698)
  })

  it('never produces a negative total', () => {
    const totals = calcCartTotalsWithVoucher(
      [{ unitPriceCents: 100, quantity: 1 }],
      { type: 'fixed', value: 99999 },
    )
    expect(totals.discountCents).toBe(100)
    expect(totals.totalCents).toBe(699)
  })
})
