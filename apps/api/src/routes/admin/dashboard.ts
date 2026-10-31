import { Router } from 'express'
import type { OrderStatus } from '@prisma/client'
import { prisma } from '../../lib/prisma.js'
import { requirePermission } from '../../middleware/auth.js'
import { buyerLocations } from '../../services/buyer-locations.js'

export const adminDashboardRouter = Router()

const PAID: OrderStatus[] = ['paid', 'in_production', 'quality_check', 'ready_to_ship', 'shipped', 'completed']

adminDashboardRouter.get('/', requirePermission('dashboard:read'), async (_req, res, next) => {
  try {
    const [ordersByStatus, revenue, openRequests, printers, queueWaiting, paidAddresses, paymentsByMethod, openTickets] = await Promise.all([
      prisma.order.groupBy({ by: ['status'], _count: true }),
      prisma.order.aggregate({ _sum: { totalCents: true }, where: { status: { in: PAID } } }),
      prisma.quoteRequest.count({ where: { status: { in: ['new', 'in_review'] } } }),
      prisma.printer.findMany({ select: { id: true, name: true, status: true } }),
      prisma.printerJob.count({ where: { status: 'waiting' } }),
      prisma.order.findMany({ where: { status: { in: PAID } }, select: { country: true, zip: true } }),
      prisma.payment.groupBy({ by: ['method'], _count: true, _sum: { amountCents: true }, where: { status: 'paid' } }),
      prisma.ticket.count({ where: { status: { in: ['open', 'in_progress', 'waiting_customer'] } } }),
    ])
    res.json({
      ordersByStatus: Object.fromEntries(ordersByStatus.map((o) => [o.status, o._count])),
      revenueCents: revenue._sum.totalCents ?? 0,
      openQuoteRequests: openRequests,
      openTickets,
      printers,
      productionWaiting: queueWaiting,
      buyerLocations: buyerLocations(paidAddresses),
      paymentMethods: paymentsByMethod
        .map((p) => ({ method: p.method, count: p._count, amountCents: p._sum.amountCents ?? 0 }))
        .sort((a, b) => b.count - a.count),
    })
  } catch (err) {
    next(err)
  }
})
