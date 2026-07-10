import { Router, raw } from 'express'
import type Stripe from 'stripe'
import { env } from '../../env.js'
import { prisma } from '../../lib/prisma.js'
import { badRequest } from '../../middleware/error.js'
import { resend } from '../../services/email.js'
import { markOrderPaid } from '../../services/order-flow.js'
import { processInboundTicketEmail } from '../../services/ticket.js'
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
    } catch {
      throw badRequest('Webhook verification failed')
    }

    if (
      event.type === 'checkout.session.completed' ||
      event.type === 'checkout.session.async_payment_succeeded'
    ) {
      const session = event.data.object as Stripe.Checkout.Session
      if (session.payment_status !== 'paid') {
        res.json({ received: true })
        return
      }
      const paymentLinkId =
        typeof session.payment_link === 'string' ? session.payment_link : session.payment_link?.id
      const stripeIds = [session.id, paymentLinkId].filter((id): id is string => Boolean(id))
      const payment = await prisma.payment.findFirst({
        where: { stripeSessionId: { in: stripeIds } },
      })
      if (payment && payment.status !== 'paid') {
        if (session.currency !== 'eur' || session.amount_total !== payment.amountCents) {
          throw badRequest('Stripe session amount or currency does not match the payment')
        }
        await markOrderPaid(payment.orderId, payment.id)
      }
    }

    res.json({ received: true })
  } catch (err) {
    next(err)
  }
})

/**
 * Resend inbound webhook (email.received) — customer replies to ticket mails.
 * Raw body: svix signature verification needs the exact bytes. Skipped-but-
 * processed cases return 200 so Resend does not retry them.
 */
webhooksRouter.post(
  '/resend-inbound',
  raw({ type: 'application/json' }),
  async (req, res, next) => {
    try {
      if (!env.RESEND_WEBHOOK_SECRET || !env.TICKET_REPLY_DOMAIN || !resend) {
        res.status(503).json({ error: 'Inbound email is not configured' })
        return
      }

      const payload = (req.body as Buffer).toString('utf8')
      try {
        resend.webhooks.verify({
          payload,
          headers: {
            id: req.get('svix-id') ?? '',
            timestamp: req.get('svix-timestamp') ?? '',
            signature: req.get('svix-signature') ?? '',
          },
          webhookSecret: env.RESEND_WEBHOOK_SECRET,
        })
      } catch {
        throw badRequest('Webhook verification failed')
      }

      const event = JSON.parse(payload) as {
        type: string
        data: { email_id: string; from: string; to: string[] }
      }
      if (event.type !== 'email.received') {
        res.json({ received: true })
        return
      }

      // The webhook payload carries metadata only — fetch the body separately.
      const { data: mail } = await resend.emails.receiving.get(event.data.email_id)
      const result = await processInboundTicketEmail({
        to: event.data.to,
        text: mail?.text ?? null,
        html: mail?.html ?? null,
        headers: (mail?.headers ?? {}) as Record<string, string>,
        inboundEmailId: event.data.email_id,
        replyDomain: env.TICKET_REPLY_DOMAIN,
      })
      console.info(
        `[inbound-email] from=${event.data.from} → ${result.outcome}${
          result.outcome === 'skipped' ? `:${result.reason}` : ''
        }`,
      )
      res.json({ received: true })
    } catch (err) {
      next(err)
    }
  },
)
