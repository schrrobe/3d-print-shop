import { CONSENT_STORAGE_KEY, uuidv7, type ClientEventName } from '@print-shop/utils'

/**
 * First-party tracking transport. Browser-only. Batches behavioural events and
 * ships them to POST /api/t/events with retry survivability:
 *  - normal flush: fetch(keepalive)
 *  - tab close: navigator.sendBeacon (text/plain, no preflight)
 *  - failures: bounded complete batches in localStorage, preserving attribution
 *
 * All event ids are UUIDv7 so a re-send is a server-side no-op (dedup by PK).
 * Nothing here runs until the plugin calls `enable()` after statistics consent.
 */

const ENDPOINT = '/api/t/events'
const SID_KEY = 'ps_sid' // sessionStorage — one consented browser session
const SID_META_SENT_KEY = 'ps_sid_meta_sent'
const VID_KEY = 'ps_vid' // localStorage — returning visitor
const RETRY_KEY = 'ps_track_q'
const VISITOR_TTL_MS = 365 * 24 * 60 * 60_000
const FLUSH_INTERVAL_MS = 5000
const FLUSH_AT = 10
const RETRY_CAP = 50

interface QueuedEvent {
  eventId: string
  name: ClientEventName
  occurredAt: string
  path?: string
  props?: Record<string, string | number | boolean | null>
}

interface SessionMeta {
  landingPath: string
  referrer: string | null
  utm: {
    source: string | null
    medium: string | null
    campaign: string | null
    term: string | null
    content: string | null
  }
  clickIds: { fbclid: string | null; ttclid: string | null; gclid: string | null }
}

interface TrackingBatch {
  v: 1
  sessionId: string
  visitorId: string | null
  consent: { statistics: boolean; marketing: boolean }
  events: QueuedEvent[]
  session?: SessionMeta
}

function localGet(key: string): string | null {
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

function localSet(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value)
  } catch {
    /* storage full / blocked */
  }
}

function localRemove(key: string): void {
  try {
    window.localStorage.removeItem(key)
  } catch {
    /* storage blocked */
  }
}

function sessionGet(key: string): string | null {
  try {
    return window.sessionStorage.getItem(key)
  } catch {
    return null
  }
}

function sessionSet(key: string, value: string): void {
  try {
    window.sessionStorage.setItem(key, value)
  } catch {
    /* storage full / blocked */
  }
}

function sessionRemove(key: string): void {
  try {
    window.sessionStorage.removeItem(key)
  } catch {
    /* storage blocked */
  }
}

function readVisitorId(): string | null {
  try {
    const raw = localGet(VID_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as { id?: string; createdAt?: number }
    if (!parsed.id || !parsed.createdAt) return null
    if (Date.now() - parsed.createdAt > VISITOR_TTL_MS) {
      localRemove(VID_KEY)
      return null
    }
    return parsed.id
  } catch {
    return null
  }
}

function ensureVisitorId(): string {
  const existing = readVisitorId()
  if (existing) return existing
  const id = uuidv7()
  localSet(VID_KEY, JSON.stringify({ id, createdAt: Date.now() }))
  return id
}

function ensureSessionId(): string {
  const existing = sessionGet(SID_KEY)
  if (existing) return existing
  const id = uuidv7()
  sessionSet(SID_KEY, id)
  sessionRemove(SID_META_SENT_KEY)
  return id
}

function captureSessionMeta(): SessionMeta {
  const url = new URL(window.location.href)
  const q = (key: string, max: number) => url.searchParams.get(key)?.slice(0, max) || null
  let referrer: string | null = null
  try {
    // Host/origin is sufficient for channel classification. Never queue a
    // referrer path or query because it may contain an order access token.
    referrer = document.referrer ? new URL(document.referrer).origin : null
  } catch {
    referrer = null
  }
  return {
    // Attribution parameters have dedicated fields below; the stored landing
    // path therefore never needs a potentially sensitive query string.
    landingPath: url.pathname.slice(0, 512) || '/',
    referrer,
    utm: {
      source: q('utm_source', 128),
      medium: q('utm_medium', 128),
      campaign: q('utm_campaign', 200),
      term: q('utm_term', 200),
      content: q('utm_content', 200),
    },
    clickIds: { fbclid: q('fbclid', 512), ttclid: q('ttclid', 512), gclid: q('gclid', 512) },
  }
}

function isTrackingBatch(value: unknown): value is TrackingBatch {
  if (!value || typeof value !== 'object') return false
  const batch = value as Partial<TrackingBatch>
  return batch.v === 1 && typeof batch.sessionId === 'string' && Array.isArray(batch.events)
}

function loadRetryBatches(): TrackingBatch[] {
  try {
    const raw = localGet(RETRY_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter(isTrackingBatch) : []
  } catch {
    return []
  }
}

function saveRetryBatches(batches: TrackingBatch[]): void {
  const kept: TrackingBatch[] = []
  let remaining = RETRY_CAP
  for (let i = batches.length - 1; i >= 0 && remaining > 0; i -= 1) {
    const batch = batches[i]
    if (!batch || batch.events.length === 0) continue
    const events = batch.events.slice(-remaining)
    kept.unshift({ ...batch, events })
    remaining -= events.length
  }
  if (kept.length === 0) localRemove(RETRY_KEY)
  else localSet(RETRY_KEY, JSON.stringify(kept))
}

export interface Tracker {
  track: (name: ClientEventName, props?: QueuedEvent['props'], path?: string) => void
  flush: () => Promise<void>
  sessionId: () => string | null
  visitorId: () => string | null
  enable: () => void
  disable: () => void
}

export function createTracker(): Tracker {
  let enabled = false
  let sid: string | null = null
  let vid: string | null = null
  let buffer: QueuedEvent[] = []
  let timer: ReturnType<typeof setInterval> | null = null
  let generation = 0
  let metaSentInMemory = false
  const inFlight = new Set<Promise<void>>()

  function consentSnapshot(): TrackingBatch['consent'] {
    try {
      const raw = localGet(CONSENT_STORAGE_KEY)
      const consent = raw
        ? (JSON.parse(raw) as { statistics?: boolean; marketing?: boolean })
        : null
      return {
        statistics: consent?.statistics === true,
        marketing: consent?.marketing === true,
      }
    } catch {
      return { statistics: false, marketing: false }
    }
  }

  function sessionMetaSent(): boolean {
    return metaSentInMemory || sessionGet(SID_META_SENT_KEY) === '1'
  }

  function markSessionMetaSent(batch: TrackingBatch): void {
    if (!batch.session || batch.sessionId !== sid) return
    metaSentInMemory = true
    sessionSet(SID_META_SENT_KEY, '1')
  }

  function buildBatch(events: QueuedEvent[]): TrackingBatch {
    if (!sid) throw new Error('Tracking session is not enabled')
    return {
      v: 1,
      sessionId: sid,
      visitorId: vid,
      consent: consentSnapshot(),
      events,
      ...(!sessionMetaSent() ? { session: captureSessionMeta() } : {}),
    }
  }

  function persistFailedBatch(batch: TrackingBatch, sendGeneration: number): void {
    // A withdrawal invalidates every outstanding request. A late network error
    // must not recreate the retry queue after disable() removed it.
    if (!enabled || generation !== sendGeneration) return
    saveRetryBatches([...loadRetryBatches(), batch])
  }

  async function send(
    batch: TrackingBatch,
    useBeacon: boolean,
    sendGeneration: number,
  ): Promise<void> {
    const payload = JSON.stringify(batch)
    if (useBeacon && navigator.sendBeacon) {
      let queued = false
      try {
        queued = navigator.sendBeacon(ENDPOINT, new Blob([payload], { type: 'text/plain' }))
      } catch {
        queued = false
      }
      if (queued) markSessionMetaSent(batch)
      else persistFailedBatch(batch, sendGeneration)
      return
    }

    try {
      const response = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: payload,
        keepalive: true,
      })
      if (!response.ok) {
        // Validation failures are permanent; retry only throttling/server errors.
        if (response.status === 429 || response.status >= 500) {
          persistFailedBatch(batch, sendGeneration)
        } else {
          console.warn(`[tracking] dropping rejected batch (${response.status})`)
        }
        return
      }
      if (generation === sendGeneration) markSessionMetaSent(batch)
    } catch {
      persistFailedBatch(batch, sendGeneration)
    }
  }

  async function flush(useBeacon = false): Promise<void> {
    if (!enabled) return

    // A checkout calling flush() must also wait for a timer flush that already
    // drained the buffer, otherwise its session can still race the order POST.
    const alreadyRunning = [...inFlight]
    const retries = loadRetryBatches()
    localRemove(RETRY_KEY)
    const pending = buffer
    buffer = []
    const batches = [...retries]
    for (let i = 0; i < pending.length; i += 20) {
      batches.push(buildBatch(pending.slice(i, i + 20)))
    }

    const sendGeneration = generation
    const launched = batches.map((batch) => {
      const operation = send(batch, useBeacon, sendGeneration)
      inFlight.add(operation)
      void operation.finally(() => inFlight.delete(operation))
      return operation
    })
    await Promise.all([...alreadyRunning, ...launched])
  }

  function track(name: ClientEventName, props?: QueuedEvent['props'], path?: string): void {
    if (!enabled) return
    buffer.push({
      eventId: uuidv7(),
      name,
      occurredAt: new Date().toISOString(),
      path: path ?? window.location.pathname,
      props,
    })
    if (buffer.length >= FLUSH_AT) void flush()
  }

  function enable(): void {
    if (enabled) return
    generation += 1
    enabled = true
    sid = ensureSessionId()
    vid = ensureVisitorId()
    metaSentInMemory = false
    timer = setInterval(() => void flush(), FLUSH_INTERVAL_MS)
    window.addEventListener('online', onOnline)
    window.addEventListener('pagehide', onPageHide)
    document.addEventListener('visibilitychange', onVisibility)
    // Drain anything left from a previous load.
    void flush()
  }

  function disable(): void {
    generation += 1
    enabled = false
    buffer = []
    if (timer) clearInterval(timer)
    timer = null
    window.removeEventListener('online', onOnline)
    window.removeEventListener('pagehide', onPageHide)
    document.removeEventListener('visibilitychange', onVisibility)
    // Consent absent/withdrawn: drop all pseudonymous ids and queued events.
    localRemove(VID_KEY)
    localRemove(RETRY_KEY)
    sessionRemove(SID_KEY)
    sessionRemove(SID_META_SENT_KEY)
    metaSentInMemory = false
    sid = null
    vid = null
  }

  function onOnline() {
    void flush()
  }
  function onPageHide() {
    void flush(true)
  }
  function onVisibility() {
    if (document.visibilityState === 'hidden') void flush(true)
  }

  return {
    track,
    flush: () => flush(),
    sessionId: () => sid,
    visitorId: () => vid,
    enable,
    disable,
  }
}
