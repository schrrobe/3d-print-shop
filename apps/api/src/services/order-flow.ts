import { readFile } from 'node:fs/promises'
import {
  renderInvoice,
  renderOrderConfirmation,
  renderPaymentReceived,
  renderProductionStarted,
  renderShippingConfirmation,
  type OrderEmailData,
} from '@print-shop/emails'
import { assertOrderTransition, WITHDRAW_PATH } from '@print-shop/utils'
import type { Invoice, Order, OrderItem } from '@prisma/client'
import { env } from '../env.js'
import { prisma } from '../lib/prisma.js'
import { company } from './company.js'
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
    // A pre-issued Vorkasse PDF still shows bank details: drop it so it is
    // re-rendered as "paid" below — or on the next retry / download if that fails.
    await tx.invoice.updateMany({ where: { orderId: order.id }, data: { pdfPath: null } })
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
  // A Vorkasse invoice already delivered at checkout is not mailed again.
  const invoice = paidOrder.invoice ?? (await createInvoiceForOrder(paidOrder.id))
  const pdfPath = invoice.pdfPath ?? (await generateInvoicePdf(invoice, paidOrder))
  if (!invoice.sentAt) await sendInvoiceEmail(paidOrder, invoice, pdfPath)
}

const INVOICE_SEND_LEASE_MS = 5 * 60_000

type InvoiceSendResult = 'sent' | 'failed' | 'busy'

/**
 * Mails the invoice and marks it sent only once delivery succeeded. A CAS lease
 * lets exactly one of several concurrent callers (checkout replays, payment
 * retries) send; the others skip. A crashed sender's lease simply expires.
 * `resend` (admin action) also mails an invoice that was already sent.
 */
async function sendInvoiceEmail(
  order: Order,
  invoice: Invoice,
  pdfPath: string,
  { resend = false } = {},
): Promise<InvoiceSendResult> {
  const now = new Date()
  const claim = await prisma.invoice.updateMany({
    where: {
      id: invoice.id,
      ...(resend ? {} : { sentAt: null }),
      OR: [{ sendLockUntil: null }, { sendLockUntil: { lt: now } }],
    },
    data: { sendLockUntil: new Date(now.getTime() + INVOICE_SEND_LEASE_MS) },
  })
  if (claim.count !== 1) return 'busy'

  let delivered = false
  try {
    const pdf = await readFile(pdfPath)
    delivered = await sendEmail(
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
      { bcc: company().invoiceBcc || undefined },
    )
  } finally {
    await prisma.invoice.update({
      where: { id: invoice.id },
      data: delivered ? { sendLockUntil: null, sentAt: new Date() } : { sendLockUntil: null },
    })
  }
  return delivered ? 'sent' : 'failed'
}

/** Admin action: mail the order's invoice again, e.g. after a failed SMTP send. */
export async function resendInvoice(orderId: string): Promise<InvoiceSendResult | 'no_invoice'> {
  const order = await prisma.order.findUniqueOrThrow({
    where: { id: orderId },
    include: { items: true, payments: true, invoice: true },
  })
  if (!order.invoice) return 'no_invoice'
  const pdfPath = order.invoice.pdfPath ?? (await generateInvoicePdf(order.invoice, order))
  return sendInvoiceEmail(order, order.invoice, pdfPath, { resend: true })
}

/**
 * Vorkasse: issue the invoice at checkout so the customer can pay against it
 * (invoice number = transfer reference), then email it. Idempotent, so a
 * checkout replay can finish an issuance that failed part-way.
 */
export async function issuePrepaymentInvoice(orderId: string): Promise<void> {
  const invoice = await createInvoiceForOrder(orderId)
  if (invoice.sentAt) return
  await prisma.payment.updateMany({
    where: { orderId, method: 'bank_transfer', status: 'pending' },
    data: { reference: invoice.number },
  })
  const order = await prisma.order.findUniqueOrThrow({
    where: { id: orderId },
    include: { items: true, payments: true },
  })
  const pdfPath = invoice.pdfPath ?? (await generateInvoicePdf(invoice, order))
  await sendInvoiceEmail(order, invoice, pdfPath)
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
    renderOrderConfirmation(
      {
        ...orderEmailData(order),
        legal: { ...company(), withdrawUrl: `${env.WEB_URL}${WITHDRAW_PATH}` },
      },
      order.locale,
    ),
  )
}
