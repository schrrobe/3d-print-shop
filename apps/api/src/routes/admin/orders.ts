import { ORDER_STATUSES } from '@print-shop/types'
import { assertOrderTransition, REVENUE_ORDER_STATUSES } from '@print-shop/utils'
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
} from '../../services/order-flow.js'
import { sendReviewRequestEmail } from '../../services/reviews.js'
import { emitCancel, emitRefund } from '../../services/tracking/events.js'
import { nextShipmentNumber, shipShipment } from '../../services/shipment-flow.js'

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
        tickets: { select: { id: true, ticketNumber: true, status: true, subject: true } },
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
    // Automatic review request on completion (EmailLog dedupe inside the service)
    if (status === 'completed') await sendReviewRequestEmail(order.id)
    // Conversion tracking — best-effort, must never break the status change.
    try {
      if (status === 'refunded') await emitRefund(prisma, order)
      else if (status === 'cancelled' && (REVENUE_ORDER_STATUSES as readonly string[]).includes(order.status))
        await emitCancel(prisma, order)
    } catch (err) {
      console.error('[tracking] refund/cancel emit failed:', err)
    }
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

/**
 * Shipping (legacy route, kept for compatibility): carrier + tracking, mark as
 * shipped. Thin wrapper over the shipment flow — creates an implicit shipment
 * covering all order items (status packed, event note "legacy-route") when no
 * packed shipment exists, then ships it. shipShipment() is the single writer
 * for Order.carrier/trackingNumber/shippedAt.
 */
adminOrdersRouter.post('/:id/shipping', requirePermission('orders:ship'), async (req, res, next) => {
  try {
    const input = shippingUpdateSchema.parse(req.body)
    const order = await prisma.order.findUnique({
      where: { id: String(req.params.id) },
      include: { items: true, shipments: true },
    })
    if (!order) throw notFound('Order not found')
    assertOrderTransition(order.status, 'shipped')

    let shipment = order.shipments.find((s) => s.status === 'packed')
    if (!shipment) {
      const shipmentNumber = await nextShipmentNumber()
      shipment = await prisma.$transaction(async (tx) => {
        const created = await tx.shipment.create({
          data: {
            shipmentNumber,
            orderId: order.id,
            status: 'packed',
            packedAt: new Date(),
            createdById: req.user?.id ?? null,
            items: {
              create: order.items.map((item) => ({ orderItemId: item.id, quantity: item.quantity })),
            },
          },
        })
        await tx.shipmentStatusEvent.create({
          data: {
            shipmentId: created.id,
            fromStatus: null,
            toStatus: 'packed',
            byUserId: req.user?.id ?? null,
            note: 'legacy-route',
          },
        })
        return created
      })
    }

    await shipShipment({
      shipmentId: shipment.id,
      carrier: input.carrier,
      trackingNumber: input.trackingNumber,
      byUserId: req.user?.id,
      eventNote: 'legacy-route',
    })
    const updated = await prisma.order.findUniqueOrThrow({ where: { id: order.id } })
    await audit(req, 'order.shipped', { type: 'order', id: order.id }, input)
    res.json({ order: updated })
  } catch (err) {
    next(err)
  }
})

/** Manual review request (deduped against the automatic trigger via EmailLog). */
adminOrdersRouter.post('/:id/review-request', requirePermission('orders:write'), async (req, res, next) => {
  try {
    const order = await prisma.order.findUnique({ where: { id: String(req.params.id) } })
    if (!order) throw notFound('Order not found')
    const result = await sendReviewRequestEmail(order.id)
    await audit(req, 'order.review_request', { type: 'order', id: order.id }, result)
    res.json(result)
  } catch (err) {
    next(err)
  }
})
