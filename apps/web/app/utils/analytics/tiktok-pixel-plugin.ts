import { conversionEventData } from './conversion-data'

/**
 * Minimal TikTok Pixel plugin for the `analytics` library.
 * Loaded exclusively after marketing consent (enforced by plugins/analytics.client.ts).
 * No advanced matching — never pass PII to ttq. `event_id` is shared with the
 * server-side Events API so TikTok dedupes browser + server hits.
 */

type TtqFn = (...args: unknown[]) => void
type Ttq = Record<string, TtqFn | unknown> & unknown[]

interface TtqWindow extends Window {
  ttq?: Ttq
  TiktokAnalyticsObject?: string
}

export interface TikTokPixelPluginConfig {
  pixelId: string
  /** analytics-core flag: false = plugin registered but initialize() skipped */
  enabled?: boolean
}

const call = (method: string, ...args: unknown[]) => {
  const fn = (window as TtqWindow).ttq?.[method]
  if (typeof fn === 'function') (fn as TtqFn).apply((window as TtqWindow).ttq, args)
}

/** Official snippet, de-minified: queues calls until events.js replaces the stub. */
function injectTtqStub(pixelId: string): void {
  const w = window as TtqWindow
  if (w.ttq) return
  const methods = [
    'page',
    'track',
    'identify',
    'instances',
    'debug',
    'on',
    'off',
    'once',
    'ready',
    'alias',
    'group',
    'enableCookie',
    'disableCookie',
    'holdConsent',
    'revokeConsent',
    'grantConsent',
  ]
  const ttq = [] as unknown as Ttq & {
    _i: Record<string, unknown>
    _t: Record<string, number>
    _o: Record<string, object>
  }
  for (const m of methods) {
    ttq[m] = (...args: unknown[]) => {
      ttq.push([m, ...args])
    }
  }
  ttq._i = {
    [pixelId]: Object.assign([], { _u: 'https://analytics.tiktok.com/i18n/pixel/events.js' }),
  }
  ttq._t = { [pixelId]: Date.now() }
  ttq._o = { [pixelId]: {} }
  w.TiktokAnalyticsObject = 'ttq'
  w.ttq = ttq
  const script = document.createElement('script')
  script.async = true
  script.src = `https://analytics.tiktok.com/i18n/pixel/events.js?sdkid=${encodeURIComponent(pixelId)}&lib=ttq`
  script.dataset.tracker = 'tiktok-pixel'
  document.head.appendChild(script)
}

export default function tiktokPixelPlugin(config: TikTokPixelPluginConfig) {
  return {
    name: 'tiktok-pixel',
    config,
    initialize: () => {
      injectTtqStub(config.pixelId)
    },
    page: () => {
      call('page')
    },
    track: ({ payload }: { payload: { event: string; properties?: Record<string, unknown> } }) => {
      const data = conversionEventData(payload.event, payload.properties)
      if (!data?.tiktok) return
      call(
        'track',
        data.tiktok,
        {
          currency: data.currency,
          value: data.value,
          ...(data.contentIds.length && {
            content_type: 'product',
            contents: data.contentIds.map((id) => ({ content_id: id, quantity: data.numItems })),
          }),
        },
        { event_id: data.eventId },
      )
    },
    loaded: () => typeof window !== 'undefined' && Boolean((window as TtqWindow).ttq),
  }
}
