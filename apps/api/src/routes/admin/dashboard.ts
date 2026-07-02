import { Router } from 'express'
import { prisma } from '../../lib/prisma.js'
import { requirePermission } from '../../middleware/auth.js'

export const adminDashboardRouter = Router()

adminDashboardRouter.get('/', requirePermission('dashboard:read'), async (_req, res, next) => {
  try {
    const [ordersByStatus, revenue, openRequests, printers, queueWaiting] = await Promise.all([
      prisma.order.groupBy({ by: ['status'], _count: true }),
      prisma.order.aggregate({
        _sum: { totalCents: true },
        where: { status: { in: ['paid', 'in_production', 'quality_check', 'ready_to_ship', 'shipped', 'completed'] } },
      }),
      prisma.quoteRequest.count({ where: { status: { in: ['new', 'in_review'] } } }),
      prisma.printer.findMany({ select: { id: true, name: true, status: true } }),
      prisma.printerJob.count({ where: { status: 'waiting' } }),
    ])
    res.json({
      ordersByStatus: Object.fromEntries(ordersByStatus.map((o) => [o.status, o._count])),
      revenueCents: revenue._sum.totalCents ?? 0,
      openQuoteRequests: openRequests,
      printers,
      productionWaiting: queueWaiting,
    })
  } catch (err) {
    next(err)
  }
})
