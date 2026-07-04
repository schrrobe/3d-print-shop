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
  if (order.status === 'paid') return // idempotent (webhook retries)
  assertOrderTransition(order.status, 'paid')

  // With no explicit paymentId, pick the most recent non-failed payment: an
  // order can carry a stale abandoned "pending" alongside the one that just
  // succeeded, and "first non-failed" would flip the wrong row to paid.
  const payment = paymentId
    ? order.payments.find((p) => p.id === paymentId)
    : [...order.payments]
        .filter((p) => p.status !== 'failed')
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0]
  if (!payment) throw new Error(`No payment found for order ${order.orderNumber}`)

  await prisma.$transaction([
    prisma.order.update({ where: { id: order.id }, data: { status: 'paid' } }),
    prisma.payment.update({
      where: { id: payment.id },
      data: { status: 'paid', paidAt: new Date() },
    }),
    // One production job per order item → production queue (status: waiting)
    prisma.printerJob.createMany({
      data: order.items.map((item) => ({
        orderId: order.id,
        orderItemId: item.id,
        status: 'waiting' as const,
      })),
    }),
  ])

  const emailData = orderEmailData(order)
  await sendEmail(order.email, 'payment_received', renderPaymentReceived(emailData, order.locale))

  // Invoice: number, PDF, email with attachment
  if (!order.invoice) {
    const invoice = await createInvoiceForOrder(order.id)
    // order was loaded before the transaction above — patch the just-paid
    // payment so the PDF renders the "already paid" variant, not a stale one
    const pdfPath = await generateInvoicePdf(invoice, {
      ...order,
      payments: order.payments.map((p) =>
        p.id === payment.id ? { ...p, status: 'paid' as const, paidAt: p.paidAt ?? new Date() } : p,
      ),
    })
    const pdf = await readFile(pdfPath)
    await sendEmail(
      order.email,
      'invoice',
      renderInvoice(
        {
          orderNumber: order.orderNumber,
          invoiceNumber: invoice.number,
          totalCents: invoice.totalCents,
          orderUrl: orderUrl(order),
        },
        order.locale,
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
