import { Router } from 'express'
import type { OrderStatus } from '@prisma/client'
import { prisma } from '../../lib/prisma.js'
import { hasPermission } from '@print-shop/utils'
import { requirePermission } from '../../middleware/auth.js'
import { buyerCountries, buyerLocations } from '../../services/buyer-locations.js'

export const adminDashboardRouter = Router()

const PAID: OrderStatus[] = ['paid', 'in_production', 'quality_check', 'ready_to_ship', 'shipped', 'completed']

const RETURNING_WINDOW_DAYS = 30

/** Visitors with ≥ 2 sessions in the last 30 days, out of all visitors seen in that window. */
async function returningVisitors() {
  const since = new Date(Date.now() - RETURNING_WINDOW_DAYS * 24 * 60 * 60 * 1000)
  const [row] = await prisma.$queryRaw<{ returning: bigint; total: bigint }[]>`
    SELECT COUNT(*) FILTER (WHERE n > 1)::bigint AS returning, COUNT(*)::bigint AS total
    FROM (
      SELECT "visitorId", COUNT(*) AS n FROM "TrackingSession"
      WHERE "visitorId" IS NOT NULL AND "startedAt" >= ${since}
      GROUP BY 1
    ) v`
  return { returning: Number(row?.returning ?? 0), total: Number(row?.total ?? 0), days: RETURNING_WINDOW_DAYS }
}

adminDashboardRouter.get('/', requirePermission('dashboard:read'), async (req, res, next) => {
  try {
    // Tracking stats stay behind tracking:read, like the analytics tab.
    const canSeeTracking = req.user != null && hasPermission(req.user.role, 'tracking:read')
    const [ordersByStatus, revenue, openRequests, printers, queueWaiting, paidAddresses, paymentsByMethod, openTickets, returning] = await Promise.all([
      prisma.order.groupBy({ by: ['status'], _count: true }),
      prisma.order.aggregate({ _sum: { totalCents: true }, where: { status: { in: PAID } } }),
      prisma.quoteRequest.count({ where: { status: { in: ['new', 'in_review'] } } }),
      prisma.printer.findMany({ select: { id: true, name: true, status: true } }),
      prisma.printerJob.count({ where: { status: 'waiting' } }),
      prisma.order.findMany({ where: { status: { in: PAID } }, select: { country: true, zip: true } }),
      prisma.payment.groupBy({ by: ['method'], _count: true, _sum: { amountCents: true }, where: { status: 'paid' } }),
      prisma.ticket.count({ where: { status: { in: ['open', 'in_progress', 'waiting_customer'] } } }),
      canSeeTracking ? returningVisitors() : null,
    ])
    res.json({
      ordersByStatus: Object.fromEntries(ordersByStatus.map((o) => [o.status, o._count])),
      revenueCents: revenue._sum.totalCents ?? 0,
      openQuoteRequests: openRequests,
      openTickets,
      printers,
      productionWaiting: queueWaiting,
      buyerLocations: buyerLocations(paidAddresses),
      buyerCountries: buyerCountries(paidAddresses),
      paymentMethods: paymentsByMethod
        .map((p) => ({ method: p.method, count: p._count, amountCents: p._sum.amountCents ?? 0 }))
        .sort((a, b) => b.count - a.count),
      returningVisitors: returning,
    })
  } catch (err) {
    next(err)
  }
})
