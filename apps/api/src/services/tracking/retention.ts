import { REVENUE_ORDER_STATUSES } from '@print-shop/utils'
import { env } from '../../env.js'
import { prisma } from '../../lib/prisma.js'
import { computeAndPersistAttribution } from './attribution.js'
import { recordPurchaseWithOutbox } from './outbox.js'

/**
 * Nightly tracking maintenance: data-protection retention (purge/anonymize) plus
 * a reconciliation pass that heals purchase events lost after the payment
 * commit. Single-instance assumption (same as the social cron); all operations
 * are idempotent so an overlapping run is harmless.
 */

export interface MaintenanceResult {
  eventsPurged: number
  sessionsPurged: number
  visitorsPurged: number
  sessionsAnonymized: number
  attributionsAnonymized: number
  purchasesHealed: number
  outboxPurged: number
}

/** Outbox payloads carry frozen click ids — purge them on their own clock. */
const OUTBOX_SENT_RETENTION_DAYS = 30
const OUTBOX_FAILED_RETENTION_DAYS = 90

/** One maintenance pass against the real DB (also the manual-trigger path). */
export async function runTrackingMaintenance(now: Date = new Date()): Promise<MaintenanceResult> {
  const eventCutoff = new Date(now.getTime() - env.TRACKING_EVENT_RETENTION_DAYS * 24 * 60 * 60_000)
  const anonCutoff = new Date(now.getTime() - env.TRACKING_SESSION_ANON_DAYS * 24 * 60 * 60_000)

  // 1. Purge events past the retention horizon. Filter on the server-controlled
  // receivedAt (uses its index) so a future-dated occurredAt cannot outlive the
  // horizon.
  const purgedEvents = await prisma.trackingEvent.deleteMany({
    where: { receivedAt: { lt: eventCutoff } },
  })

  // 2. Anonymize stale session metadata (drop UA + click ids, keep aggregates).
  const anonymized = await prisma.trackingSession.updateMany({
    where: { startedAt: { lt: anonCutoff }, anonymizedAt: null },
    data: {
      userAgent: null,
      fbclid: null,
      ttclid: null,
      gclid: null,
      referrer: null,
      anonymizedAt: now,
    },
  })
  const anonymizedAttributions = await prisma.orderAttribution.updateMany({
    where: {
      computedAt: { lt: anonCutoff },
      OR: [{ lastClickId: { not: null } }, { lastSessionId: { not: null } }],
    },
    // The frozen aggregate/channel remains useful, but these identifiers must
    // not outlive the equivalent fields on TrackingSession.
    data: { lastClickId: null, lastSessionId: null },
  })

  // 3. Delete sessions/visitors with no remaining events and past the horizon.
  const purgedSessions = await prisma.trackingSession.deleteMany({
    where: { startedAt: { lt: eventCutoff }, events: { none: {} } },
  })
  const purgedVisitors = await prisma.trackingVisitor.deleteMany({
    where: { lastSeenAt: { lt: eventCutoff }, sessions: { none: {} } },
  })

  // 4. Purge delivered/expired outbox rows — their frozen payloads carry click
  // ids, so the FK cascade at event retention (395d) is only a backstop.
  // Failed rows live longer for debugging, then go the same way.
  const purgedOutboxDelivered = await prisma.trackingOutbox.deleteMany({
    where: {
      status: { in: ['sent', 'skipped'] },
      createdAt: { lt: new Date(now.getTime() - OUTBOX_SENT_RETENTION_DAYS * 24 * 60 * 60_000) },
    },
  })
  const purgedOutboxFailed = await prisma.trackingOutbox.deleteMany({
    where: {
      status: 'failed',
      createdAt: { lt: new Date(now.getTime() - OUTBOX_FAILED_RETENTION_DAYS * 24 * 60 * 60_000) },
    },
  })

  // 5. Reconcile: paid-family orders that never got a purchase event.
  const gapOrders = await prisma.order.findMany({
    where: {
      status: { in: [...REVENUE_ORDER_STATUSES] },
      trackingEvents: { none: { name: 'purchase' } },
      // Never recreate an event immediately after retention intentionally
      // deleted it. Only still-retained payment history is reconcilable.
      payments: { some: { status: 'paid', paidAt: { gte: eventCutoff } } },
    },
    include: {
      items: true,
      payments: {
        where: { status: 'paid', paidAt: { not: null, gte: eventCutoff } },
        orderBy: { paidAt: 'desc' },
        take: 1,
      },
    },
  })
  let healed = 0
  for (const order of gapOrders) {
    const paidAt = order.payments[0]?.paidAt
    if (!paidAt) continue
    try {
      const inserted = await prisma.$transaction(async (tx) => {
        const purchaseInserted = await recordPurchaseWithOutbox(tx, order, paidAt)
        await computeAndPersistAttribution(tx, order, paidAt)
        // A payment past the anonymization horizon must not have its click/
        // session ids reintroduced by this freshly-computed attribution — the
        // step-2 pass (keyed on computedAt) would otherwise not revisit it for a
        // full anon window.
        if (paidAt < anonCutoff) {
          await tx.orderAttribution.updateMany({
            where: { orderId: order.id },
            data: { lastClickId: null, lastSessionId: null },
          })
        }
        return purchaseInserted
      })
      if (inserted) {
        healed += 1
        console.warn(`[tracking] reconciliation healed missing purchase for ${order.orderNumber}`)
      }
    } catch (err) {
      console.error(`[tracking] reconciliation failed for ${order.orderNumber}:`, err)
    }
  }

  return {
    eventsPurged: purgedEvents.count,
    sessionsPurged: purgedSessions.count,
    visitorsPurged: purgedVisitors.count,
    sessionsAnonymized: anonymized.count,
    attributionsAnonymized: anonymizedAttributions.count,
    purchasesHealed: healed,
    outboxPurged: purgedOutboxDelivered.count + purgedOutboxFailed.count,
  }
}

let tickRunning = false

export async function runTrackingMaintenanceTick(): Promise<MaintenanceResult | null> {
  if (tickRunning) return null
  tickRunning = true
  try {
    return await runTrackingMaintenance()
  } finally {
    tickRunning = false
  }
}

/** Interval worker, opt-in via TRACKING_RETENTION_CRON_ENABLED=true. */
export function startTrackingMaintenanceCron(): NodeJS.Timeout | null {
  if (!env.TRACKING_RETENTION_CRON_ENABLED) return null
  const intervalMs = env.TRACKING_RETENTION_CRON_INTERVAL_SECONDS * 1000
  const timer = setInterval(() => {
    runTrackingMaintenanceTick()
      .then((r) => {
        if (
          r &&
          (r.eventsPurged > 0 ||
            r.purchasesHealed > 0 ||
            r.sessionsAnonymized > 0 ||
            r.attributionsAnonymized > 0 ||
            r.outboxPurged > 0)
        ) {
          console.info(
            `[tracking] maintenance: purgedEvents=${r.eventsPurged} anonymizedSessions=${r.sessionsAnonymized} anonymizedAttributions=${r.attributionsAnonymized} healed=${r.purchasesHealed} outboxPurged=${r.outboxPurged}`,
          )
        }
      })
      .catch((err) => console.error('[tracking] maintenance tick failed:', err))
  }, intervalMs)
  timer.unref()
  console.info(
    `[tracking] maintenance cron enabled (every ${env.TRACKING_RETENTION_CRON_INTERVAL_SECONDS}s)`,
  )
  return timer
}
