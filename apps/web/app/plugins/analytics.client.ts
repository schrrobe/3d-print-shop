import type { TrackingSettings } from '@print-shop/utils'
import { allowedProviders, configuredProviders, isSensitiveTrackingPath } from '@print-shop/utils'
import type { AnalyticsPlugin } from 'analytics'
import { pageEventId } from '~/utils/tracking/page-event'

/**
 * Consent-gated analytics bootstrap (GDPR).
 *
 * Nothing tracking-related is imported or executed before the user has granted
 * the matching consent category: the `analytics` library and all provider
 * plugins are dynamically imported only once at least one configured provider
 * is covered by consent. Until then this plugin only fetches the (public)
 * tracking IDs and watches the consent store.
 *
 * Google Consent Mode v2 starts every signal as "denied" and is updated per
 * category. Withdrawing a category whose tracker already ran purges the
 * tracker cookies and reloads, since injected third-party scripts cannot be
 * unloaded in place.
 */

/** Cookies set by GA / Meta / TikTok — deleted on consent withdrawal. */
const TRACKER_COOKIE = /^(_ga|_gid|_gcl|_fbp|_fbc|_ttp|_tt_)/

function purgeTrackerCookies(): void {
  const host = location.hostname.split('.')
  const domains = host.map((_, i) => host.slice(i).join('.')).slice(0, -1)
  for (const c of document.cookie.split(';')) {
    const name = c.split('=', 1)[0]!.trim()
    if (!TRACKER_COOKIE.test(name)) continue
    const expire = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`
    document.cookie = expire
    for (const d of domains) document.cookie = `${expire}; domain=.${d}`
  }
}

type Gtag = (...args: unknown[]) => void
const gtagWindow = () => window as unknown as { dataLayer?: unknown[]; gtag?: Gtag }

interface AnalyticsInstance {
  page: (data?: Record<string, unknown>) => Promise<unknown>
  track: (event: string, properties?: Record<string, unknown>) => Promise<unknown>
  plugins: {
    enable: (name: string | string[]) => Promise<unknown>
    disable: (name: string | string[], callback?: () => void) => Promise<unknown>
    [name: string]: unknown
  }
}

export default defineNuxtPlugin(() => {
  const consent = useConsentStore()
  const router = useRouter()

  const settings = ref<TrackingSettings | null>(null)
  let instance: AnalyticsInstance | null = null
  let initializing = false
  let lastTrackedPath: string | null = null
  const enabledState = new Map<string, boolean>()

  // Consent Mode v2 defaults before any Google tag can load. The GA/GTM plugins
  // reuse this gtag/dataLayer instead of defining their own.
  const w = gtagWindow()
  w.dataLayer = w.dataLayer || []
  w.gtag =
    w.gtag ||
    function gtag() {
      // eslint-disable-next-line prefer-rest-params
      w.dataLayer!.push(arguments)
    }
  w.gtag('consent', 'default', {
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
    analytics_storage: 'denied',
    wait_for_update: 500,
  })

  function updateGoogleConsent() {
    const c = consent.consent
    const v = (granted: boolean | undefined) => (granted ? 'granted' : 'denied')
    gtagWindow().gtag?.('consent', 'update', {
      analytics_storage: v(c?.statistics),
      ad_storage: v(c?.marketing),
      ad_user_data: v(c?.marketing),
      ad_personalization: v(c?.marketing),
    })
  }

  $fetch<TrackingSettings>('/api/tracking-settings')
    .then((res) => {
      settings.value = {
        metaPixelId: res.metaPixelId ?? null,
        ga4MeasurementId: res.ga4MeasurementId ?? null,
        gtmContainerId: res.gtmContainerId ?? null,
        tiktokPixelId: res.tiktokPixelId ?? null,
      }
    })
    .catch(() => {
      // Settings unreachable → tracking silently stays off
      settings.value = {
        metaPixelId: null,
        ga4MeasurementId: null,
        gtmContainerId: null,
        tiktokPixelId: null,
      }
    })

  const anyEnabled = () => [...enabledState.values()].some(Boolean)

  function trackPage(fullPath?: string) {
    const path = fullPath ?? router.currentRoute.value.fullPath
    if (!instance || !anyEnabled()) return
    if (isSensitiveTrackingPath(path)) return
    const pathname = path.split(/[?#]/, 1)[0] || '/'
    if (pathname === lastTrackedPath) return
    lastTrackedPath = pathname
    // Same id as the first-party page_view → Meta dedupes pixel vs. CAPI.
    void instance.page({ event_id: pageEventId(pathname) })
  }

  async function syncProviders() {
    if (!consent.hydrated || !settings.value) return
    updateGoogleConsent()
    const s = settings.value
    const configured = configuredProviders(s)
    if (configured.length === 0) return
    const allowed = new Set(allowedProviders(s, consent.consent).map((p) => p.name))

    if (!instance) {
      if (allowed.size === 0 || initializing) return
      initializing = true
      try {
        // First consent grant: only now any tracking code enters the page
        const [
          { default: Analytics },
          { default: googleAnalytics },
          { default: googleTagManager },
          { default: metaPixelPlugin },
          { default: tiktokPixelPlugin },
        ] = await Promise.all([
          import('analytics'),
          import('@analytics/google-analytics'),
          import('@analytics/google-tag-manager'),
          import('~/utils/analytics/meta-pixel-plugin'),
          import('~/utils/analytics/tiktok-pixel-plugin'),
        ])
        // Consent may have changed during the async import window above. A
        // re-entrant syncProviders() triggered by that change bails out on the
        // `initializing` guard, so re-read consent here — otherwise a withdrawal
        // mid-load would be lost and we'd enable providers (and fire the initial
        // pageview) against a stale snapshot.
        const allowedNow = new Set(allowedProviders(s, consent.consent).map((p) => p.name))
        const plugins: AnalyticsPlugin[] = []
        for (const provider of configured) {
          const enabled = allowedNow.has(provider.name)
          enabledState.set(provider.name, enabled)
          if (provider.name === 'google-analytics') {
            plugins.push(
              googleAnalytics({
                measurementIds: [s.ga4MeasurementId as string],
                gtagConfig: { anonymize_ip: true },
                enabled,
              }),
            )
          } else if (provider.name === 'google-tag-manager') {
            plugins.push(googleTagManager({ containerId: s.gtmContainerId as string, enabled }))
          } else if (provider.name === 'meta-pixel') {
            plugins.push(
              metaPixelPlugin({ pixelId: s.metaPixelId as string, enabled }) as AnalyticsPlugin,
            )
          } else {
            plugins.push(
              tiktokPixelPlugin({ pixelId: s.tiktokPixelId as string, enabled }) as AnalyticsPlugin,
            )
          }
        }
        instance = Analytics({ app: 'print-shop', plugins }) as unknown as AnalyticsInstance
        trackPage()
      } finally {
        initializing = false
      }
      return
    }

    // Instance exists. A withdrawn category whose tracker already ran: injected
    // scripts cannot be unloaded, so drop their cookies and start clean.
    if (configured.some((p) => enabledState.get(p.name) && !allowed.has(p.name))) {
      purgeTrackerCookies()
      location.reload()
      return
    }
    const wasAnyEnabled = anyEnabled()
    for (const provider of configured) {
      const shouldEnable = allowed.has(provider.name)
      if ((enabledState.get(provider.name) ?? false) === shouldEnable) continue
      enabledState.set(provider.name, shouldEnable)
      if (shouldEnable) {
        if (provider.name === 'google-analytics') {
          ;(window as unknown as Record<string, unknown>)[`ga-disable-${s.ga4MeasurementId}`] =
            false
        }
        await instance.plugins.enable(provider.name)
        if (provider.name === 'meta-pixel') {
          ;(instance.plugins['meta-pixel'] as { grant?: () => void } | undefined)?.grant?.()
        }
      }
    }
    // Consent granted mid-session with everything previously off → send the pageview
    // that init would have sent. (Providers enabled additionally to an already
    // active one pick up tracking on the next navigation — no duplicate pageviews.)
    if (!wasAnyEnabled && anyEnabled()) {
      lastTrackedPath = null
      trackPage()
    }
  }

  watch([() => consent.hydrated, () => consent.consent, settings], () => void syncProviders(), {
    immediate: true,
  })

  router.afterEach((to) => {
    // Exactly one pageview per navigation (lastTrackedPath dedups init + afterEach)
    trackPage(to.fullPath)
  })

  return {
    provide: {
      shopAnalytics: {
        /** No-op before consent / without configured providers. Never pass PII. */
        track(event: string, properties?: Record<string, unknown>): Promise<unknown> {
          if (!instance || !anyEnabled()) return Promise.resolve()
          return instance.track(event, properties)
        },
        page(): void {
          trackPage()
        },
      },
    },
  }
})
