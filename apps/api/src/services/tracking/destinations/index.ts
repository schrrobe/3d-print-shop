import { env } from '../../../env.js'
import { MetaCapiSender } from './meta-capi.js'
import { MockTrackingSender } from './mock.js'
import type { TrackingDestination, TrackingEventSender } from './sender.js'
import { TRACKING_DESTINATIONS } from './sender.js'
import { TikTokEventsSender } from './tiktok-events.js'

export * from './sender.js'
export { MOCK_OUTBOX_FAILURE_MARKER, MockTrackingSender } from './mock.js'
export { mapMetaCapiError, MetaCapiSender, toMetaEventsBody } from './meta-capi.js'
export { mapTikTokError, TikTokEventsSender, toTikTokBody } from './tiktok-events.js'

/**
 * Destinations eligible for enqueue (credentials present, or mock provider).
 * This is an enqueue-time gate on purpose: enabling a destination later does
 * not send retroactively — only orders placed afterwards fan out.
 */
export function enabledDestinations(): TrackingDestination[] {
  if (env.TRACKING_DESTINATIONS_PROVIDER === 'mock') return [...TRACKING_DESTINATIONS]
  const destinations: TrackingDestination[] = []
  if (env.META_CAPI_ACCESS_TOKEN && env.META_CAPI_PIXEL_ID) destinations.push('meta_capi')
  if (env.TIKTOK_EVENTS_ACCESS_TOKEN && env.TIKTOK_PIXEL_CODE) destinations.push('tiktok_events')
  return destinations
}

export function createTrackingSenders(): Partial<Record<TrackingDestination, TrackingEventSender>> {
  if (env.TRACKING_DESTINATIONS_PROVIDER === 'mock') {
    return {
      meta_capi: new MockTrackingSender('meta_capi'),
      tiktok_events: new MockTrackingSender('tiktok_events'),
    }
  }
  const senders: Partial<Record<TrackingDestination, TrackingEventSender>> = {}
  if (env.META_CAPI_ACCESS_TOKEN && env.META_CAPI_PIXEL_ID) senders.meta_capi = new MetaCapiSender()
  if (env.TIKTOK_EVENTS_ACCESS_TOKEN && env.TIKTOK_PIXEL_CODE) {
    senders.tiktok_events = new TikTokEventsSender()
  }
  return senders
}

export const trackingSenders = createTrackingSenders()
