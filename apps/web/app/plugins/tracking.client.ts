import { isSensitiveTrackingPath, type ClientEventName } from '@print-shop/utils'
import { createTracker } from '~/utils/tracking/queue'

/**
 * First-party conversion tracker (browser-only). Distinct from
 * analytics.client.ts (third-party pixels): this feeds our own /api/t ingest.
 *
 * Strictly consent-gated: the tracker stays fully dormant until the user grants
 * statistics consent, and is torn down (ids dropped) on withdrawal. page_view
 * fires once per navigation; sensitive token-bearing paths are never reported.
 */
export default defineNuxtPlugin(() => {
  const consent = useConsentStore()
  const router = useRouter()
  const tracker = createTracker()
  let active = false
  let lastPath: string | null = null

  function pageView(fullPath?: string) {
    if (!active) return
    const path = fullPath ?? router.currentRoute.value.fullPath
    if (isSensitiveTrackingPath(path)) return
    const pathname = path.split(/[?#]/, 1)[0] || '/'
    if (pathname === lastPath) return
    lastPath = pathname
    tracker.track('page_view', undefined, pathname)
  }

  function sync() {
    if (!consent.hydrated) return
    const allowed = consent.consent?.statistics === true
    if (allowed && !active) {
      active = true
      tracker.enable()
      lastPath = null
      pageView()
    } else if (!allowed) {
      active = false
      tracker.disable()
    }
  }

  // Hydrate in plugin setup, before page/component onMounted hooks emit
  // view_item or begin_checkout for a returning consented visitor.
  consent.hydrate()
  watch([() => consent.hydrated, () => consent.consent], () => sync(), { immediate: true })
  router.afterEach((to) => pageView(to.fullPath))

  return {
    provide: {
      shopTracking: {
        /** Record a behavioural event (no-op before consent). Never pass PII. */
        track: (name: ClientEventName, props?: Record<string, string | number | boolean | null>) =>
          tracker.track(name, props),
        /** Flush pending events; checkout uses this to persist the session first. */
        flush: () => tracker.flush(),
        /** Current tracking session id (null before consent) — for the checkout header. */
        sessionId: () => tracker.sessionId(),
      },
    },
  }
})
