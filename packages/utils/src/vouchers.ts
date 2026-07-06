import type { CartTotalsWithVoucherDto, VoucherRejection, VoucherType } from '@print-shop/types'
import { calcSubtotalCents, type PricedItem } from './pricing.js'
import { calcShippingCents, isFreeShipping } from './shipping.js'

/** Fields needed to decide whether a voucher is redeemable. */
export interface RedeemableVoucher {
  type: VoucherType
  value: number
  active: boolean
  validFrom: Date | null
  validUntil: Date | null
  maxRedemptions: number | null
  redemptionCount: number
  minOrderCents: number
}

/** Codes are stored and compared uppercase (case-insensitive redemption). */
export function normalizeVoucherCode(code: string): string {
  return code.trim().toUpperCase()
}

export type VoucherCheckResult = { ok: true } | { ok: false; reason: VoucherRejection }

/**
 * Single source of truth for redeemability — used by the public validate
 * endpoint and re-run as a hard check during checkout.
 */
export function checkVoucher(
  voucher: RedeemableVoucher | null,
  subtotalCents: number,
  now: Date = new Date(),
): VoucherCheckResult {
  if (!voucher) return { ok: false, reason: 'not_found' }
  if (!voucher.active) return { ok: false, reason: 'inactive' }
  if (voucher.validFrom && now < voucher.validFrom) return { ok: false, reason: 'not_yet_valid' }
  if (voucher.validUntil && now > voucher.validUntil) return { ok: false, reason: 'expired' }
  if (voucher.maxRedemptions != null && voucher.redemptionCount >= voucher.maxRedemptions) {
    return { ok: false, reason: 'exhausted' }
  }
  if (subtotalCents < voucher.minOrderCents) return { ok: false, reason: 'min_order_not_met' }
  return { ok: true }
}

/**
 * Discount for a subtotal: percent is rounded to full cents, fixed is capped
 * at the subtotal so the total never goes negative.
 */
export function calcVoucherDiscountCents(
  voucher: { type: VoucherType; value: number },
  subtotalCents: number,
): number {
  if (subtotalCents <= 0) return 0
  const raw =
    voucher.type === 'percent' ? Math.round((subtotalCents * voucher.value) / 100) : voucher.value
  return Math.min(Math.max(raw, 0), subtotalCents)
}

/**
 * Cart totals with an optional voucher. Shipping and the free-shipping
 * threshold are based on the pre-discount subtotal; a voucher whose minimum
 * order value is no longer met yields no discount (soft UI behavior — the
 * checkout revalidates hard).
 */
export function calcCartTotalsWithVoucher(
  items: PricedItem[],
  voucher: { type: VoucherType; value: number; minOrderCents?: number } | null,
): CartTotalsWithVoucherDto {
  const subtotalCents = calcSubtotalCents(items)
  const shippingCents = calcShippingCents(subtotalCents)
  const discountCents =
    voucher && subtotalCents >= (voucher.minOrderCents ?? 0)
      ? calcVoucherDiscountCents(voucher, subtotalCents)
      : 0
  return {
    subtotalCents,
    shippingCents,
    discountCents,
    totalCents: subtotalCents - discountCents + shippingCents,
    freeShippingApplied: subtotalCents > 0 && isFreeShipping(subtotalCents),
  }
}
