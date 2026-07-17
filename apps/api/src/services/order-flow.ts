import { readFile } from 'node:fs/promises'
import {
  renderInvoice,
  renderOrderConfirmation,
  renderPaymentReceived,
  renderProductionStarted,
  renderShippingConfirmation,
  type OrderEmailData,
} from '@print-shop/emails'
import { assertOrderTransition } from '@print-shop/utils'
import type { Order, OrderItem } from '@prisma/client'
import { env } from '../env.js'
import { prisma } from '../lib/prisma.js'
import { sendEmail } from './email.js'
import { createInvoiceForOrder, generateInvoicePdf } from './invoice.js'
import { computeAndPersistAttribution } from './tracking/attribution.js'
import { recordPurchaseWithOutbox } from './tracking/outbox.js'

export function orderUrl(order: { orderNumber: string; accessToken: string }): string {
  return `${env.WEB_URL}/order/${order.orderNumber}?token=${order.accessToken}`
}

export function orderEmailData(order: Order & { items: OrderItem[] }): OrderEmailData {
  return {
    orderNumber: order.orderNumber,
    firstName: order.firstName,
    totalCents: order.totalCents,
    orderUrl: orderUrl(order),
    items: order.items.map((i) => ({
      name: i.name,
      quantity: i.quantity,
      unitPriceCents: i.unitPriceCents,
    })),
  }
}

/**
 * Central "payment arrived" flow, used by the Stripe webhook, the bitcoin
 * confirmation sync and the admin bank-transfer action:
 * order → paid, payment → paid, invoice (+PDF), production queue jobs, emails.
 */
export async function markOrderPaid(orderId: string, paymentId?: string): Promise<void> {
  const order = await prisma.order.findUniqueOrThrow({
    where: { id: orderId },
    include: { items: true, payments: true, invoice: true },
  })
  if (order.status !== 'paid') assertOrderTransition(order.status, 'paid')

  // With no explicit paymentId, pick the most recent non-failed payment: an
  // order can carry a stale abandoned "pending" alongside the one that just
  // succeeded, and "first non-failed" would flip the wrong row to paid.
  const payment = paymentId
    ? order.payments.find((p) => p.id === paymentId)
    : [...order.payments]
        .filter((p) => p.status !== 'failed')
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0]
  if (!payment) throw new Error(`No payment found for order ${order.orderNumber}`)

  const paidAt = new Date()
  const claimed = await prisma.$transaction(async (tx) => {
    const updated = await tx.order.updateMany({
      where: { id: order.id, status: order.status },
      data: { status: 'paid' },
    })
    if (updated.count !== 1 || order.status === 'paid') return false
    await tx.payment.update({
      where: { id: payment.id },
      data: { status: 'paid', paidAt },
    })
    // Created only by the request that atomically claims the unpaid order.
    await tx.printerJob.createMany({
      data: order.items.map((item) => ({
        orderId: order.id,
        orderItemId: item.id,
        status: 'waiting' as const,
      })),
    })
    return true
  })

  if (claimed) {
    // Keep tracking atomic with its attribution, but separate from the payment
    // claim: a tracking failure must never roll back a confirmed payment. The
    // maintenance reconciliation heals a missing purchase later.
    try {
      await prisma.$transaction(async (tx) => {
        await recordPurchaseWithOutbox(tx, order, paidAt)
        await computeAndPersistAttribution(tx, order, paidAt)
      })
    } catch (err) {
      console.error(`[tracking] purchase/attribution failed for ${order.orderNumber}:`, err)
    }
  }

  const paidOrder = await prisma.order.findUniqueOrThrow({
    where: { id: order.id },
    include: { items: true, payments: true, invoice: true },
  })
  if (claimed) {
    await sendEmail(
      paidOrder.email,
      'payment_received',
      renderPaymentReceived(orderEmailData(paidOrder), paidOrder.locale),
    )
  }

  // Reconcile post-transaction artifacts on webhook retries after a partial failure.
  const mustSendInvoice = claimed || !paidOrder.invoice?.pdfPath
  const invoice = paidOrder.invoice ?? (await createInvoiceForOrder(paidOrder.id))
  const pdfPath = invoice.pdfPath ?? (await generateInvoicePdf(invoice, paidOrder))
  if (mustSendInvoice) {
    const pdf = await readFile(pdfPath)
    await sendEmail(
      paidOrder.email,
      'invoice',
      renderInvoice(
        {
          orderNumber: paidOrder.orderNumber,
          invoiceNumber: invoice.number,
          totalCents: invoice.totalCents,
          orderUrl: orderUrl(paidOrder),
        },
        paidOrder.locale,
      ),
      [{ filename: `${invoice.number}.pdf`, content: pdf }],
    )
  }
}

export async function notifyProductionStarted(orderId: string): Promise<void> {
  const order = await prisma.order.findUniqueOrThrow({
    where: { id: orderId },
    include: { items: true },
  })
  await sendEmail(
    order.email,
    'production_started',
    renderProductionStarted(orderEmailData(order), order.locale),
  )
}

export async function notifyShipped(orderId: string): Promise<void> {
  const order = await prisma.order.findUniqueOrThrow({
    where: { id: orderId },
    include: { items: true },
  })
  if (!order.carrier || !order.trackingNumber) return
  await sendEmail(
    order.email,
    'shipping_confirmation',
    renderShippingConfirmation(
      { ...orderEmailData(order), carrier: order.carrier, trackingNumber: order.trackingNumber },
      order.locale,
    ),
  )
}

export async function sendOrderConfirmation(orderId: string): Promise<void> {
  const order = await prisma.order.findUniqueOrThrow({
    where: { id: orderId },
    include: { items: true },
  })
  await sendEmail(
    order.email,
    'order_confirmation',
    renderOrderConfirmation(orderEmailData(order), order.locale),
  )
}
