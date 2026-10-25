import {
  isConversionEventName,
  isSensitiveTrackingPath,
  uuidv7,
  type ClientEventName,
} from '@print-shop/utils'
import { pageEventId } from '~/utils/tracking/page-event'
import { createTracker } from '~/utils/tracking/queue'

type EventProps = Record<string, string | number | boolean | null>

/** First-party props → the GA4 e-commerce shape the pixel plugins read (see conversion-data.ts). */
function pixelProperties(name: ClientEventName, props: EventProps = {}) {
  const n = (key: string) => (typeof props[key] === 'number' ? (props[key] as number) : undefined)
  const quantity = n('quantity') ?? 1
  const cents =
    name === 'view_item'
      ? n('priceCents')
      : name === 'add_to_cart' && n('unitPriceCents') != null
        ? n('unitPriceCents')! * quantity
        : n('subtotalCents')
  const productId = typeof props.productId === 'string' ? props.productId : undefined
  return {
    currency: 'EUR',
    ...(cents != null && { value: cents / 100 }),
    ...(productId && { items: [{ item_id: productId, quantity }] }),
    ...(n('itemCount') != null && { num_items: n('itemCount') }),
  }
}

/**
 * First-party conversion tracker (browser-only). Distinct from
 * analytics.client.ts (third-party pixels): this feeds our own /api/t ingest,
 * which forwards conversion events to Meta CAPI / TikTok Events with marketing
 * consent. Pixel and server share each event id so the platforms dedupe.
 *
 * Strictly consent-gated: dormant until statistics or marketing consent, torn
 * down (ids dropped) on withdrawal. The server stores events only with
 * statistics consent; marketing-only batches are just forwarded. page_view fires once per navigation;
 * sensitive token-bearing paths are never reported.
 */
export default defineNuxtPlugin((nuxtApp) => {
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
    tracker.track('page_view', undefined, pathname, pageEventId(pathname))
  }

  function sync() {
    if (!consent.hydrated) return
    const allowed = consent.consent?.statistics === true || consent.consent?.marketing === true
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
        track: (name: ClientEventName, props?: EventProps) => {
          const eventId = tracker.track(name, props) ?? uuidv7()
          if (isConversionEventName(name)) {
            const analytics = nuxtApp.$shopAnalytics as
              | { track: (event: string, properties: Record<string, unknown>) => Promise<unknown> }
              | undefined
            void analytics?.track(name, { ...pixelProperties(name, props), event_id: eventId })
          }
        },
        /** Flush pending events; checkout uses this to persist the session first. */
        flush: () => tracker.flush(),
        /**
         * Tracking session id for the checkout header — statistics consent only,
         * since it links the order to stored reach/attribution data.
         */
        sessionId: () => (consent.consent?.statistics ? tracker.sessionId() : null),
      },
    },
  }
})
