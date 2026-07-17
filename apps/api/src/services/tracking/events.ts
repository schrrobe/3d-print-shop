import {
  classifyChannel,
  orderEventId,
  referrerHost,
  sanitizeTrackingPath,
  type ServerEventName,
} from '@print-shop/utils'
import type { TrackBatchInput } from '@print-shop/validators'
import type { Prisma } from '@prisma/client'
import { prisma } from '../../lib/prisma.js'

/** Accepts either the root client or a transaction client. */
type Db = Prisma.TransactionClient | typeof prisma

const CLOCK_SKEW_FUTURE_MS = 5 * 60_000
const MAX_EVENT_AGE_MS = 48 * 60 * 60_000

/** Coarse device class from a user-agent string (no fingerprinting). */
export function deviceTypeFromUserAgent(ua: string | undefined | null): string | null {
  if (!ua) return null
  const s = ua.toLowerCase()
  if (/ipad|tablet|playbook|silk|(android(?!.*mobile))/.test(s)) return 'tablet'
  if (/mobi|iphone|ipod|android|blackberry|iemobile|opera mini/.test(s)) return 'mobile'
  return 'desktop'
}

export interface ClientIngestResult {
  accepted: number
  duplicates: number
  dropped: number
}

/**
 * Persist a validated browser batch: upsert the session (capturing the
 * attribution touchpoint on first sight), upsert the visitor, then insert the
 * behavioural events, skipping any whose id already exists (dedup).
 */
export async function recordClientBatch(
  batch: TrackBatchInput,
  ctx: { userAgent?: string; now?: Date },
): Promise<ClientIngestResult> {
  const now = ctx.now ?? new Date()
  const minTime = now.getTime() - MAX_EVENT_AGE_MS
  const maxTime = now.getTime() + CLOCK_SKEW_FUTURE_MS

  const rows: Prisma.TrackingEventCreateManyInput[] = []
  let dropped = 0
  for (const e of batch.events) {
    const t = e.occurredAt.getTime()
    if (t < minTime || t > maxTime) {
      dropped += 1
      continue
    }
    const path = sanitizeTrackingPath(e.path)
    rows.push({
      id: e.eventId,
      name: e.name,
      source: 'client',
      sessionId: batch.sessionId,
      visitorId: batch.visitorId,
      occurredAt: e.occurredAt,
      path,
      consentStatistics: batch.consent.statistics,
      consentMarketing: batch.consent.marketing,
      props: (e.props ?? undefined) as Prisma.InputJsonValue | undefined,
    })
  }

  // Do not create empty visitors/sessions for a batch whose events were all
  // outside the accepted clock-skew window.
  if (rows.length === 0) return { accepted: 0, duplicates: 0, dropped }

  const inserted = await prisma.$transaction(async (tx) => {
    if (batch.visitorId) {
      await tx.trackingVisitor.upsert({
        where: { id: batch.visitorId },
        create: { id: batch.visitorId, firstSeenAt: now, lastSeenAt: now },
        update: { lastSeenAt: now },
      })
    }

    const meta = batch.session
    if (meta) {
      const host = referrerHost(meta.referrer)
      const channel = classifyChannel({
        utmSource: meta.utm?.source,
        utmMedium: meta.utm?.medium,
        fbclid: meta.clickIds?.fbclid,
        ttclid: meta.clickIds?.ttclid,
        gclid: meta.clickIds?.gclid,
        referrerHost: host,
      })
      const landingPath = sanitizeTrackingPath(meta.landingPath, '/') ?? '/'
      // The attribution touchpoint. Never retain a referrer path/query, which
      // can contain order access tokens or other customer data — host only.
      const touchpoint = {
        landingPath,
        referrer: host.slice(0, 512) || null,
        utmSource: meta.utm?.source ?? null,
        utmMedium: meta.utm?.medium ?? null,
        utmCampaign: meta.utm?.campaign ?? null,
        utmTerm: meta.utm?.term ?? null,
        utmContent: meta.utm?.content ?? null,
        fbclid: meta.clickIds?.fbclid ?? null,
        ttclid: meta.clickIds?.ttclid ?? null,
        gclid: meta.clickIds?.gclid ?? null,
        channel,
        userAgent: ctx.userAgent?.slice(0, 255) ?? null,
        deviceType: deviceTypeFromUserAgent(ctx.userAgent),
      }
      await tx.trackingSession.upsert({
        where: { id: batch.sessionId },
        create: { id: batch.sessionId, visitorId: batch.visitorId, startedAt: now, lastEventAt: now, ...touchpoint },
        // Touchpoint is captured once (first batch wins); later batches only bump activity.
        update: { lastEventAt: now, visitorId: batch.visitorId ?? undefined },
      })
      // Promote a checkout-created placeholder (landingPath '' — the session row
      // existed before its meta batch arrived) to the real touchpoint. Matches 0
      // rows for a normal session, so it never clobbers a captured touchpoint.
      await tx.trackingSession.updateMany({
        where: { id: batch.sessionId, landingPath: '' },
        data: { ...touchpoint, visitorId: batch.visitorId ?? undefined },
      })
    } else {
      const landingPath = sanitizeTrackingPath(batch.events[0]?.path ?? '/', '/') ?? '/'
      await tx.trackingSession.upsert({
        where: { id: batch.sessionId },
        create: {
          id: batch.sessionId,
          visitorId: batch.visitorId,
          startedAt: now,
          lastEventAt: now,
          landingPath,
          userAgent: ctx.userAgent?.slice(0, 255) ?? null,
          deviceType: deviceTypeFromUserAgent(ctx.userAgent),
        },
        update: { lastEventAt: now, visitorId: batch.visitorId ?? undefined },
      })
    }

    return tx.trackingEvent.createMany({ data: rows, skipDuplicates: true })
  })
  return { accepted: inserted.count, duplicates: rows.length - inserted.count, dropped }
}

/** Cookie-consent snapshot captured at checkout (see checkoutSchema.consent). */
export interface ConsentSnapshot {
  statistics: boolean
  marketing: boolean
}

export interface ServerEventInput {
  name: ServerEventName
  orderId: string
  valueCents?: number | null
  currency?: string
  sessionId?: string | null
  occurredAt?: Date
  consentStatistics?: boolean
  consentMarketing?: boolean
  props?: Record<string, unknown>
  /** Skip the defensive session re-lookup: the caller already ensured the row exists. */
  sessionResolved?: boolean
}

/**
 * Insert a deterministic per-order server event (id = `<name>:<orderId>`).
 * Idempotent: a duplicate id or a colliding (name, orderId) unique key resolves
 * to a no-op, so webhook redeliveries / double-clicks never double-count. Pass a
 * transaction client to commit the event atomically with the order status flip.
 */
export async function recordServerEvent(db: Db, input: ServerEventInput): Promise<boolean> {
  // Orders can carry stale or forged client session ids. Resolve the optional
  // relation before insertion so tracking can never fail on its foreign key,
  // unless the caller has already guaranteed the row exists (sessionResolved).
  const sessionId = input.sessionId
    ? input.sessionResolved
      ? input.sessionId
      : ((
          await db.trackingSession.findUnique({
            where: { id: input.sessionId },
            select: { id: true },
          })
        )?.id ?? null)
    : null
  const inserted = await db.trackingEvent.createMany({
    data: [
      {
        id: orderEventId(input.name, input.orderId),
        name: input.name,
        source: 'server',
        sessionId,
        orderId: input.orderId,
        valueCents: input.valueCents ?? null,
        currency: input.currency ?? 'EUR',
        occurredAt: input.occurredAt ?? new Date(),
        consentStatistics: input.consentStatistics ?? false,
        consentMarketing: input.consentMarketing ?? false,
        props: (input.props ?? undefined) as Prisma.InputJsonValue | undefined,
      },
    ],
    // Avoid catching a P2002 inside an interactive transaction: PostgreSQL
    // would leave that transaction aborted even though the exception is caught.
    skipDuplicates: true,
  })
  return inserted.count === 1
}

/** order_created — emitted at checkout (order exists but is not yet paid). */
export async function emitOrderCreated(
  db: Db,
  order: { id: string; totalCents: number; trackingSessionId?: string | null },
  sessionResolved = false,
  consent?: ConsentSnapshot,
): Promise<boolean> {
  return recordServerEvent(db, {
    name: 'order_created',
    orderId: order.id,
    valueCents: order.totalCents,
    sessionId: order.trackingSessionId ?? null,
    sessionResolved,
    consentStatistics: consent?.statistics,
    consentMarketing: consent?.marketing,
  })
}

/**
 * Consent snapshot for an order, read back from its order_created event — the
 * only place the checkout-time consent is persisted. Fail-closed: a missing
 * event (best-effort emit lost) means no provable consent, so no marketing
 * fan-out for this order.
 */
export async function getOrderConsent(db: Db, orderId: string): Promise<ConsentSnapshot> {
  const event = await db.trackingEvent.findUnique({
    where: { id: orderEventId('order_created', orderId) },
    select: { consentStatistics: true, consentMarketing: true },
  })
  return {
    statistics: event?.consentStatistics ?? false,
    marketing: event?.consentMarketing ?? false,
  }
}

/** purchase — emitted immediately after the atomic payment claim. */
export async function emitPurchase(
  db: Db,
  order: {
    id: string
    totalCents: number
    shippingCents: number
    discountCents: number
    trackingSessionId?: string | null
    items?: { quantity: number }[]
  },
  occurredAt?: Date,
  consent?: ConsentSnapshot,
): Promise<boolean> {
  const itemCount = order.items?.reduce((n, i) => n + i.quantity, 0)
  return recordServerEvent(db, {
    name: 'purchase',
    orderId: order.id,
    valueCents: order.totalCents,
    sessionId: order.trackingSessionId ?? null,
    occurredAt,
    consentStatistics: consent?.statistics,
    consentMarketing: consent?.marketing,
    props: {
      shippingCents: order.shippingCents,
      discountCents: order.discountCents,
      ...(itemCount != null ? { itemCount } : {}),
    },
  })
}

/** refund — status-only in this shop, so the full order total is reversed. */
export async function emitRefund(
  db: Db,
  order: { id: string; totalCents: number; trackingSessionId?: string | null },
): Promise<boolean> {
  return recordServerEvent(db, {
    name: 'refund',
    orderId: order.id,
    valueCents: -Math.abs(order.totalCents),
    sessionId: order.trackingSessionId ?? null,
  })
}

/** order_cancelled — emitted when a paid-family order is cancelled. */
export async function emitCancel(
  db: Db,
  order: { id: string; trackingSessionId?: string | null },
): Promise<boolean> {
  return recordServerEvent(db, {
    name: 'order_cancelled',
    orderId: order.id,
    sessionId: order.trackingSessionId ?? null,
  })
}
