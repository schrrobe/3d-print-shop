import { CONVERSION_EVENTS, isConversionEventName } from '@print-shop/utils'

/**
 * Reads the GA4-shaped properties the shop sends through `analytics.track()`
 * (`currency`, `value`, `items`, plus our `event_id`) back into what Meta and
 * TikTok want. Null for events the ad platforms don't get.
 */
export function conversionEventData(event: string, properties: Record<string, unknown> = {}) {
  if (!isConversionEventName(event)) return null
  const items = (properties.items as { item_id?: string; quantity?: number }[] | undefined) ?? []
  return {
    ...CONVERSION_EVENTS[event],
    eventId: properties.event_id as string | undefined,
    currency: properties.currency as string | undefined,
    value: properties.value as number | undefined,
    contentIds: items.flatMap((i) => (i.item_id ? [i.item_id] : [])),
    numItems:
      (properties.num_items as number | undefined) ??
      items.reduce((n, i) => n + (i.quantity ?? 1), 0),
  }
}
