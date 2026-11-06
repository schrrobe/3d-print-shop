/** Domestic delivery country; every other country ships at the international rate. */
export const DOMESTIC_COUNTRY = 'DE'

/** Germany: 6,99 €, free from 80 € */
export const DOMESTIC_SHIPPING_CENTS = 699
export const DOMESTIC_FREE_SHIPPING_CENTS = 8000

/** Every other country: 15,00 €, reduced to 10,00 € from 100 €, free from 200 € */
export const INTERNATIONAL_SHIPPING_CENTS = 1500
export const INTERNATIONAL_REDUCED_SHIPPING_CENTS = 1000
export const INTERNATIONAL_REDUCED_SHIPPING_FROM_CENTS = 10000
export const INTERNATIONAL_FREE_SHIPPING_CENTS = 20000

/** From 100 € order subtotal the customer picks one 50-round box for free (any country). */
export const FREE_BOX_THRESHOLD_CENTS = 10000
export const FREE_BOX_CAPACITY = 50

const isDomestic = (country: string) => country.toUpperCase() === DOMESTIC_COUNTRY

/** Order subtotal (in cents) from which shipping to `country` is free. */
export function freeShippingThresholdCents(country: string): number {
  return isDomestic(country) ? DOMESTIC_FREE_SHIPPING_CENTS : INTERNATIONAL_FREE_SHIPPING_CENTS
}

/**
 * Shipping cost for a subtotal (in cents) and delivery country (ISO alpha-2).
 * Empty carts (subtotal <= 0) cost nothing.
 */
export function calcShippingCents(subtotalCents: number, country: string): number {
  if (subtotalCents <= 0) return 0
  if (isFreeShipping(subtotalCents, country)) return 0
  if (isDomestic(country)) return DOMESTIC_SHIPPING_CENTS
  return subtotalCents >= INTERNATIONAL_REDUCED_SHIPPING_FROM_CENTS
    ? INTERNATIONAL_REDUCED_SHIPPING_CENTS
    : INTERNATIONAL_SHIPPING_CENTS
}

export function isFreeShipping(subtotalCents: number, country: string): boolean {
  return subtotalCents >= freeShippingThresholdCents(country)
}

/** How many cents are missing for free shipping (0 if already free). */
export function centsUntilFreeShipping(subtotalCents: number, country: string): number {
  return Math.max(0, freeShippingThresholdCents(country) - subtotalCents)
}

export function qualifiesForFreeBox(subtotalCents: number): boolean {
  return subtotalCents >= FREE_BOX_THRESHOLD_CENTS
}
