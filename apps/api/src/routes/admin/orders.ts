import { renderPaymentLink } from '@print-shop/emails'
import { ORDER_STATUSES } from '@print-shop/types'
import { assertOrderTransition, REVENUE_ORDER_STATUSES, TERMS_PATH } from '@print-shop/utils'
import {
  adminOrderCreateSchema,
  markPaidSchema,
  shippingUpdateSchema,
} from '@print-shop/validators'
import { Router } from 'express'
import { z } from 'zod'
import { env } from '../../env.js'
import { audit } from '../../lib/audit.js'
import { prisma } from '../../lib/prisma.js'
import { generateOrderNumber, randomToken } from '../../lib/tokens.js'
import { requirePermission } from '../../middleware/auth.js'
import { ApiError, badRequest, conflict, notFound } from '../../middleware/error.js'
import { assertCompanyComplete } from '../../services/company.js'
import { sendEmail } from '../../services/email.js'
import {
  issuePrepaymentInvoice,
  legalCompany,
  markOrderPaid,
  notifyProductionStarted,
  orderEmailData,
  orderUrl,
  resendInvoice,
  sendOrderConfirmation,
  sendPaymentReminder,
} from '../../services/order-flow.js'
import { itemColorResolver } from '../../services/item-colors.js'
import {
  closeStripeCheckoutSession,
  deactivateStripePaymentLink,
} from '../../services/payments/stripe.js'
import { sendReviewRequestEmail } from '../../services/reviews.js'
import { nextShipmentNumber, shipShipment } from '../../services/shipment-flow.js'

export const adminOrdersRouter = Router()

/**
 * Kept out of every admin order response:
 * - checkout-time IP/cookies exist only for the purchase CAPI hand-off — never shown in admin;
 * - commission data is sales-channels:read only (admin).
 */
const ORDER_OMIT = {
  trackingAttribution: true,
  salesChannelId: true,
  commissionBaseCents: true,
  commissionCents: true,
} as const

adminOrdersRouter.get('/', requirePermission('orders:read'), async (req, res, next) => {
  try {
    const status = req.query.status ? String(req.query.status) : undefined
    const source = req.query.source ? String(req.query.source) : undefined
    const orders = await prisma.order.findMany({
      where: {
        ...(status ? { status: status as never } : {}),
        ...(source ? { source: source as never } : {}),
      },
      include: { items: true, payments: true, invoice: { select: { number: true } } },
      omit: ORDER_OMIT,
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
      omit: ORDER_OMIT,
      include: {
        items: true,
        payments: { include: { bitcoinPayment: true } },
        invoice: true,
        printerJobs: { include: { printer: true } },
        tickets: { select: { id: true, ticketNumber: true, status: true, subject: true } },
      },
    })
    if (!order) throw notFound('Order not found')
    const colorsOf = await itemColorResolver(order.items)
    res.json({
      order: {
        ...order,
        items: order.items.map((item) => ({ ...item, colors: colorsOf(item) })),
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

/**
 * Admin-Bestellung: order with free items (e.g. a caliber the shop does not list),
 * paid online via the Zahlungslink to our order page (card, or PayPal there) or
 * Vorkasse. Payment, invoice and production then run through the regular order flow.
 */
adminOrdersRouter.post('/', requirePermission('orders:write'), async (req, res, next) => {
  try {
    const input = adminOrderCreateSchema.parse(req.body)
    assertCompanyComplete()
    const productIds = [...new Set(input.items.flatMap((i) => (i.productId ? [i.productId] : [])))]
    if (productIds.length > 0) {
      const found = await prisma.product.count({ where: { id: { in: productIds } } })
      if (found !== productIds.length) throw badRequest('Unknown product')
    }

    const subtotalCents = input.items.reduce((sum, i) => sum + i.unitPriceCents * i.quantity, 0)
    const totalCents = subtotalCents + input.shippingCents
    const orderNumber = generateOrderNumber()
    const accessToken = randomToken()
    const { address } = input
    // Online: no Stripe object yet; the order page starts card or PayPal (ADR 0002).
    const online = input.paymentMethod === 'online'
    const order = await prisma.order.create({
      data: {
        orderNumber,
        accessToken,
        source: 'admin',
        status: online ? 'awaiting_payment' : 'awaiting_bank_transfer',
        locale: input.locale,
        email: address.email,
        firstName: address.firstName,
        lastName: address.lastName,
        company: address.company,
        street: address.street,
        zip: address.zip,
        city: address.city,
        country: address.country,
        phone: address.phone,
        note: input.note,
        subtotalCents,
        shippingCents: input.shippingCents,
        totalCents,
        items: { create: input.items },
        payments: {
          create: {
            method: online ? 'stripe' : 'bank_transfer',
            status: 'pending',
            amountCents: totalCents,
            reference: online ? null : orderNumber,
          },
        },
      },
      include: { items: true },
    })

    let emailSent: boolean
    if (online) {
      emailSent = await sendEmail(
        order.email,
        'payment_link',
        renderPaymentLink(
          {
            ...orderEmailData(order),
            shippingCents: order.shippingCents,
            paymentUrl: orderUrl(order),
            termsUrl: `${env.WEB_URL}${TERMS_PATH}`,
            legal: legalCompany(),
          },
          order.locale,
        ),
      )
    } else {
      // The order stands even if the invoice fails; the admin sees emailSent=false and follows up.
      try {
        await issuePrepaymentInvoice(order.id)
        emailSent = true
      } catch (err) {
        console.error(`[invoice] prepayment invoice failed for ${order.orderNumber}:`, err)
        emailSent = false
      }
    }

    await audit(
      req,
      'order.create_admin',
      { type: 'order', id: order.id },
      { paymentMethod: input.paymentMethod, totalCents },
    )
    res.status(201).json({
      order: { id: order.id, orderNumber: order.orderNumber },
      paymentUrl: online ? orderUrl(order) : null,
      emailSent,
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
    const order = await prisma.order.findUnique({
      where: { id: String(req.params.id) },
      include: { payments: true },
    })
    if (!order) throw notFound('Order not found')
    // Money goes back only through a Refund (routes/admin/refunds.ts), which sets `refunded`.
    if (status === 'refunded') {
      throw conflict('„Erstattet“ lässt sich nicht manuell setzen – bitte die Erstattung nutzen')
    }
    if (
      status === 'cancelled' &&
      (REVENUE_ORDER_STATUSES as readonly string[]).includes(order.status)
    ) {
      throw conflict('Bezahlte Bestellungen bitte über „Stornieren & erstatten“ stornieren')
    }
    assertOrderTransition(order.status, status)
    if (status === 'cancelled') {
      // An open checkout session / legacy payment link must stop taking money first.
      for (const p of order.payments) {
        if (p.status !== 'pending' || !p.stripeSessionId) continue
        if (p.method === 'stripe') {
          if (!(await closeStripeCheckoutSession(p.stripeSessionId))) {
            throw conflict('Die Zahlung wurde gerade abgeschlossen')
          }
        } else if (p.method === 'stripe_payment_link')
          await deactivateStripePaymentLink(p.stripeSessionId)
        else continue
        await prisma.payment.updateMany({
          where: { id: p.id, status: 'pending' },
          data: { status: 'expired' },
        })
      }
    }
    // Conditional write: a webhook may have marked the order paid meanwhile.
    const changed = await prisma.order.updateMany({
      where: { id: order.id, status: order.status },
      data: { status },
    })
    if (changed.count !== 1) throw conflict('Die Bestellung wurde zwischenzeitlich geändert')
    const updated = await prisma.order.findUniqueOrThrow({
      where: { id: order.id },
      omit: ORDER_OMIT,
    })
    if (status === 'in_production') await notifyProductionStarted(order.id)
    // Automatic review request on completion (EmailLog dedupe inside the service)
    if (status === 'completed') await sendReviewRequestEmail(order.id)
    await audit(
      req,
      'order.status',
      { type: 'order', id: order.id },
      { from: order.status, to: status },
    )
    res.json({ order: updated })
  } catch (err) {
    next(err)
  }
})

/** Bank transfer: manually mark as paid (payments:write). */
adminOrdersRouter.post(
  '/:id/mark-paid',
  requirePermission('payments:write'),
  async (req, res, next) => {
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
  },
)

/**
 * Shipping (legacy route, kept for compatibility): carrier + tracking, mark as
 * shipped. Thin wrapper over the shipment flow — creates an implicit shipment
 * covering all order items (status packed, event note "legacy-route") when no
 * packed shipment exists, then ships it. shipShipment() is the single writer
 * for Order.carrier/trackingNumber/shippedAt.
 */
adminOrdersRouter.post(
  '/:id/shipping',
  requirePermission('orders:ship'),
  async (req, res, next) => {
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
                create: order.items.map((item) => ({
                  orderItemId: item.id,
                  quantity: item.quantity,
                })),
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
      const updated = await prisma.order.findUniqueOrThrow({
        where: { id: order.id },
        omit: ORDER_OMIT,
      })
      await audit(req, 'order.shipped', { type: 'order', id: order.id }, input)
      res.json({ order: updated })
    } catch (err) {
      next(err)
    }
  },
)

/** Re-sends the invoice email to the customer (e.g. after an SMTP failure). */
adminOrdersRouter.post(
  '/:id/invoice/resend',
  requirePermission('orders:write'),
  async (req, res, next) => {
    try {
      const order = await prisma.order.findUnique({ where: { id: String(req.params.id) } })
      if (!order) throw notFound('Order not found')
      const result = await resendInvoice(order.id)
      await audit(req, 'order.invoice_resend', { type: 'order', id: order.id }, { result })
      if (result === 'no_invoice') throw badRequest('Zu dieser Bestellung gibt es keine Rechnung')
      if (result === 'busy') throw conflict('Die Rechnung wird gerade versendet')
      if (result === 'failed') {
        throw new ApiError(502, 'E-Mail-Versand fehlgeschlagen (siehe E-Mail-Log)', 'email_failed')
      }
      res.json({ ok: true })
    } catch (err) {
      next(err)
    }
  },
)

/** Re-sends the order confirmation email to the customer (e.g. after an SMTP failure). */
adminOrdersRouter.post(
  '/:id/confirmation/resend',
  requirePermission('orders:write'),
  async (req, res, next) => {
    try {
      const order = await prisma.order.findUnique({ where: { id: String(req.params.id) } })
      if (!order) throw notFound('Order not found')
      const delivered = await sendOrderConfirmation(order.id)
      await audit(req, 'order.confirmation_resend', { type: 'order', id: order.id }, { delivered })
      if (!delivered) {
        throw new ApiError(502, 'E-Mail-Versand fehlgeschlagen (siehe E-Mail-Log)', 'email_failed')
      }
      res.json({ ok: true })
    } catch (err) {
      next(err)
    }
  },
)

/** Re-sends the payment link (order page with "Pay now") for an unpaid order. */
adminOrdersRouter.post(
  '/:id/payment-link/resend',
  requirePermission('orders:write'),
  async (req, res, next) => {
    try {
      const order = await prisma.order.findUnique({ where: { id: String(req.params.id) } })
      if (!order) throw notFound('Order not found')
      const result = await sendPaymentReminder(order.id)
      if (result === 'not_awaiting_payment') {
        throw conflict('Die Bestellung wartet nicht auf eine Zahlung')
      }
      await audit(req, 'order.payment_link_resend', { type: 'order', id: order.id }, { result })
      if (result === 'failed') {
        throw new ApiError(502, 'E-Mail-Versand fehlgeschlagen (siehe E-Mail-Log)', 'email_failed')
      }
      res.json({ ok: true })
    } catch (err) {
      next(err)
    }
  },
)

/** Manual review request (deduped against the automatic trigger via EmailLog). */
adminOrdersRouter.post(
  '/:id/review-request',
  requirePermission('orders:write'),
  async (req, res, next) => {
    try {
      const order = await prisma.order.findUnique({ where: { id: String(req.params.id) } })
      if (!order) throw notFound('Order not found')
      const result = await sendReviewRequestEmail(order.id)
      await audit(req, 'order.review_request', { type: 'order', id: order.id }, result)
      res.json(result)
    } catch (err) {
      next(err)
    }
  },
)
