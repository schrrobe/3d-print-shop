import { ORDER_STATUSES } from '@print-shop/types'
import { assertOrderTransition } from '@print-shop/utils'
import { markPaidSchema, shippingUpdateSchema } from '@print-shop/validators'
import { Router } from 'express'
import { z } from 'zod'
import { audit } from '../../lib/audit.js'
import { prisma } from '../../lib/prisma.js'
import { requirePermission } from '../../middleware/auth.js'
import { badRequest, notFound } from '../../middleware/error.js'
import {
  markOrderPaid,
  notifyProductionStarted,
  notifyShipped,
} from '../../services/order-flow.js'

export const adminOrdersRouter = Router()

adminOrdersRouter.get('/', requirePermission('orders:read'), async (req, res, next) => {
  try {
    const status = req.query.status ? String(req.query.status) : undefined
    const orders = await prisma.order.findMany({
      where: status ? { status: status as never } : undefined,
      include: { items: true, payments: true, invoice: { select: { number: true } } },
      orderBy: { createdAt: 'desc' },
      take: 200,
    })
    res.json({ orders })
  } catch (err) {
    next(err)
  }
})

adminOrdersRouter.get('/:id', requirePermission('orders:read'), async (req, res, next) => {
  try {
    const order = await prisma.order.findUnique({
      where: { id: String(req.params.id) },
      include: {
        items: true,
        payments: { include: { bitcoinPayment: true } },
        invoice: true,
        printerJobs: { include: { printer: true } },
      },
    })
    if (!order) throw notFound('Order not found')
    res.json({
      order: {
        ...order,
        payments: order.payments.map((p) => ({
          ...p,
          bitcoinPayment: p.bitcoinPayment
            ? {
                ...p.bitcoinPayment,
                expectedSats: Number(p.bitcoinPayment.expectedSats),
                receivedSats: Number(p.bitcoinPayment.receivedSats),
              }
            : null,
        })),
      },
    })
  } catch (err) {
    next(err)
  }
})

const statusSchema = z.object({ status: z.enum(ORDER_STATUSES) })

/** Generic status transition (validated against the status machine). */
adminOrdersRouter.post('/:id/status', requirePermission('orders:write'), async (req, res, next) => {
  try {
    const { status } = statusSchema.parse(req.body)
    const order = await prisma.order.findUnique({ where: { id: String(req.params.id) } })
    if (!order) throw notFound('Order not found')
    assertOrderTransition(order.status, status)
    const updated = await prisma.order.update({ where: { id: order.id }, data: { status } })
    if (status === 'in_production') await notifyProductionStarted(order.id)
    await audit(req, 'order.status', { type: 'order', id: order.id }, { from: order.status, to: status })
    res.json({ order: updated })
  } catch (err) {
    next(err)
  }
})

/** Bank transfer: manually mark as paid (payments:write). */
adminOrdersRouter.post('/:id/mark-paid', requirePermission('payments:write'), async (req, res, next) => {
  try {
    const { reference } = markPaidSchema.parse(req.body ?? {})
    const order = await prisma.order.findUnique({
      where: { id: String(req.params.id) },
      include: { payments: true },
    })
    if (!order) throw notFound('Order not found')
    const payment = order.payments.find((p) => p.status === 'pending')
    if (!payment) throw badRequest('No pending payment on this order')
    if (reference) {
      await prisma.payment.update({ where: { id: payment.id }, data: { reference } })
    }
    await markOrderPaid(order.id, payment.id)
    await audit(req, 'order.mark_paid', { type: 'order', id: order.id }, { reference })
    res.json({ ok: true })
  } catch (err) {
    next(err)
  }
})

/** Shipping: set carrier + tracking and mark as shipped (orders:ship). */
adminOrdersRouter.post('/:id/shipping', requirePermission('orders:ship'), async (req, res, next) => {
  try {
    const input = shippingUpdateSchema.parse(req.body)
    const order = await prisma.order.findUnique({ where: { id: String(req.params.id) } })
    if (!order) throw notFound('Order not found')
    assertOrderTransition(order.status, 'shipped')
    const updated = await prisma.order.update({
      where: { id: order.id },
      data: {
        carrier: input.carrier,
        trackingNumber: input.trackingNumber,
        status: 'shipped',
        shippedAt: new Date(),
      },
    })
    await notifyShipped(order.id)
    await audit(req, 'order.shipped', { type: 'order', id: order.id }, input)
    res.json({ order: updated })
  } catch (err) {
    next(err)
  }
})
