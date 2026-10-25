/**
 * Minimal Meta Pixel plugin for the `analytics` library.
 * Loaded exclusively after marketing consent (enforced by plugins/analytics.client.ts).
 * No advanced matching — never pass PII (email, name, phone, address) to fbq.
 * `eventID` is shared with the server-side Conversions API so Meta dedupes the pair.
 */

import { conversionEventData } from './conversion-data'

type FbqFn = (...args: unknown[]) => void

interface FbqWindow extends Window {
  fbq?: FbqFn & {
    callMethod?: FbqFn
    queue?: unknown[][]
    push?: FbqFn
    loaded?: boolean
    version?: string
  }
  _fbq?: unknown
}

export interface MetaPixelPluginConfig {
  pixelId: string
  /** analytics-core flag: false = plugin registered but initialize() skipped */
  enabled?: boolean
}

const fbq = (...args: unknown[]) => {
  const w = window as FbqWindow
  w.fbq?.(...args)
}

function injectFbqStub(): void {
  const w = window as FbqWindow
  if (w.fbq) return
  const stub = ((...args: unknown[]) => {
    if (stub.callMethod) stub.callMethod(...args)
    else stub.queue!.push(args)
  }) as NonNullable<FbqWindow['fbq']>
  stub.queue = []
  stub.push = stub
  stub.loaded = true
  stub.version = '2.0'
  w.fbq = stub
  w._fbq = stub
  const script = document.createElement('script')
  script.async = true
  script.src = 'https://connect.facebook.net/en_US/fbevents.js'
  script.dataset.tracker = 'meta-pixel'
  document.head.appendChild(script)
}

export default function metaPixelPlugin(config: MetaPixelPluginConfig) {
  return {
    name: 'meta-pixel',
    config,
    initialize: () => {
      injectFbqStub()
      // No automatic click/form-field detection (e.g. the checkout email field).
      fbq('set', 'autoConfig', false, config.pixelId)
      fbq('consent', 'grant')
      fbq('init', config.pixelId)
    },
    page: ({ payload }: { payload: { properties?: Record<string, unknown> } }) => {
      const eventID = payload.properties?.event_id
      fbq('track', 'PageView', {}, eventID ? { eventID } : undefined)
    },
    track: ({ payload }: { payload: { event: string; properties?: Record<string, unknown> } }) => {
      const data = conversionEventData(payload.event, payload.properties)
      if (!data) return
      fbq(
        'track',
        data.meta,
        {
          currency: data.currency,
          value: data.value,
          ...(data.contentIds.length && { content_ids: data.contentIds, content_type: 'product' }),
          num_items: data.numItems || undefined,
        },
        data.eventId ? { eventID: data.eventId } : undefined,
      )
    },
    loaded: () => typeof window !== 'undefined' && Boolean((window as FbqWindow).fbq),
    methods: {
      /** Best-effort stop after consent withdrawal — script stays until reload. */
      revoke() {
        fbq('consent', 'revoke')
      },
      grant() {
        fbq('consent', 'grant')
      },
    },
  }
}
