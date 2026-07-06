/**
 * Shop event abstraction on top of the consent-gated analytics plugin.
 *
 * Usage (future wiring):
 *   const { track } = useAnalytics()
 *   track(SHOP_EVENTS.addToCart, { sku: 'ammo-box-v2', value: 29.9, currency: 'EUR' })
 *
 * Never pass PII (email, name, phone, address) as properties — only technical
 * data like SKU, value, currency, quantity.
 */
export const SHOP_EVENTS = {
  productViewed: 'Product Viewed',
  addToCart: 'Add To Cart',
  beginCheckout: 'Begin Checkout',
  purchase: 'Purchase',
} as const

export type ShopEventName = (typeof SHOP_EVENTS)[keyof typeof SHOP_EVENTS]

export function useAnalytics() {
  const { $shopAnalytics } = useNuxtApp()
  return {
    /** No-op before consent or when no tracking ID is configured. */
    track: (event: ShopEventName, properties?: Record<string, string | number | boolean>) =>
      $shopAnalytics?.track(event, properties) ?? Promise.resolve(),
  }
}
