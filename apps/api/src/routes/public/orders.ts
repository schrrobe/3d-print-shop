import { Router } from 'express'
import { env } from '../../env.js'
import { prisma } from '../../lib/prisma.js'
import { conflict, notFound, unauthorized } from '../../middleware/error.js'
import { sensitiveLimiter } from '../../middleware/rate-limit.js'
import { publicOrderDto } from '../../services/order-dto.js'
import { generateInvoicePdf } from '../../services/invoice.js'
import {
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

/**
 * "Pay now" for an unpaid Stripe order (customer left the embedded checkout).
 * Returns a client secret for the embedded form, or the mock success URL.
 */
ordersRouter.post('/:orderNumber/stripe-session', sensitiveLimiter, async (req, res, next) => {
  try {
    const order = await orderByNumberAndToken(
      String(req.params.orderNumber),
      String(req.query.token ?? ''),
    )
    const payment = order.payments.find((p) => p.method === 'stripe' && p.status === 'pending')
    if (order.status !== 'awaiting_payment' || !payment?.stripeSessionId) {
      throw conflict('Order is not awaiting a Stripe payment')
    }
    if (!stripeConfigured) {
      res.json({ redirectUrl: payment.stripePaymentLinkUrl })
      return
    }
    const session = await resumeStripeCheckoutSession(payment.stripeSessionId, {
      orderNumber: order.orderNumber,
      accessToken: order.accessToken,
      amountCents: payment.amountCents,
      email: order.email,
      locale: order.locale,
      description: `Bestellung ${order.orderNumber}`,
    })
    if (!session) throw conflict('Payment already completed')
    if (session.sessionId !== payment.stripeSessionId) {
      // Guarded swap: a concurrent request may have replaced the session first.
      // The webhook only knows the stored session, so a lost one must not stay payable.
      const swapped = await prisma.payment.updateMany({
        where: { id: payment.id, stripeSessionId: payment.stripeSessionId },
        data: { stripeSessionId: session.sessionId, stripePaymentLinkUrl: null },
      })
      if (swapped.count === 0) {
        await expireStripeCheckoutSession(session.sessionId)
        throw conflict('Payment session changed, please retry')
      }
    }
    res.json({ clientSecret: session.clientSecret, publishableKey: env.STRIPE_PUBLISHABLE_KEY })
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
