/** Flat shipping rate: 6,99 € */
export const SHIPPING_FLAT_CENTS = 699
/** Free shipping from 150 € order subtotal */
export const FREE_SHIPPING_THRESHOLD_CENTS = 15000

/**
 * Shipping cost for a given subtotal (in cents).
 * Empty carts (subtotal <= 0) cost nothing; from 150 € shipping is free.
 */
export function calcShippingCents(subtotalCents: number): number {
  if (subtotalCents <= 0) return 0
  if (subtotalCents >= FREE_SHIPPING_THRESHOLD_CENTS) return 0
  return SHIPPING_FLAT_CENTS
}

export function isFreeShipping(subtotalCents: number): boolean {
  return subtotalCents >= FREE_SHIPPING_THRESHOLD_CENTS
}

/** How many cents are missing until free shipping (0 if already free). */
export function centsUntilFreeShipping(subtotalCents: number): number {
  return Math.max(0, FREE_SHIPPING_THRESHOLD_CENTS - subtotalCents)
}
