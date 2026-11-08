/** Domestic delivery country. */
export const DOMESTIC_COUNTRY = 'DE'

/** Germany: 6,99 €, free from 80 € */
export const DOMESTIC_SHIPPING_CENTS = 699
export const DOMESTIC_FREE_SHIPPING_CENTS = 8000

/**
 * Abroad: DHL Paket International up to 5 kg, online price (DHL list 07/2025).
 * Free from 200 € in every country.
 */
export const EU_SHIPPING_CENTS = 1749 // DHL zone 1
export const SWITZERLAND_SHIPPING_CENTS = 2699 // DHL zone 2
export const REST_OF_EUROPE_SHIPPING_CENTS = 2999 // DHL zone 3 (Iceland, Norway, …)
export const INTERNATIONAL_FREE_SHIPPING_CENTS = 20000

const EU_COUNTRIES = [
  'AT',
  'BE',
  'BG',
  'HR',
  'CY',
  'CZ',
  'DK',
  'EE',
  'FI',
  'FR',
  'GR',
  'HU',
  'IE',
  'IT',
  'LV',
  'LT',
  'LU',
  'MT',
  'NL',
  'PL',
  'PT',
  'RO',
  'SK',
  'SI',
  'ES',
  'SE',
] as const

/** Shipping cost (below the free threshold) per delivery country we ship to. */
const SHIPPING_CENTS_BY_COUNTRY: Record<string, number> = {
  DE: DOMESTIC_SHIPPING_CENTS,
  ...Object.fromEntries(EU_COUNTRIES.map((c) => [c, EU_SHIPPING_CENTS])),
  CH: SWITZERLAND_SHIPPING_CENTS,
  IS: REST_OF_EUROPE_SHIPPING_CENTS,
}

/** Delivery countries offered in checkout (ISO alpha-2), Germany first. */
export const SHIPPING_COUNTRIES = Object.keys(SHIPPING_CENTS_BY_COUNTRY)

export const isShippingCountry = (country: string) =>
  Object.hasOwn(SHIPPING_CENTS_BY_COUNTRY, country.toUpperCase())

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
 * Empty carts (subtotal <= 0) cost nothing. Countries outside the checkout
 * list (admin orders only) fall back to the highest European rate.
 */
export function calcShippingCents(subtotalCents: number, country: string): number {
  if (subtotalCents <= 0) return 0
  if (isFreeShipping(subtotalCents, country)) return 0
  return SHIPPING_CENTS_BY_COUNTRY[country.toUpperCase()] ?? REST_OF_EUROPE_SHIPPING_CENTS
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
