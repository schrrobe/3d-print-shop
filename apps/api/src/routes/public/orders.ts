import { Router } from 'express'
import { env } from '../../env.js'
import { prisma } from '../../lib/prisma.js'
import { badRequest, conflict, notFound, unauthorized } from '../../middleware/error.js'
import { sensitiveLimiter } from '../../middleware/rate-limit.js'
import { publicOrderDto } from '../../services/order-dto.js'
import { generateInvoicePdf } from '../../services/invoice.js'
import { createPaypalOrder, isPaypalEnabled } from '../../services/payments/paypal.js'
import {
  closeStripeCheckoutSession,
  createStripeCheckoutSession,
  expireStripeCheckoutSession,
  resumeStripeCheckoutSession,
  stripeConfigured,
} from '../../services/payments/stripe.js'

export const ordersRouter = Router()

async function orderByNumberAndToken(orderNumber: string, token: string) {
  const order = await prisma.order.findUnique({
    where: { orderNumber },
    include: {
      items: true,
      payments: { include: { bitcoinPayment: true } },
      invoice: true,
    },
  })
  if (!order) throw notFound('Order not found')
  if (!token || token !== order.accessToken) throw unauthorized('Invalid order token')
  return order
}

/** Guest order status page — requires the access token from the confirmation. */
ordersRouter.get('/:orderNumber', async (req, res, next) => {
  try {
    const order = await orderByNumberAndToken(
      String(req.params.orderNumber),
      String(req.query.token ?? ''),
    )
    res.json({
      order: publicOrderDto({
        ...order,
        invoice: order.invoice
          ? { number: order.invoice.number, issuedAt: order.invoice.issuedAt }
          : null,
      }),
    })
  } catch (err) {
    next(err)
  }
})

/** The unpaid online payment the order page may (re)start: Stripe or PayPal, not Vorkasse/Bitcoin. */
function switchablePayment(order: Awaited<ReturnType<typeof orderByNumberAndToken>>) {
  const payment = order.payments.find(
    (p) => (p.method === 'stripe' || p.method === 'paypal') && p.status === 'pending',
  )
  if (order.status !== 'awaiting_payment' || !payment) {
    throw conflict('Order is not awaiting an online payment')
  }
  return payment
}

function paymentParams(
  order: { orderNumber: string; accessToken: string; email: string; locale: string },
  amountCents: number,
) {
  return {
    orderNumber: order.orderNumber,
    accessToken: order.accessToken,
    amountCents,
    email: order.email,
    locale: order.locale,
    description: `Bestellung ${order.orderNumber}`,
  }
}

/**
 * "Pay now" with Stripe for an unpaid online order (left the embedded checkout,
 * or switching from PayPal). Returns a client secret for the embedded form, or
 * the mock success URL.
 */
ordersRouter.post('/:orderNumber/stripe-session', sensitiveLimiter, async (req, res, next) => {
  try {
    const order = await orderByNumberAndToken(
      String(req.params.orderNumber),
      String(req.query.token ?? ''),
    )
    const payment = switchablePayment(order)
    if (!stripeConfigured && payment.method === 'stripe' && payment.stripePaymentLinkUrl) {
      res.json({ redirectUrl: payment.stripePaymentLinkUrl })
      return
    }
    const params = paymentParams(order, payment.amountCents)
    let session: { sessionId: string; clientSecret?: string; url?: string }
    if (stripeConfigured && payment.stripeSessionId) {
      const resumed = await resumeStripeCheckoutSession(payment.stripeSessionId, params)
      if (!resumed) throw conflict('Payment already completed')
      session = resumed
    } else {
      session = await createStripeCheckoutSession(params)
    }
    if (session.sessionId !== payment.stripeSessionId || payment.method !== 'stripe') {
      // Guarded swap: a concurrent request may have replaced the session or switched
      // the method first. The webhook only knows the stored session, so a lost one must
      // not stay payable; clearing paypalOrderId makes a late PayPal return a no-op.
      const swapped = await prisma.payment.updateMany({
        where: {
          id: payment.id,
          status: 'pending',
          method: payment.method,
          stripeSessionId: payment.stripeSessionId,
          paypalOrderId: payment.paypalOrderId,
        },
        data: {
          method: 'stripe',
          stripeSessionId: session.sessionId,
          stripePaymentLinkUrl: session.url ?? null,
          paypalOrderId: null,
        },
      })
      if (swapped.count === 0) {
        await expireStripeCheckoutSession(session.sessionId)
        throw conflict('Payment session changed, please retry')
      }
    }
    res.json(
      session.url
        ? { redirectUrl: session.url }
        : { clientSecret: session.clientSecret, publishableKey: env.STRIPE_PUBLISHABLE_KEY },
    )
  } catch (err) {
    next(err)
  }
})

/**
 * "Pay with PayPal" for an unpaid online order: closes an open Stripe session,
 * starts a fresh PayPal order (replacing an older one) and returns its approve URL.
 */
ordersRouter.post('/:orderNumber/paypal-order', sensitiveLimiter, async (req, res, next) => {
  try {
    const order = await orderByNumberAndToken(
      String(req.params.orderNumber),
      String(req.query.token ?? ''),
    )
    if (!isPaypalEnabled()) throw badRequest('PayPal payments are not enabled')
    const payment = switchablePayment(order)
    if (payment.method === 'stripe' && payment.stripeSessionId) {
      if (!(await closeStripeCheckoutSession(payment.stripeSessionId))) {
        throw conflict('Payment already completed')
      }
    }
    const paypalOrder = await createPaypalOrder(paymentParams(order, payment.amountCents))
    const switched = await prisma.payment.updateMany({
      where: {
        id: payment.id,
        status: 'pending',
        method: payment.method,
        stripeSessionId: payment.stripeSessionId,
        paypalOrderId: payment.paypalOrderId,
      },
      data: { method: 'paypal', paypalOrderId: paypalOrder.id, stripePaymentLinkUrl: null },
    })
    if (switched.count === 0) throw conflict('Payment changed, please retry')
    res.json({ redirectUrl: paypalOrder.approveUrl })
  } catch (err) {
    next(err)
  }
})

/**
 * Invoice download for guests (order token) — the same PDF the admin sees;
 * regenerated on the fly when the file is missing (e.g. fresh checkout).
 */
ordersRouter.get('/:orderNumber/invoice.pdf', sensitiveLimiter, async (req, res, next) => {
  try {
    const order = await orderByNumberAndToken(
      String(req.params.orderNumber),
      String(req.query.token ?? ''),
    )
    if (!order.invoice) throw notFound('No invoice for this order yet')
    const pdfPath = order.invoice.pdfPath ?? (await generateInvoicePdf(order.invoice, order))
    res.download(pdfPath, `${order.invoice.number}.pdf`)
  } catch (err) {
    next(err)
  }
})
