import { createHash } from 'node:crypto'
import {
  CONVERSION_EVENTS,
  isConversionEventName,
  orderEventId,
  sanitizeTrackingPath,
  type ConversionEventName,
} from '@print-shop/utils'
import type { TrackEventInput } from '@print-shop/validators'
import { Prisma } from '@prisma/client'
import { env } from '../../env.js'
import { prisma } from '../../lib/prisma.js'
import type {
  OutboxPayload,
  TrackingDestination,
  TrackingEventSender,
} from './destinations/index.js'
import {
  enabledDestinations,
  outboxPayloadSchema,
  trackingSenders,
  TrackingSendError,
} from './destinations/index.js'
import type { ConsentSnapshot } from './events.js'
import { emitPurchase, getOrderConsent } from './events.js'

/**
 * Transactional outbox for marketing destinations (Meta CAPI, TikTok Events).
 *
 * Purchases enqueue in the same transaction as the purchase event; browser
 * conversion events (CONVERSION_EVENTS) enqueue right after ingest. The worker
 * delivers out-of-band. Fan-out is marketing-consent-gated only: with consent
 * the payload carries the match data storylo sends too — SHA-256 email
 * (purchase), client IP, user agent and the _fbp/_fbc/_ttp cookies.
 *
 * Idempotency / double-send protection:
 * 1. Enqueue: @@unique([eventId, destination]) + skipDuplicates — webhook
 *    redeliveries never create a second row.
 * 2. Claim via compare-and-swap: updateMany({ where: { id, status: 'pending' } })
 *    — with parallel workers exactly one gets count=1, everyone else skips.
 * 3. Crash recovery: unlike the social publisher, re-sending IS safe here —
 *    Meta/TikTok dedup on event_id — so rows stuck in 'sending' past lockUntil
 *    go back to 'pending' instead of 'failed'.
 */

const CLAIM_LOCK_MINUTES = 5
const BATCH_SIZE = 50
const MAX_ATTEMPTS = 10
/** Meta rejects events older than 7 days; TikTok is similar. */
const MAX_EVENT_AGE_DAYS = 7
const BACKOFF_BASE_SECONDS = 60
const BACKOFF_CAP_SECONDS = 6 * 3600

/** Accepts the root client or a transaction client. */
type Db = Prisma.TransactionClient | typeof prisma

// --- Enqueue ---------------------------------------------------------------

/** Match data captured from the browser request (checkout or event ingest). */
export interface RequestAttribution {
  ip?: string | null
  userAgent?: string | null
  fbp?: string | null
  fbc?: string | null
  ttp?: string | null
}

/** Session columns that feed the click ids when the browser had no cookie yet. */
export interface FanoutSession {
  fbclid: string | null
  ttclid: string | null
  userAgent: string | null
  landingPath: string
  startedAt: Date
}

export type FanoutRow = { destination: TrackingDestination; payload: OutboxPayload }

export const sha256Email = (email: string) =>
  createHash('sha256').update(email.trim().toLowerCase()).digest('hex')

/**
 * Pure fan-out core shared by purchases and browser events: one frozen payload
 * per enabled destination. TikTok has no server counterpart for page views.
 */
export function buildFanoutRows(
  base: Omit<
    OutboxPayload,
    'v' | 'fbc' | 'ttclid' | 'fbp' | 'ttp' | 'clientIp' | 'clientUserAgent'
  >,
  attribution: RequestAttribution | null,
  session: FanoutSession | null,
  destinations: TrackingDestination[],
): FanoutRow[] {
  const shared = {
    ...base,
    v: 1 as const,
    clientIp: attribution?.ip ?? null,
    clientUserAgent: attribution?.userAgent ?? session?.userAgent ?? null,
  }
  const rows: FanoutRow[] = []
  if (destinations.includes('meta_capi')) {
    const fbc =
      attribution?.fbc ??
      // fbc click timestamp = when we first saw the fbclid (session start).
      (session?.fbclid ? `fb.1.${session.startedAt.getTime()}.${session.fbclid}` : null)
    rows.push({
      destination: 'meta_capi',
      payload: { ...shared, fbc, fbp: attribution?.fbp ?? null, ttclid: null },
    })
  }
  if (destinations.includes('tiktok_events') && CONVERSION_EVENTS[base.eventName].tiktok) {
    rows.push({
      destination: 'tiktok_events',
      payload: {
        ...shared,
        fbc: null,
        ttclid: session?.ttclid ?? null,
        ttp: attribution?.ttp ?? null,
      },
    })
  }
  return rows
}

export interface PurchaseFanoutInput {
  orderId: string
  totalCents: number
  email: string
  itemCount?: number
  paidAt: Date
  consent: ConsentSnapshot
  attribution: RequestAttribution | null
  session: FanoutSession | null
  destinations: TrackingDestination[]
  webUrl?: string
}

/** No marketing consent / destination not enabled ⇒ no row. */
export function buildPurchasePayloads(input: PurchaseFanoutInput): FanoutRow[] {
  if (!input.consent.marketing) return []
  const webUrl = (input.webUrl ?? env.WEB_URL).replace(/\/$/, '')
  return buildFanoutRows(
    {
      eventName: 'purchase',
      eventId: orderEventId('purchase', input.orderId),
      orderId: input.orderId,
      eventTime: Math.floor(input.paidAt.getTime() / 1000),
      valueCents: input.totalCents,
      currency: 'EUR',
      // Checkout-created placeholder sessions carry landingPath '' — fall back to the checkout.
      eventSourceUrl: `${webUrl}${input.session?.landingPath || '/checkout'}`,
      emailHash: sha256Email(input.email),
      numItems: input.itemCount ?? null,
    },
    input.attribution,
    input.session,
    input.destinations,
  )
}

const FANOUT_SESSION_SELECT = {
  fbclid: true,
  ttclid: true,
  userAgent: true,
  landingPath: true,
  startedAt: true,
} as const

async function insertOutboxRows(db: Db, rows: FanoutRow[]): Promise<number> {
  if (rows.length === 0) return 0
  const inserted = await db.trackingOutbox.createMany({
    data: rows.map((row) => ({
      eventId: row.payload.eventId,
      destination: row.destination,
      payload: row.payload as Prisma.InputJsonValue,
    })),
    skipDuplicates: true,
  })
  return inserted.count
}

/**
 * Freeze payloads and insert outbox rows (same tx as the purchase event — its
 * id is the FK target). Idempotent via the [eventId, destination] unique key.
 * The checkout-time IP/cookies are cleared from the order once frozen.
 */
export async function enqueuePurchaseOutbox(
  db: Db,
  order: {
    id: string
    totalCents: number
    email: string
    trackingSessionId?: string | null
    items?: { quantity: number }[]
  },
  paidAt: Date,
  consent: ConsentSnapshot,
): Promise<number> {
  // Read here, not from the caller: admin order reads omit this field.
  const { trackingAttribution } = (await db.order.findUnique({
    where: { id: order.id },
    select: { trackingAttribution: true },
  })) ?? { trackingAttribution: null }
  if (trackingAttribution != null) {
    // Single use, consent or not: never keep it past the payment.
    await db.order.update({
      where: { id: order.id },
      data: { trackingAttribution: Prisma.DbNull },
    })
  }
  if (!consent.marketing) return 0
  const session = order.trackingSessionId
    ? await db.trackingSession.findUnique({
        where: { id: order.trackingSessionId },
        select: FANOUT_SESSION_SELECT,
      })
    : null
  const rows = buildPurchasePayloads({
    orderId: order.id,
    totalCents: order.totalCents,
    email: order.email,
    itemCount: order.items?.reduce((n, i) => n + i.quantity, 0),
    paidAt,
    consent,
    attribution: trackingAttribution as RequestAttribution | null,
    session,
    destinations: enabledDestinations(),
  })
  return insertOutboxRows(db, rows)
}

/** Commerce fields a browser conversion event may carry (from its allowlisted props). */
function clientConversionFields(
  name: ConversionEventName,
  props: TrackEventInput['props'],
): Pick<OutboxPayload, 'valueCents' | 'contentId' | 'numItems'> {
  const p = props ?? {}
  if (name === 'view_item') {
    return { valueCents: p.priceCents ?? null, contentId: p.productId ?? null, numItems: null }
  }
  if (name === 'add_to_cart') {
    const quantity = p.quantity ?? 1
    return {
      valueCents: p.unitPriceCents == null ? null : p.unitPriceCents * quantity,
      contentId: p.productId ?? null,
      numItems: quantity,
    }
  }
  if (name === 'begin_checkout') {
    return { valueCents: p.subtotalCents ?? null, contentId: null, numItems: p.itemCount ?? null }
  }
  return { valueCents: null, contentId: null, numItems: null }
}

/**
 * Forward browser conversion events straight to Meta/TikTok (marketing consent
 * is checked by the caller). Sent directly like storylo, not via the outbox,
 * so the IP and cookies are never persisted for them — no retry; a lost
 * behavioural event is acceptable, the browser pixel carries the same event id
 * and Meta/TikTok dedupe the pair. Sensitive paths are never forwarded.
 */
export async function sendClientConversions(
  db: Db,
  input: {
    sessionId: string
    events: TrackEventInput[]
    attribution: RequestAttribution
    /** Click ids from this batch's session meta (marketing-only visitors have no session row). */
    clickIds?: { fbclid?: string | null; ttclid?: string | null } | null
    webUrl?: string
    senders?: Partial<Record<TrackingDestination, TrackingEventSender>>
  },
): Promise<number> {
  const events = input.events.flatMap((e) => {
    const path = sanitizeTrackingPath(e.path ?? null)
    return isConversionEventName(e.name) && path ? [{ ...e, name: e.name, path }] : []
  })
  const destinations = enabledDestinations()
  if (events.length === 0 || destinations.length === 0) return 0
  const session =
    (await db.trackingSession.findUnique({
      where: { id: input.sessionId },
      select: FANOUT_SESSION_SELECT,
    })) ??
    (input.clickIds
      ? {
          fbclid: input.clickIds.fbclid ?? null,
          ttclid: input.clickIds.ttclid ?? null,
          userAgent: null,
          landingPath: '',
          startedAt: new Date(),
        }
      : null)
  const webUrl = (input.webUrl ?? env.WEB_URL).replace(/\/$/, '')
  const rows = events.flatMap((e) =>
    buildFanoutRows(
      {
        eventName: e.name,
        eventId: e.eventId,
        orderId: null,
        eventTime: Math.floor(e.occurredAt.getTime() / 1000),
        currency: 'EUR',
        eventSourceUrl: `${webUrl}${e.path}`,
        ...clientConversionFields(e.name, e.props),
      },
      input.attribution,
      session,
      destinations,
    ),
  )
  const senders = input.senders ?? trackingSenders
  const results = await Promise.allSettled(
    rows.map((row) => {
      const sender = senders[row.destination]
      return sender ? sender.send(row.payload) : Promise.resolve(null)
    }),
  )
  for (const r of results) {
    if (r.status === 'rejected')
      console.warn('[tracking] client conversion send failed:', String(r.reason))
  }
  return results.filter((r) => r.status === 'fulfilled' && r.value).length
}

/**
 * Purchase event + attribution-time consent read-back + outbox fan-out, as one
 * unit for the payment claim and the reconciliation heal. Enqueue runs even
 * when the event already existed (returns false): a webhook retry after a
 * partial failure between event insert and enqueue must still enqueue —
 * skipDuplicates keeps that idempotent.
 */
export async function recordPurchaseWithOutbox(
  db: Db,
  order: {
    id: string
    totalCents: number
    shippingCents: number
    discountCents: number
    email: string
    trackingSessionId?: string | null
    items?: { quantity: number }[]
  },
  paidAt: Date,
): Promise<boolean> {
  const consent = await getOrderConsent(db, order.id)
  const inserted = await emitPurchase(db, order, paidAt, consent)
  await enqueuePurchaseOutbox(db, order, paidAt, consent)
  return inserted
}

// --- Worker ----------------------------------------------------------------

/** Subset of TrackingOutbox the worker reads. */
export interface OutboxRowForWorker {
  id: string
  destination: string
  payload: unknown
  attempts: number
}

/**
 * The exact prisma call shapes the worker uses — narrow on purpose so unit
 * tests can supply an in-memory fake with real CAS semantics.
 */
export interface TrackingOutboxDelegate {
  findMany(args: {
    where: { status: 'pending'; nextAttemptAt: { lte: Date } }
    orderBy: { nextAttemptAt: 'asc' }
    take: number
  }): Promise<OutboxRowForWorker[]>
  updateMany(args: {
    where: Record<string, unknown>
    data: Record<string, unknown>
  }): Promise<{ count: number }>
}

export interface OutboxWorkerDeps {
  outbox: TrackingOutboxDelegate
  senders: Partial<Record<TrackingDestination, TrackingEventSender>>
  now?: () => Date
  lockMinutes?: number
  maxAttempts?: number
  maxEventAgeDays?: number
  /** Injectable for deterministic backoff tests. */
  random?: () => number
}

export interface OutboxTickResult {
  recovered: number
  claimed: number
  sent: number
  retried: number
  failed: number
  skipped: number
}

/** Exponential backoff with ±20% jitter: 60s · 2^(attempts-1), capped at 6h. */
export function computeNextAttemptAt(
  attempts: number,
  now: Date,
  random: () => number = Math.random,
): Date {
  const baseSeconds = Math.min(
    BACKOFF_BASE_SECONDS * 2 ** Math.max(attempts - 1, 0),
    BACKOFF_CAP_SECONDS,
  )
  const jitter = 1 + (random() * 0.4 - 0.2)
  return new Date(now.getTime() + Math.round(baseSeconds * jitter * 1000))
}

export async function processDueOutboxRows(deps: OutboxWorkerDeps): Promise<OutboxTickResult> {
  const now = deps.now ?? (() => new Date())
  const lockMinutes = deps.lockMinutes ?? CLAIM_LOCK_MINUTES
  const maxAttempts = deps.maxAttempts ?? MAX_ATTEMPTS
  const maxEventAgeMs = (deps.maxEventAgeDays ?? MAX_EVENT_AGE_DAYS) * 24 * 60 * 60_000
  const result: OutboxTickResult = {
    recovered: 0,
    claimed: 0,
    sent: 0,
    retried: 0,
    failed: 0,
    skipped: 0,
  }

  // Crash recovery: expired sending locks → back to pending (re-send is safe,
  // the destinations dedup on event_id).
  const recovered = await deps.outbox.updateMany({
    where: { status: 'sending', lockUntil: { lt: now() } },
    data: { status: 'pending', lockUntil: null },
  })
  result.recovered = recovered.count

  const due = await deps.outbox.findMany({
    where: { status: 'pending', nextAttemptAt: { lte: now() } },
    orderBy: { nextAttemptAt: 'asc' },
    take: BATCH_SIZE,
  })

  for (const row of due) {
    const claimedAt = now()
    // CAS claim: only one worker wins this row. attempts++ already at claim —
    // a crash right after still counts, bounding endless recovery loops.
    const claim = await deps.outbox.updateMany({
      where: { id: row.id, status: 'pending' },
      data: {
        status: 'sending',
        lockUntil: new Date(claimedAt.getTime() + lockMinutes * 60_000),
        attempts: { increment: 1 },
      },
    })
    if (claim.count !== 1) continue
    result.claimed += 1
    const attempts = row.attempts + 1

    // All follow-up writes are guarded by the claimed status.
    const settle = (data: Record<string, unknown>) =>
      deps.outbox.updateMany({ where: { id: row.id, status: 'sending' }, data })

    const parsed = outboxPayloadSchema.safeParse(row.payload)
    if (!parsed.success) {
      await settle({
        status: 'failed',
        lastError: `payload_invalid: ${parsed.error.message}`.slice(0, 2000),
        lockUntil: null,
      })
      result.failed += 1
      continue
    }
    const payload = parsed.data

    if (claimedAt.getTime() - payload.eventTime * 1000 > maxEventAgeMs) {
      await settle({ status: 'skipped', lastError: 'event_expired', lockUntil: null })
      result.skipped += 1
      continue
    }

    const sender = deps.senders[row.destination as TrackingDestination]
    if (!sender) {
      await settle({ status: 'skipped', lastError: 'destination_disabled', lockUntil: null })
      result.skipped += 1
      continue
    }

    try {
      const { responseCode } = await sender.send(payload)
      await settle({
        status: 'sent',
        sentAt: now(),
        responseCode,
        lastError: null,
        lockUntil: null,
      })
      result.sent += 1
    } catch (err) {
      const sendError = err instanceof TrackingSendError ? err : null
      const message = (sendError ? `[${sendError.code}] ${sendError.message}` : String(err)).slice(
        0,
        2000,
      )
      if (sendError?.retryable && attempts < maxAttempts) {
        await settle({
          status: 'pending',
          nextAttemptAt: computeNextAttemptAt(attempts, now(), deps.random),
          lastError: message,
          responseCode: sendError.responseCode ?? null,
          lockUntil: null,
        })
        result.retried += 1
      } else {
        await settle({
          status: 'failed',
          lastError: message,
          responseCode: sendError?.responseCode ?? null,
          lockUntil: null,
        })
        result.failed += 1
      }
    }
  }

  return result
}

let tickRunning = false

/** One worker pass against the real DB + configured senders (also the manual-trigger path). */
export async function runTrackingOutboxTick(): Promise<OutboxTickResult | null> {
  if (tickRunning) return null
  tickRunning = true
  try {
    return await processDueOutboxRows({
      // Cast: PrismaClient's generated arg types are narrower than the
      // structural delegate above, but every call shape used is valid.
      outbox: prisma.trackingOutbox as unknown as TrackingOutboxDelegate,
      senders: trackingSenders,
    })
  } finally {
    tickRunning = false
  }
}

/** Interval-based worker, opt-in via TRACKING_OUTBOX_CRON_ENABLED=true. */
export function startTrackingOutboxCron(): NodeJS.Timeout | null {
  if (!env.TRACKING_OUTBOX_CRON_ENABLED) return null
  const intervalMs = env.TRACKING_OUTBOX_CRON_INTERVAL_SECONDS * 1000
  const timer = setInterval(() => {
    runTrackingOutboxTick()
      .then((r) => {
        if (r && (r.claimed > 0 || r.recovered > 0)) {
          console.info(
            `[tracking] outbox tick: recovered=${r.recovered} claimed=${r.claimed} sent=${r.sent} retried=${r.retried} failed=${r.failed} skipped=${r.skipped}`,
          )
        }
      })
      .catch((err) => console.error('[tracking] outbox tick failed:', err))
  }, intervalMs)
  timer.unref()
  console.info(
    `[tracking] outbox cron enabled (every ${env.TRACKING_OUTBOX_CRON_INTERVAL_SECONDS}s)`,
  )
  return timer
}
