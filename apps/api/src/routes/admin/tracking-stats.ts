import { FUNNEL_STAGES, REVENUE_ORDER_STATUSES } from '@print-shop/utils'
import { Prisma } from '@prisma/client'
import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../../lib/prisma.js'
import { requirePermission } from '../../middleware/auth.js'
import { badRequest } from '../../middleware/error.js'

export const adminTrackingRouter = Router()

/** Realized-revenue statuses (paid family) as a Prisma filter and a raw-SQL list. */
const REVENUE_STATUSES: Prisma.OrderWhereInput['status'] = { in: [...REVENUE_ORDER_STATUSES] }
const revenueStatusSql = Prisma.join([...REVENUE_ORDER_STATUSES])

const rangeSchema = z.object({
  from: z.coerce.date(),
  to: z.coerce.date(),
  // z.coerce.boolean() follows JS truthiness, so "false"/"0" would read as true.
  // Parse the query flag explicitly: only "true"/"1" enable the compare window.
  compare: z
    .string()
    .optional()
    .transform((v) => v === 'true' || v === '1'),
})

interface FunnelRow {
  name: string
  sessions: bigint
}
interface TimeseriesRow {
  day: Date
  sessions: bigint
  purchases: bigint
  revenue_cents: bigint | null
}
interface ChannelRow {
  channel: string
  campaign: string
  orders: bigint
  revenue_cents: bigint | null
}

/**
 * Aggregate the core metrics for a window. Pure SQL — no rollup tables at this
 * scale. `kpisOnly` skips the timeseries + channels aggregations, which the
 * response drops for the compare window — no point paying for them there.
 */
async function metricsForRange(from: Date, to: Date, opts: { kpisOnly?: boolean } = {}) {
  const kpisOnly = opts.kpisOnly ?? false

  // Sessions come from behavioural events (page_view by occurredAt); purchases
  // and revenue come from paid orders (server-truth, bucketed by Payment.paidAt
  // and summing Order.totalCents), then the two are merged by day. This keeps
  // the daily purchase/revenue series consistent with the KPI + channel numbers
  // even when a client purchase event is missing or was reconciled/pruned.
  const timeseriesQuery = prisma.$queryRaw<TimeseriesRow[]>`
      WITH sessions AS (
        SELECT date_trunc(
                 'day',
                 e."occurredAt" AT TIME ZONE 'UTC' AT TIME ZONE 'Europe/Berlin'
               ) AS day,
               COUNT(DISTINCT e."sessionId") FILTER (WHERE e.name = 'page_view')::bigint AS sessions
        FROM "TrackingEvent" e
        WHERE e."occurredAt" BETWEEN ${from} AND ${to}
        GROUP BY 1
      ),
      paid_orders AS (
        SELECT o.id, o."totalCents", MIN(p."paidAt") AS paid_at
        FROM "Order" o
        JOIN "Payment" p ON p."orderId" = o.id AND p.status = 'paid'
          AND p."paidAt" BETWEEN ${from} AND ${to}
        WHERE o.status IN (${revenueStatusSql})
        GROUP BY o.id, o."totalCents"
      ),
      orders AS (
        SELECT date_trunc(
                 'day',
                 paid_at AT TIME ZONE 'UTC' AT TIME ZONE 'Europe/Berlin'
               ) AS day,
               COUNT(*)::bigint AS purchases,
               COALESCE(SUM("totalCents"),0)::bigint AS revenue_cents
        FROM paid_orders
        GROUP BY 1
      )
      SELECT COALESCE(s.day, o.day) AS day,
             COALESCE(s.sessions, 0)::bigint AS sessions,
             COALESCE(o.purchases, 0)::bigint AS purchases,
             COALESCE(o.revenue_cents, 0)::bigint AS revenue_cents
      FROM sessions s
      FULL OUTER JOIN orders o ON s.day = o.day
      ORDER BY 1`
  const channelsQuery = prisma.$queryRaw<ChannelRow[]>`
      SELECT oa."lastChannel" AS channel, COALESCE(oa."lastUtmCampaign",'-') AS campaign,
             COUNT(*)::bigint AS orders, SUM(o."totalCents")::bigint AS revenue_cents
      FROM "OrderAttribution" oa
      JOIN "Order" o ON o.id = oa."orderId"
      WHERE o.status IN (${revenueStatusSql})
        AND EXISTS (
          SELECT 1 FROM "Payment" p
          WHERE p."orderId" = o.id AND p.status = 'paid'
            AND p."paidAt" BETWEEN ${from} AND ${to}
        )
      GROUP BY 1, 2 ORDER BY revenue_cents DESC NULLS LAST`

  const [funnel, orderAgg, refundAgg, cancelAgg, timeseries, channels] = await Promise.all([
    prisma.$queryRaw<FunnelRow[]>`
      SELECT name, COUNT(DISTINCT "sessionId")::bigint AS sessions
      FROM "TrackingEvent"
      WHERE "occurredAt" BETWEEN ${from} AND ${to}
        AND name IN ('page_view','view_item','add_to_cart','begin_checkout')
      GROUP BY name`,
    prisma.order.aggregate({
      _sum: { totalCents: true, discountCents: true },
      _count: true,
      where: {
        status: REVENUE_STATUSES,
        payments: { some: { status: 'paid', paidAt: { gte: from, lte: to } } },
      },
    }),
    prisma.trackingEvent.count({
      where: { name: 'refund', occurredAt: { gte: from, lte: to } },
    }),
    prisma.trackingEvent.count({
      where: { name: 'order_cancelled', occurredAt: { gte: from, lte: to } },
    }),
    kpisOnly ? Promise.resolve<TimeseriesRow[]>([]) : timeseriesQuery,
    kpisOnly ? Promise.resolve<ChannelRow[]>([]) : channelsQuery,
  ])

  const funnelMap = new Map(funnel.map((r) => [r.name, Number(r.sessions)]))
  const purchases = orderAgg._count
  const funnelStages = FUNNEL_STAGES.map((stage) => ({
    stage,
    // purchase count comes from the orders table (server-truth), not events.
    sessions: stage === 'purchase' ? purchases : (funnelMap.get(stage) ?? 0),
  }))

  const sessions = funnelMap.get('page_view') ?? 0
  const addToCart = funnelMap.get('add_to_cart') ?? 0
  const beginCheckout = funnelMap.get('begin_checkout') ?? 0
  const netCents = orderAgg._sum.totalCents ?? 0
  const grossCents = netCents + (orderAgg._sum.discountCents ?? 0)

  return {
    kpis: {
      sessions,
      orders: purchases,
      grossRevenueCents: grossCents,
      netRevenueCents: netCents,
      avgOrderValueCents: purchases > 0 ? Math.round(netCents / purchases) : 0,
      conversionRate: sessions > 0 ? purchases / sessions : 0,
      addToCartRate: sessions > 0 ? addToCart / sessions : 0,
      checkoutRate: sessions > 0 ? beginCheckout / sessions : 0,
      refunds: refundAgg,
      cancellations: cancelAgg,
    },
    funnel: funnelStages,
    timeseries: timeseries.map((r) => ({
      day: r.day.toISOString().slice(0, 10),
      sessions: Number(r.sessions),
      purchases: Number(r.purchases),
      revenueCents: Number(r.revenue_cents ?? 0),
    })),
    channels: channels.map((r) => ({
      channel: r.channel,
      campaign: r.campaign,
      orders: Number(r.orders),
      revenueCents: Number(r.revenue_cents ?? 0),
    })),
  }
}

adminTrackingRouter.get('/overview', requirePermission('tracking:read'), async (req, res, next) => {
  try {
    const { from, to, compare } = rangeSchema.parse(req.query)
    if (from > to) throw badRequest('`from` must be before `to`')

    const span = to.getTime() - from.getTime()
    // Bound the window before running several concurrent raw aggregations, so an
    // authorized caller cannot request an arbitrarily large (or compare-doubled) scan.
    const MAX_SPAN_MS = 366 * 24 * 60 * 60 * 1000
    if (span > MAX_SPAN_MS) throw badRequest('Date range must not exceed 366 days')
    // The compare window only surfaces its KPIs, so fetch it kpis-only and run
    // it concurrently with the current window rather than back-to-back.
    const [current, previous, latest] = await Promise.all([
      metricsForRange(from, to),
      compare
        ? metricsForRange(new Date(from.getTime() - span - 1), new Date(from.getTime() - 1), {
            kpisOnly: true,
          })
        : Promise.resolve(null),
      // Freshness: consented client events lag; label the window and last event time.
      prisma.trackingEvent.findFirst({
        orderBy: { receivedAt: 'desc' },
        select: { receivedAt: true },
      }),
    ])
    res.json({
      range: { from, to },
      current,
      previous: previous ? previous.kpis : null,
      meta: {
        lastEventAt: latest?.receivedAt ?? null,
        note: 'Behavioural funnel counts consented sessions only; purchase/revenue are server-truth.',
      },
    })
  } catch (err) {
    next(err)
  }
})
