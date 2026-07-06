import type { TrackingSettings } from '@print-shop/utils'
import { allowedProviders, configuredProviders } from '@print-shop/utils'
import type { AnalyticsPlugin } from 'analytics'

/**
 * Consent-gated analytics bootstrap (GDPR).
 *
 * Nothing tracking-related is imported or executed before the user has granted
 * the matching consent category: the `analytics` library and all provider
 * plugins are dynamically imported only once at least one configured provider
 * is covered by consent. Until then this plugin only fetches the (public)
 * tracking IDs and watches the consent store.
 *
 * Withdrawal is best-effort: plugins are disabled (no further events), GA gets
 * its `ga-disable-<id>` kill switch and the pixel `fbq('consent','revoke')` —
 * but already injected third-party scripts persist until the next full reload.
 */

interface AnalyticsInstance {
  page: () => Promise<unknown>
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

  $fetch<TrackingSettings>('/api/tracking-settings')
    .then((res) => {
      settings.value = {
        metaPixelId: res.metaPixelId ?? null,
        ga4MeasurementId: res.ga4MeasurementId ?? null,
        gtmContainerId: res.gtmContainerId ?? null,
      }
    })
    .catch(() => {
      // Settings unreachable → tracking silently stays off
      settings.value = { metaPixelId: null, ga4MeasurementId: null, gtmContainerId: null }
    })

  const anyEnabled = () => [...enabledState.values()].some(Boolean)

  function trackPage(fullPath?: string) {
    const path = fullPath ?? router.currentRoute.value.fullPath
    if (!instance || !anyEnabled()) return
    if (path.startsWith('/admin')) return
    if (path === lastTrackedPath) return
    lastTrackedPath = path
    void instance.page()
  }

  async function syncProviders() {
    if (!consent.hydrated || !settings.value) return
    const s = settings.value
    const configured = configuredProviders(s)
    if (configured.length === 0) return
    const allowed = new Set(allowedProviders(s, consent.consent).map((p) => p.name))

    if (!instance) {
      if (allowed.size === 0 || initializing) return
      initializing = true
      try {
        // First consent grant: only now any tracking code enters the page
        const [{ default: Analytics }, { default: googleAnalytics }, { default: googleTagManager }, { default: metaPixelPlugin }] =
          await Promise.all([
            import('analytics'),
            import('@analytics/google-analytics'),
            import('@analytics/google-tag-manager'),
            import('~/utils/analytics/meta-pixel-plugin'),
          ])
        const plugins: AnalyticsPlugin[] = []
        for (const provider of configured) {
          const enabled = allowed.has(provider.name)
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
          } else {
            plugins.push(metaPixelPlugin({ pixelId: s.metaPixelId as string, enabled }) as AnalyticsPlugin)
          }
        }
        instance = Analytics({ app: 'print-shop', plugins }) as unknown as AnalyticsInstance
        trackPage()
      } finally {
        initializing = false
      }
      return
    }

    // Instance exists: diff consent per provider → enable/disable
    const wasAnyEnabled = anyEnabled()
    for (const provider of configured) {
      const shouldEnable = allowed.has(provider.name)
      if ((enabledState.get(provider.name) ?? false) === shouldEnable) continue
      enabledState.set(provider.name, shouldEnable)
      if (shouldEnable) {
        if (provider.name === 'google-analytics') {
          ;(window as unknown as Record<string, unknown>)[`ga-disable-${s.ga4MeasurementId}`] = false
        }
        await instance.plugins.enable(provider.name)
        if (provider.name === 'meta-pixel') {
          ;(instance.plugins['meta-pixel'] as { grant?: () => void } | undefined)?.grant?.()
        }
      } else {
        if (provider.name === 'google-analytics') {
          ;(window as unknown as Record<string, unknown>)[`ga-disable-${s.ga4MeasurementId}`] = true
        }
        if (provider.name === 'meta-pixel') {
          ;(instance.plugins['meta-pixel'] as { revoke?: () => void } | undefined)?.revoke?.()
        }
        await instance.plugins.disable(provider.name, () => {})
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
