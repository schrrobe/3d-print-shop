import { Router, raw } from 'express'
import type Stripe from 'stripe'
import { prisma } from '../../lib/prisma.js'
import { badRequest } from '../../middleware/error.js'
import { markOrderPaid } from '../../services/order-flow.js'
import { constructStripeWebhookEvent } from '../../services/payments/stripe.js'

export const webhooksRouter = Router()

/**
 * Stripe webhook — mounted with a raw body parser (signature verification
 * needs the exact bytes). Handles checkout sessions and payment links.
 */
webhooksRouter.post('/stripe', raw({ type: 'application/json' }), async (req, res, next) => {
  try {
    let event: Stripe.Event
    try {
      event = constructStripeWebhookEvent(req.body as Buffer, req.get('stripe-signature'))
    } catch (err) {
      throw badRequest(`Webhook verification failed: ${String(err)}`)
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session
      const payment = await prisma.payment.findFirst({
        where: {
          OR: [
            { stripeSessionId: session.id },
            { order: { orderNumber: String(session.metadata?.orderNumber ?? '') } },
          ],
        },
      })
      if (payment && payment.status !== 'paid') {
        await markOrderPaid(payment.orderId, payment.id)
      }
    }

    res.json({ received: true })
  } catch (err) {
    next(err)
  }
})
