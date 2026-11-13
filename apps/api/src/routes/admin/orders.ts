import { renderPaymentLink } from '@print-shop/emails'
import { ORDER_STATUSES, PART_EDITABLE_STATUSES, PART_STATUSES } from '@print-shop/types'
import {
  assertOrderTransition,
  hasPermission,
  REVENUE_ORDER_STATUSES,
  TERMS_PATH,
} from '@print-shop/utils'
import {
  adminOrderCreateSchema,
  dhlLabelSchema,
  markPaidSchema,
  orderUpdateSchema,
  shippingUpdateSchema,
} from '@print-shop/validators'
import path from 'node:path'
import { Prisma } from '@prisma/client'
import { Router } from 'express'
import { z } from 'zod'
import { env } from '../../env.js'
import { audit } from '../../lib/audit.js'
import { prisma } from '../../lib/prisma.js'
import { generateOrderNumber, randomToken } from '../../lib/tokens.js'
import { requirePermission } from '../../middleware/auth.js'
import { ApiError, badRequest, conflict, forbidden, notFound } from '../../middleware/error.js'
import { assertCompanyComplete } from '../../services/company.js'
import { sendEmail } from '../../services/email.js'
import {
  issuePrepaymentInvoice,
  legalCompany,
  markOrderPaid,
  notifyProductionStarted,
  orderEmailData,
  resendInvoice,
  sendOrderConfirmation,
  sendPaymentReminder,
} from '../../services/order-flow.js'
import { itemColorResolver } from '../../services/item-colors.js'
import { itemParts } from '../../services/order-dto.js'
import {
  createStripePaymentLink,
  deactivateStripePaymentLink,
} from '../../services/payments/stripe.js'
import { cancelOpenAssignment, isHeldExternally } from '../../services/providers.js'
import { sendReviewRequestEmail } from '../../services/reviews.js'
import { emitCancel, emitRefund } from '../../services/tracking/events.js'
import {
  cancelOrderDhlLabel,
  createOrderDhlLabel,
  hasActiveLabel,
  packedShipmentFor,
  shipShipment,
  withoutActiveLabel,
} from '../../services/shipment-flow.js'

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
  // Globally omitted (lib/prisma.ts) — admin responses opt back in.
  internalNote: false,
} as const

adminOrdersRouter.get('/', requirePermission('orders:read'), async (req, res, next) => {
  try {
    const status = req.query.status ? String(req.query.status) : undefined
    const source = req.query.source ? String(req.query.source) : undefined
    // fulfillment: internal | external | <providerId>
    const fulfillment = req.query.fulfillment ? String(req.query.fulfillment) : undefined
    const live = { status: { not: 'cancelled' as const } }
    const orders = await prisma.order.findMany({
      where: {
        ...(status ? { status: status as never } : {}),
        ...(source ? { source: source as never } : {}),
        ...(fulfillment === 'internal' ? { providerAssignments: { none: live } } : {}),
        ...(fulfillment === 'external' ? { providerAssignments: { some: live } } : {}),
        ...(fulfillment && !['internal', 'external'].includes(fulfillment)
          ? { providerAssignments: { some: { ...live, providerId: fulfillment } } }
          : {}),
      },
      include: {
        items: true,
        payments: true,
        invoice: { select: { number: true } },
        providerAssignments: {
          where: live,
          select: { status: true, provider: { select: { id: true, name: true } } },
        },
      },
      // List never shows the note — keep up to 200 × 4000 chars off the wire.
      omit: { ...ORDER_OMIT, internalNote: true },
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
        providerAssignments: {
          include: { provider: { select: { id: true, name: true } } },
          orderBy: { createdAt: 'desc' },
        },
        shipments: {
          select: {
            status: true,
            trackingNumber: true,
            weightGrams: true,
            labelPdfPath: true,
            shippedAt: true,
          },
          orderBy: { updatedAt: 'desc' },
        },
      },
    })
    if (!order) throw notFound('Order not found')
    const { shipments, ...orderFields } = order
    const labelled = shipments.find((s) => s.labelPdfPath)
    const packed = shipments.find((s) => s.status === 'packed')
    const colorsOf = await itemColorResolver(order.items)
    // Rates and payouts are admin-only (providers:read); production sees provider + status.
    const showAmounts = hasPermission(req.user!.role, 'providers:read')
    res.json({
      order: {
        ...orderFields,
        // Latest DHL label (server path stays server-side); active = cancellable.
        dhlLabel: labelled
          ? { trackingNumber: labelled.trackingNumber, active: hasActiveLabel(labelled) }
          : null,
        packedWeightGrams: packed?.weightGrams ?? null,
        providerAssignments: order.providerAssignments.map(
          ({ rateBp, baseCents, payoutCents, paidOutAt, ...a }) =>
            showAmounts ? { ...a, rateBp, baseCents, payoutCents, paidOutAt } : a,
        ),
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
 * Admin paylink: order with free items (e.g. a caliber the shop does not list),
 * paid via a single-use Stripe payment link or Vorkasse. Payment, invoice and
 * production then run through the regular order flow.
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
    const link =
      input.paymentMethod === 'stripe_payment_link'
        ? await createStripePaymentLink({
            orderNumber,
            accessToken,
            amountCents: totalCents,
            email: address.email,
            locale: input.locale,
            description: `Bestellung ${orderNumber}`,
          })
        : null

    let order
    try {
      order = await prisma.order.create({
        data: {
          orderNumber,
          accessToken,
          source: 'admin',
          status: link ? 'awaiting_payment' : 'awaiting_bank_transfer',
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
              method: input.paymentMethod,
              status: 'pending',
              amountCents: totalCents,
              stripeSessionId: link?.sessionId,
              stripePaymentLinkUrl: link?.url,
              reference: link ? null : orderNumber,
            },
          },
        },
        include: { items: true },
      })
    } catch (err) {
      // Never leave a payable link behind for an order that does not exist.
      if (link) await deactivateStripePaymentLink(link.sessionId).catch(() => undefined)
      throw err
    }

    let emailSent: boolean
    if (link) {
      emailSent = await sendEmail(
        order.email,
        'payment_link',
        renderPaymentLink(
          {
            ...orderEmailData(order),
            shippingCents: order.shippingCents,
            paymentUrl: link.url,
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
      paymentUrl: link?.url ?? null,
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
      include: { payments: true, shipments: true },
    })
    if (!order) throw notFound('Order not found')
    // `shipped` goes through the shipping action (tracking number, jobs, email).
    if (status === 'shipped') throw conflict('Versand nur über die Sendungsnummer')
    assertOrderTransition(order.status, status)
    // A paid, unused DHL label would otherwise stay active at DHL (re-checked under the lock below).
    const endsOrder = status === 'cancelled' || status === 'refunded'
    const labelConflict = 'DHL-Label zuerst stornieren'
    if (endsOrder && order.shipments.some(hasActiveLabel)) throw conflict(labelConflict)
    // Production progress of an externally held order follows the provider lifecycle.
    if (['quality_check', 'ready_to_ship'].includes(status) && (await isHeldExternally(order.id)))
      throw conflict('Externer Auftrag zuerst als fertig gemeldet / eingegangen markieren')
    if (status === 'cancelled') {
      // An open payment link must stop taking money before the order is cancelled.
      for (const p of order.payments) {
        if (p.method !== 'stripe_payment_link' || p.status !== 'pending' || !p.stripeSessionId)
          continue
        await deactivateStripePaymentLink(p.stripeSessionId)
        await prisma.payment.updateMany({
          where: { id: p.id, status: 'pending' },
          data: { status: 'expired' },
        })
      }
    }
    // Conditional write: a webhook may have marked the order paid meanwhile.
    const write = (db: Prisma.TransactionClient) =>
      db.order.updateMany({ where: { id: order.id, status: order.status }, data: { status } })
    const changed = endsOrder
      ? await withoutActiveLabel(order.id, labelConflict, write)
      : await write(prisma)
    if (changed.count !== 1) throw conflict('Die Bestellung wurde zwischenzeitlich geändert')
    const updated = await prisma.order.findUniqueOrThrow({
      where: { id: order.id },
      omit: ORDER_OMIT,
    })
    if (status === 'in_production') await notifyProductionStarted(order.id)
    // An open external assignment stops with the order (provider gets a cancellation mail).
    let providerCancel: Awaited<ReturnType<typeof cancelOpenAssignment>> = null
    if (status === 'cancelled' || status === 'refunded')
      providerCancel = await cancelOpenAssignment(order.id)
    // Automatic review request on completion (EmailLog dedupe inside the service)
    if (status === 'completed') await sendReviewRequestEmail(order.id)
    // Conversion tracking — best-effort, must never break the status change.
    try {
      if (status === 'refunded') await emitRefund(prisma, order)
      else if (
        status === 'cancelled' &&
        (REVENUE_ORDER_STATUSES as readonly string[]).includes(order.status)
      )
        await emitCancel(prisma, order)
    } catch (err) {
      console.error('[tracking] refund/cancel emit failed:', err)
    }
    await audit(
      req,
      'order.status',
      { type: 'order', id: order.id },
      {
        from: order.status,
        to: status,
        ...(providerCancel
          ? {
              cancelledAssignmentId: providerCancel.assignment.id,
              cancelEmailSent: providerCancel.cancelEmailSent,
            }
          : {}),
      },
    )
    res.json({ order: updated, providerCancelEmailSent: providerCancel?.cancelEmailSent ?? null })
  } catch (err) {
    next(err)
  }
})

/**
 * Order detail edits: staff-only note (orders:write) and tracking link
 * (orders:ship — may be added after shipping, no new shipping email).
 */
adminOrdersRouter.patch('/:id', requirePermission('orders:read'), async (req, res, next) => {
  try {
    const input = orderUpdateSchema.parse(req.body)
    if (Object.keys(input).length === 0) throw badRequest('Nothing to update')
    if (input.internalNote !== undefined && !hasPermission(req.user!.role, 'orders:write'))
      throw forbidden()
    if (input.trackingUrl !== undefined && !hasPermission(req.user!.role, 'orders:ship'))
      throw forbidden()
    if (input.deliveryAddress !== undefined && !hasPermission(req.user!.role, 'orders:write'))
      throw forbidden()
    const existing = await prisma.order.findUnique({
      where: { id: String(req.params.id) },
      select: { trackingNumber: true, shippedAt: true },
    })
    if (!existing) throw notFound('Order not found')
    if (input.trackingUrl && !existing.trackingNumber)
      throw badRequest('Tracking-Link erst nach dem Versand mit Sendungsnummer')
    const shippedConflict = conflict('Lieferadresse nach dem Versand nicht mehr änderbar')
    if (input.deliveryAddress !== undefined && existing.shippedAt) throw shippedConflict
    // shippedAt: null in the write itself — shipShipment() may commit between the read and here.
    const write = (db: Prisma.TransactionClient) =>
      db.order.updateMany({
        where: {
          id: String(req.params.id),
          ...(input.deliveryAddress !== undefined ? { shippedAt: null } : {}),
        },
        data: {
          internalNote: input.internalNote === undefined ? undefined : input.internalNote || null,
          trackingUrl: input.trackingUrl === undefined ? undefined : input.trackingUrl || null,
          deliveryAddress:
            input.deliveryAddress === undefined
              ? undefined
              : input.deliveryAddress === null
                ? Prisma.DbNull
                : { ...input.deliveryAddress, company: input.deliveryAddress.company || null },
        },
      })
    // The active DHL label is printed with the old address.
    const { count } =
      input.deliveryAddress !== undefined
        ? await withoutActiveLabel(
            String(req.params.id),
            'DHL-Label zuerst stornieren, dann die Lieferadresse ändern',
            write,
          )
        : await write(prisma)
    if (count === 0) throw shippedConflict
    const order = await prisma.order.findUniqueOrThrow({
      where: { id: String(req.params.id) },
      omit: ORDER_OMIT,
    })
    // Field names only — the note may hold personal data, the audit log must not.
    const fields = Object.keys(input)
    await audit(req, 'order.update', { type: 'order', id: order.id }, { fields })
    res.json({ order })
  } catch (err) {
    next(err)
  }
})

const partStatus = z.enum(PART_STATUSES).optional()
const partsSchema = z
  .object({ housing: partStatus, insert: partStatus, lid: partStatus })
  .strict()
  .refine((v) => Object.values(v).some(Boolean), 'Nothing to update')

/**
 * Fertigungsstand der Bauteile einer Position. The first part leaving `open`
 * moves a paid order to in_production, which sends the production-started mail once.
 */
adminOrdersRouter.patch(
  '/:id/items/:itemId/parts',
  requirePermission('print-jobs:write'),
  async (req, res, next) => {
    try {
      const input = partsSchema.parse(req.body)
      const item = await prisma.orderItem.findFirst({
        where: { id: String(req.params.itemId), orderId: String(req.params.id) },
        include: { order: { select: { id: true, status: true } } },
      })
      if (!item) throw notFound('Order item not found')
      if (!item.productId) throw conflict('Bauteile gibt es nur bei Shop-Produkten')
      if (!PART_EDITABLE_STATUSES.includes(item.order.status))
        throw conflict('Bauteile nur zwischen Zahlung und Versand änderbar')
      const updated = await prisma.orderItem.update({
        where: { id: item.id },
        data: { housingStatus: input.housing, insertStatus: input.insert, lidStatus: input.lid },
      })
      let productionStarted = false
      if (item.order.status === 'paid' && Object.values(input).some((s) => s !== 'open')) {
        // Conditional: the manual status action or a provider handout may win the race.
        const { count } = await prisma.order.updateMany({
          where: { id: item.order.id, status: 'paid' },
          data: { status: 'in_production' },
        })
        productionStarted = count === 1
        // Post-commit side effect must not turn the committed change into an error response.
        if (productionStarted) {
          try {
            await notifyProductionStarted(item.order.id)
          } catch (err) {
            console.error(`[parts] production_started mail failed for ${item.order.id}:`, err)
          }
        }
      }
      await audit(
        req,
        'order.item_parts',
        { type: 'order', id: item.order.id },
        { itemId: item.id, ...input },
      )
      res.json({ parts: itemParts(updated), productionStarted })
    } catch (err) {
      next(err)
    }
  },
)

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

      const shipment = await packedShipmentFor(order, {
        byUserId: req.user?.id,
        note: 'legacy-route',
      })

      await shipShipment({
        shipmentId: shipment.id,
        carrier: input.carrier,
        trackingNumber: input.trackingNumber,
        trackingUrl: input.trackingUrl,
        byUserId: req.user?.id,
        eventNote: 'legacy-route',
        closeAllJobs: true,
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

/** DHL label for the whole order; the ship form then confirms with its shipment number. */
adminOrdersRouter.post(
  '/:id/dhl-label',
  requirePermission('orders:ship'),
  async (req, res, next) => {
    try {
      const input = dhlLabelSchema.parse(req.body)
      const { shipment, warnings } = await createOrderDhlLabel({
        orderId: String(req.params.id),
        weightGrams: input.weightGrams,
        byUserId: req.user?.id,
      })
      await audit(
        req,
        'order.dhl_label_created',
        { type: 'order', id: shipment.orderId },
        {
          shipmentId: shipment.id,
          trackingNumber: shipment.trackingNumber,
          weightGrams: input.weightGrams,
        },
      )
      res.json({ trackingNumber: shipment.trackingNumber, warnings })
    } catch (err) {
      next(err)
    }
  },
)

/** The order's most recent DHL label PDF, inline so the browser print dialog can open it. */
adminOrdersRouter.get(
  '/:id/dhl-label.pdf',
  requirePermission('orders:ship'),
  async (req, res, next) => {
    try {
      const shipment = await prisma.shipment.findFirst({
        where: { orderId: String(req.params.id), labelPdfPath: { not: null } },
        orderBy: { updatedAt: 'desc' },
      })
      if (!shipment?.labelPdfPath) throw notFound('Kein DHL-Label vorhanden')
      res.type('application/pdf').sendFile(path.resolve(shipment.labelPdfPath))
    } catch (err) {
      next(err)
    }
  },
)

/** Cancels the active DHL label at DHL (until the shipment is shipped). */
adminOrdersRouter.delete(
  '/:id/dhl-label',
  requirePermission('orders:ship'),
  async (req, res, next) => {
    try {
      const shipment = await cancelOrderDhlLabel(String(req.params.id))
      await audit(
        req,
        'order.dhl_label_cancelled',
        { type: 'order', id: shipment.orderId },
        {
          shipmentId: shipment.id,
          trackingNumber: shipment.trackingNumber,
        },
      )
      res.json({ ok: true })
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

/** Customer withdrew the carrier-email opt-in (by email) — later DHL labels go without email. */
adminOrdersRouter.post(
  '/:id/carrier-email-consent/withdraw',
  requirePermission('orders:write'),
  async (req, res, next) => {
    try {
      const id = String(req.params.id)
      const { count } = await prisma.order.updateMany({
        where: { id },
        data: { carrierEmailConsentAt: null },
      })
      if (count === 0) throw notFound('Order not found')
      await audit(req, 'order.carrier_email_consent_withdrawn', { type: 'order', id })
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
