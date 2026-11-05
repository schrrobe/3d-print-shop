import { renderAdminNotification } from '@print-shop/emails'
import type { Payment } from '@prisma/client'
import { env } from '../../env.js'
import { prisma } from '../../lib/prisma.js'
import { sendEmail } from '../email.js'
import { markOrderPaid } from '../order-flow.js'
import { capturePaypalOrder, PaypalApiError, type PaypalCapture } from './paypal.js'

/** PayPal said no for sure (4xx): nothing was captured, the customer may pay again. */
const isDefinitiveRejection = (err: unknown) =>
  err instanceof PaypalApiError && err.status >= 400 && err.status < 500

/** paid: order is paid · pending: captured, PayPal still clearing · refused: not capturable · failed */
export type PaypalOutcome = 'paid' | 'pending' | 'refused' | 'failed'

type PaymentWithOrder = Payment & { order: { id: string; orderNumber: string; status: string } }

const withOrder = { order: { select: { id: true, orderNumber: true, status: true } } } as const

async function alertAdmin(payment: PaymentWithOrder, detail: string): Promise<void> {
  console.error(`[paypal] ${payment.order.orderNumber}: ${detail}`)
  await sendEmail(
    env.ADMIN_NOTIFICATION_EMAIL,
    'admin_notification',
    renderAdminNotification(
      {
        event: 'PayPal-Zahlung prüfen',
        detail: `${payment.order.orderNumber} (${payment.order.status}): ${detail}`,
        adminUrl: `${env.WEB_URL}/admin/orders/${payment.order.id}`,
      },
      'de',
    ),
  )
}

/** Records the capture and marks the order paid once PayPal completed it for the full amount. */
async function settleCapture(
  payment: PaymentWithOrder,
  capture: PaypalCapture,
): Promise<PaypalOutcome> {
  if (payment.paypalCaptureId !== capture.captureId) {
    await prisma.payment.update({
      where: { id: payment.id },
      data: { paypalCaptureId: capture.captureId },
    })
  }
  if (capture.status !== 'COMPLETED') return 'pending'
  if (capture.currency !== 'EUR' || capture.amountCents !== payment.amountCents) {
    await alertAdmin(
      payment,
      `Capture ${capture.captureId} über ${capture.amountCents} ${capture.currency} passt nicht zur Zahlung (${payment.amountCents} EUR)`,
    )
    return 'failed'
  }
  try {
    await markOrderPaid(payment.orderId, payment.id)
  } catch (err) {
    await alertAdmin(
      payment,
      `Capture ${capture.captureId} gebucht, Bestellung nicht bezahlt markiert – bitte prüfen/erstatten`,
    )
    throw err
  }
  return 'paid'
}

/**
 * Captures a PayPal order — only while the order is still awaiting payment and
 * the payment row still points at exactly this PayPal order (a switch to Stripe
 * or a cancellation must never be charged). Return endpoint and webhook share it.
 */
export async function capturePaypalPayment(
  paypalOrderId: string,
  expectedOrderId?: string,
): Promise<PaypalOutcome> {
  if (!paypalOrderId) return 'refused'
  const payment = await prisma.payment.findUnique({ where: { paypalOrderId }, include: withOrder })
  if (!payment || (expectedOrderId && payment.orderId !== expectedOrderId)) return 'refused'
  if (payment.status === 'paid') return 'paid'

  // Guarded claim: processing blocks a concurrent method switch; a parallel return
  // or webhook may also claim and capture — PayPal's request id makes that a replay.
  const claimed = await prisma.payment.updateMany({
    where: {
      id: payment.id,
      method: 'paypal',
      paypalOrderId,
      status: { in: ['pending', 'processing'] },
      order: { status: 'awaiting_payment' },
    },
    data: { status: 'processing' },
  })
  if (claimed.count !== 1) return 'refused'

  let capture: PaypalCapture
  try {
    capture = await capturePaypalOrder(paypalOrderId)
  } catch (err) {
    console.error(`[paypal] capture failed for ${payment.order.orderNumber}:`, err)
    if (isDefinitiveRejection(err)) {
      // Declined or not approved: let the customer try again from the order page.
      await prisma.payment.updateMany({
        where: { id: payment.id, status: 'processing' },
        data: { status: 'pending' },
      })
    } else {
      // Timeout / 5xx: the capture may have gone through. Stay `processing` (blocks a
      // switch to Stripe, so no double charge); the webhook or a retried return settles it.
      await alertAdmin(payment, `Capture-Ergebnis unklar (${String(err)}) – bitte in PayPal prüfen`)
    }
    return 'failed'
  }
  return settleCapture(payment, capture)
}

/** Webhook PAYMENT.CAPTURE.COMPLETED: fallback when neither return nor capture call finished. */
export async function completePaypalCapture(
  capture: PaypalCapture,
  paypalOrderId: string | undefined,
): Promise<PaypalOutcome> {
  const payment = await prisma.payment.findFirst({
    where: {
      OR: [{ paypalCaptureId: capture.captureId }, ...(paypalOrderId ? [{ paypalOrderId }] : [])],
    },
    include: withOrder,
  })
  if (!payment) {
    // Verified PayPal money we can't match (e.g. order switched to Stripe meanwhile).
    console.error(`[paypal] capture ${capture.captureId} (order ${paypalOrderId}) matches no payment`)
    await sendEmail(
      env.ADMIN_NOTIFICATION_EMAIL,
      'admin_notification',
      renderAdminNotification(
        {
          event: 'PayPal-Zahlung ohne Bestellung',
          detail: `Capture ${capture.captureId} (PayPal-Order ${paypalOrderId ?? '?'}) über ${capture.amountCents} ${capture.currency} – bitte prüfen/erstatten`,
          adminUrl: `${env.WEB_URL}/admin/orders`,
        },
        'de',
      ),
    )
    return 'refused'
  }
  if (payment.status === 'paid') return 'paid'
  if (payment.order.status !== 'awaiting_payment' || payment.method !== 'paypal') {
    await alertAdmin(payment, `Unerwartete PayPal-Zahlung ${capture.captureId} – bitte erstatten`)
    return 'refused'
  }
  return settleCapture(payment, capture)
}

/** Webhook PAYMENT.CAPTURE.DENIED: a pending capture failed, the customer may pay again. */
export async function denyPaypalCapture(captureId: string): Promise<void> {
  await prisma.payment.updateMany({
    where: { paypalCaptureId: captureId, status: 'processing' },
    data: { status: 'pending' },
  })
}
