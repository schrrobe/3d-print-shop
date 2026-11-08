import { hasPermission, REVENUE_ORDER_STATUSES } from '@print-shop/utils'
import {
  printProviderSchema,
  providerAssignmentStatusSchema,
  providerAssignSchema,
  providerPayoutSchema,
} from '@print-shop/validators'
import { Router, type Request } from 'express'
import { z } from 'zod'
import { audit } from '../../lib/audit.js'
import { prisma } from '../../lib/prisma.js'
import { requirePermission } from '../../middleware/auth.js'
import { ApiError, badRequest, conflict, forbidden, notFound } from '../../middleware/error.js'
import {
  assignOrder,
  goodsValueCents,
  sendProviderOrder,
  setAssignmentStatus,
} from '../../services/providers.js'

export const adminProvidersRouter = Router()

const rangeSchema = z.object({ from: z.coerce.date(), to: z.coerce.date() })
/** Provider's work counts once reported done (Q13: independent of later refunds). */
const BILLABLE = ['completed', 'received'] as const

const canSeeAmounts = (req: Request) =>
  Boolean(req.user && hasPermission(req.user.role, 'providers:read'))

function parseRange(query: unknown) {
  const { from, to } = rangeSchema.parse(query)
  if (from >= to) throw badRequest('from muss vor to liegen')
  return { gte: from, lt: to }
}

/**
 * Providers with totals for assignments created in [from, to). Billable =
 * completed/received; shopRevenueCents is the same goods value over all paid
 * orders, so the UI can show the external share.
 */
adminProvidersRouter.get('/', requirePermission('providers:read'), async (req, res, next) => {
  try {
    const range = parseRange(req.query)
    const [providers, billable, open, shop] = await Promise.all([
      prisma.printProvider.findMany({ orderBy: [{ active: 'desc' }, { name: 'asc' }] }),
      prisma.providerAssignment.groupBy({
        by: ['providerId'],
        where: { status: { in: [...BILLABLE] }, createdAt: range },
        _count: { _all: true },
        _sum: { baseCents: true, payoutCents: true },
      }),
      prisma.providerAssignment.groupBy({
        by: ['providerId'],
        where: { status: { in: [...BILLABLE] }, paidOutAt: null },
        _sum: { payoutCents: true },
      }),
      prisma.order.aggregate({
        where: { status: { in: [...REVENUE_ORDER_STATUSES] }, createdAt: range },
        _sum: { subtotalCents: true, discountCents: true, prepaymentDiscountCents: true },
      }),
    ])
    res.json({
      shopRevenueCents: goodsValueCents({
        subtotalCents: shop._sum.subtotalCents ?? 0,
        discountCents: shop._sum.discountCents ?? 0,
        prepaymentDiscountCents: shop._sum.prepaymentDiscountCents ?? 0,
      }),
      providers: providers.map((p) => {
        const b = billable.find((r) => r.providerId === p.id)
        const baseCents = b?._sum.baseCents ?? 0
        const payoutCents = b?._sum.payoutCents ?? 0
        return {
          ...p,
          orders: b?._count._all ?? 0,
          baseCents,
          payoutCents,
          ownCents: baseCents - payoutCents,
          openPayoutCents: open.find((r) => r.providerId === p.id)?._sum.payoutCents ?? 0,
        }
      }),
    })
  } catch (err) {
    next(err)
  }
})

/** Active providers for the assign dialog; rates only for providers:read. */
adminProvidersRouter.get(
  '/options',
  requirePermission('provider-orders:write'),
  async (req, res, next) => {
    try {
      const providers = await prisma.printProvider.findMany({
        where: { active: true },
        orderBy: { name: 'asc' },
        select: { id: true, name: true, defaultRateBp: canSeeAmounts(req) },
      })
      res.json({ providers })
    } catch (err) {
      next(err)
    }
  },
)

adminProvidersRouter.get('/:id', requirePermission('providers:read'), async (req, res, next) => {
  try {
    const range = parseRange(req.query)
    const provider = await prisma.printProvider.findUnique({ where: { id: String(req.params.id) } })
    if (!provider) throw notFound('Anbieter nicht gefunden')
    const assignments = await prisma.providerAssignment.findMany({
      where: { providerId: provider.id, createdAt: range },
      include: { order: { select: { id: true, orderNumber: true, status: true } } },
      orderBy: { createdAt: 'desc' },
    })
    res.json({ provider, assignments })
  } catch (err) {
    next(err)
  }
})

adminProvidersRouter.post('/', requirePermission('providers:write'), async (req, res, next) => {
  try {
    const input = printProviderSchema.parse(req.body)
    const provider = await prisma.printProvider.create({ data: input })
    await audit(req, 'provider.create', { type: 'print_provider', id: provider.id }, input)
    res.status(201).json({ provider })
  } catch (err) {
    next(err)
  }
})

adminProvidersRouter.put('/:id', requirePermission('providers:write'), async (req, res, next) => {
  try {
    const input = printProviderSchema.parse(req.body)
    const existing = await prisma.printProvider.findUnique({ where: { id: String(req.params.id) } })
    if (!existing) throw notFound('Anbieter nicht gefunden')
    // Rate changes only affect future assignments: amounts are frozen per assignment.
    const provider = await prisma.printProvider.update({ where: { id: existing.id }, data: input })
    await audit(req, 'provider.update', { type: 'print_provider', id: provider.id }, input)
    res.json({ provider })
  } catch (err) {
    next(err)
  }
})

/** Marks every billable, not yet paid assignment of a provider as paid out. */
adminProvidersRouter.post(
  '/:id/payout',
  requirePermission('providers:write'),
  async (req, res, next) => {
    try {
      const providerId = String(req.params.id)
      const result = await prisma.providerAssignment.updateMany({
        where: { providerId, status: { in: [...BILLABLE] }, paidOutAt: null },
        data: { paidOutAt: new Date() },
      })
      await audit(
        req,
        'provider.payout_all',
        { type: 'print_provider', id: providerId },
        { count: result.count },
      )
      res.json({ count: result.count })
    } catch (err) {
      next(err)
    }
  },
)

// ---------- Assignments ----------

adminProvidersRouter.post(
  '/assign/:orderId',
  requirePermission('provider-orders:write'),
  async (req, res, next) => {
    try {
      const input = providerAssignSchema.parse(req.body)
      if (input.rateBp !== undefined && !hasPermission(req.user!.role, 'providers:write'))
        throw forbidden('Satz überschreiben nur für Admins')
      const orderId = String(req.params.orderId)
      const result = await assignOrder(orderId, input)
      await audit(
        req,
        'provider.assign',
        { type: 'order', id: orderId },
        {
          assignmentId: result.assignment.id,
          providerId: input.providerId,
          rateBp: result.assignment.rateBp,
          shareCustomerData: input.shareCustomerData,
          replacedAssignmentId: result.cancelledId,
          emailSent: result.emailSent,
        },
      )
      res.status(201).json({ assignmentId: result.assignment.id, emailSent: result.emailSent })
    } catch (err) {
      next(err)
    }
  },
)

adminProvidersRouter.post(
  '/assignments/:id/status',
  requirePermission('provider-orders:write'),
  async (req, res, next) => {
    try {
      const { status } = providerAssignmentStatusSchema.parse(req.body)
      const updated = await setAssignmentStatus(String(req.params.id), status)
      await audit(
        req,
        'provider.assignment_status',
        { type: 'provider_assignment', id: updated.id },
        { to: status, orderId: updated.orderId },
      )
      res.json({ ok: true })
    } catch (err) {
      next(err)
    }
  },
)

adminProvidersRouter.post(
  '/assignments/:id/resend',
  requirePermission('provider-orders:write'),
  async (req, res, next) => {
    try {
      const a = await prisma.providerAssignment.findUnique({ where: { id: String(req.params.id) } })
      if (!a) throw notFound('Auftrag nicht gefunden')
      if (a.status === 'cancelled') throw conflict('Auftrag ist storniert')
      const delivered = await sendProviderOrder(a.id)
      await audit(
        req,
        'provider.assignment_resend',
        { type: 'provider_assignment', id: a.id },
        {
          delivered,
        },
      )
      if (!delivered)
        throw new ApiError(502, 'E-Mail-Versand fehlgeschlagen (siehe E-Mail-Log)', 'email_failed')
      res.json({ ok: true })
    } catch (err) {
      next(err)
    }
  },
)

/** Manual payout correction and paid-out flag (admin). */
adminProvidersRouter.patch(
  '/assignments/:id',
  requirePermission('providers:write'),
  async (req, res, next) => {
    try {
      const input = providerPayoutSchema.parse(req.body)
      const a = await prisma.providerAssignment.findUnique({ where: { id: String(req.params.id) } })
      if (!a) throw notFound('Auftrag nicht gefunden')
      if (a.status === 'cancelled') throw conflict('Auftrag ist storniert')
      if (input.paidOut && !(BILLABLE as readonly string[]).includes(a.status))
        throw conflict('Auszahlung erst nach Fertigmeldung möglich')
      const updated = await prisma.providerAssignment.update({
        where: { id: a.id },
        data: {
          ...(input.payoutCents !== undefined ? { payoutCents: input.payoutCents } : {}),
          ...(input.paidOut !== undefined
            ? { paidOutAt: input.paidOut ? (a.paidOutAt ?? new Date()) : null }
            : {}),
        },
      })
      await audit(
        req,
        'provider.assignment_update',
        { type: 'provider_assignment', id: a.id },
        {
          ...input,
          previousPayoutCents: a.payoutCents,
        },
      )
      res.json({ assignment: updated })
    } catch (err) {
      next(err)
    }
  },
)
