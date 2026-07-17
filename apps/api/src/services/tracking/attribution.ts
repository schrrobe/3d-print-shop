import type { TrackingChannel } from '@print-shop/utils'
import type { Prisma } from '@prisma/client'

type Db = Prisma.TransactionClient

const ATTRIBUTION_WINDOW_DAYS = 30

/** The session shape attribution reads (kept narrow for testability). */
export interface AttributionSession {
  id: string
  startedAt: Date
  channel: string
  utmSource: string | null
  utmMedium: string | null
  utmCampaign: string | null
  fbclid: string | null
  ttclid: string | null
  gclid: string | null
}

export interface ComputedAttribution {
  model: string
  lastChannel: string
  lastUtmSource: string | null
  lastUtmMedium: string | null
  lastUtmCampaign: string | null
  lastClickIdType: string | null
  lastClickId: string | null
  lastTouchAt: Date | null
  lastSessionId: string | null
  firstChannel: string | null
  firstUtmSource: string | null
  firstUtmCampaign: string | null
  firstTouchAt: Date | null
  touchpointCount: number
  daysToConversion: number | null
}

function clickIdOf(s: AttributionSession): { type: string | null; id: string | null } {
  if (s.ttclid) return { type: 'ttclid', id: s.ttclid }
  if (s.fbclid) return { type: 'fbclid', id: s.fbclid }
  if (s.gclid) return { type: 'gclid', id: s.gclid }
  return { type: null, id: null }
}

/**
 * Last-non-direct-click over a 30-day window, with first-touch recorded too.
 * `sessions` must be every session of the ordering visitor; `checkoutSession`
 * is the session that placed the order (the direct fallback). Pure so it can be
 * unit-tested without a DB.
 */
export function computeAttribution(
  sessions: AttributionSession[],
  checkoutSession: AttributionSession | null,
  paidAt: Date,
): ComputedAttribution {
  const windowStart = new Date(paidAt.getTime() - ATTRIBUTION_WINDOW_DAYS * 24 * 60 * 60_000)
  const inWindow = sessions
    .filter((s) => s.startedAt >= windowStart && s.startedAt <= paidAt)
    .sort((a, b) => a.startedAt.getTime() - b.startedAt.getTime())

  const nonDirect = inWindow.filter((s) => s.channel !== 'direct')
  const checkoutInWindow =
    checkoutSession &&
    checkoutSession.startedAt >= windowStart &&
    checkoutSession.startedAt <= paidAt
      ? checkoutSession
      : null
  const last = nonDirect.length > 0 ? nonDirect[nonDirect.length - 1] : checkoutInWindow
  const first = inWindow.length > 0 ? inWindow[0] : checkoutInWindow
  const lastClick = last ? clickIdOf(last) : { type: null, id: null }

  const lastTouchAt = last?.startedAt ?? null
  return {
    model: 'last_non_direct_30d',
    lastChannel: (last?.channel as TrackingChannel | undefined) ?? 'direct',
    lastUtmSource: last?.utmSource ?? null,
    lastUtmMedium: last?.utmMedium ?? null,
    lastUtmCampaign: last?.utmCampaign ?? null,
    lastClickIdType: lastClick.type,
    lastClickId: lastClick.id,
    lastTouchAt,
    lastSessionId: last?.id ?? null,
    firstChannel: first?.channel ?? null,
    firstUtmSource: first?.utmSource ?? null,
    firstUtmCampaign: first?.utmCampaign ?? null,
    firstTouchAt: first?.startedAt ?? null,
    touchpointCount: inWindow.length,
    daysToConversion: lastTouchAt
      ? Math.max(0, Math.floor((paidAt.getTime() - lastTouchAt.getTime()) / (24 * 60 * 60_000)))
      : null,
  }
}

const SESSION_SELECT = {
  id: true,
  startedAt: true,
  channel: true,
  utmSource: true,
  utmMedium: true,
  utmCampaign: true,
  fbclid: true,
  ttclid: true,
  gclid: true,
} as const

/**
 * Compute and persist attribution for a paid order inside the given transaction.
 * Resolves the ordering visitor via the order's checkout session, walks that
 * visitor's sessions in the window, and freezes the result in OrderAttribution.
 * Silently no-ops when there is no linked session (adblocked / consentless).
 */
export async function computeAndPersistAttribution(
  db: Db,
  order: { id: string; trackingSessionId: string | null },
  paidAt: Date = new Date(),
): Promise<void> {
  if (!order.trackingSessionId) return

  const checkoutSession = await db.trackingSession.findUnique({
    where: { id: order.trackingSessionId },
    select: { ...SESSION_SELECT, visitorId: true },
  })
  if (!checkoutSession) return

  const sessions = checkoutSession.visitorId
    ? await db.trackingSession.findMany({
        where: { visitorId: checkoutSession.visitorId },
        select: SESSION_SELECT,
      })
    : [checkoutSession]

  const { visitorId: _drop, ...checkoutForCompute } = checkoutSession
  void _drop
  const attribution = computeAttribution(sessions, checkoutForCompute, paidAt)

  await db.orderAttribution.createMany({
    data: [{ orderId: order.id, ...attribution }],
    // Attribution is a frozen payment-time snapshot. Reconciliation or
    // concurrent webhook deliveries must never rewrite it with newer sessions.
    skipDuplicates: true,
  })
}
