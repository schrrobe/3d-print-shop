import { timingSafeEqual } from 'node:crypto'
import { renderAdminNotification } from '@print-shop/emails'
import { formatCents } from '@print-shop/utils'
import { Router, json, raw } from 'express'
import type Stripe from 'stripe'
import { env } from '../../env.js'
import { prisma } from '../../lib/prisma.js'
import { badRequest } from '../../middleware/error.js'
import { sendEmail } from '../../services/email.js'
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
        include: { order: { select: { id: true, orderNumber: true, status: true } } },
      })
      if (payment) {
        const payable =
          (payment.status === 'pending' || payment.status === 'processing') &&
          payment.order.status !== 'cancelled'
        // The first completed session claims the payment (reference = session id), so a
        // second session — two open tabs on one payment link — cannot pass as a retry.
        const claimed =
          payable &&
          (
            await prisma.payment.updateMany({
              where: { id: payment.id, OR: [{ reference: null }, { reference: session.id }] },
              data: { reference: session.id },
            })
          ).count === 1
        if (claimed) {
          if (session.currency !== 'eur' || session.amount_total !== payment.amountCents) {
            throw badRequest('Stripe session amount or currency does not match the payment')
          }
          await markOrderPaid(payment.orderId, payment.id)
        } else if (!(payment.status === 'paid' && payment.reference === session.id)) {
          // Money no order expects: paid after cancellation or a second time. Stripe
          // must not retry this, so acknowledge it and hand the refund to an admin.
          console.error(
            `[stripe] unexpected payment ${session.id} for ${payment.order.orderNumber} (${payment.order.status})`,
          )
          await sendEmail(
            env.ADMIN_NOTIFICATION_EMAIL,
            'admin_notification',
            renderAdminNotification(
              {
                event: 'Unerwartete Stripe-Zahlung – bitte erstatten',
                detail: `${payment.order.orderNumber} (${payment.order.status}): Session ${session.id} über ${formatCents(session.amount_total ?? 0)}`,
                adminUrl: `${env.WEB_URL}/admin/orders/${payment.order.id}`,
              },
              'de',
            ),
          )
        }
      }
    }

    res.json({ received: true })
  } catch (err) {
    next(err)
  }
})

/** Brevo inbound mailbox; Headers values are a string or a list for repeated headers. */
interface BrevoInboundItem {
  MessageId: string
  From?: { Address?: string | null }
  To?: { Address?: string | null }[]
  Recipients?: { Address?: string | null }[]
  RawTextBody?: string | null
  RawHtmlBody?: string | null
  Headers?: Record<string, string | string[]>
}

/**
 * Brevo inbound parsing webhook (inboundEmailProcessed) — customer replies to
 * ticket mails. Brevo does not sign webhooks; it sends the bearer token
 * configured on the webhook. Skipped-but-processed items still return 200 so
 * Brevo does not retry them.
 */
webhooksRouter.post('/brevo-inbound', json({ limit: '5mb' }), async (req, res, next) => {
  try {
    if (!env.BREVO_INBOUND_WEBHOOK_TOKEN || !env.TICKET_REPLY_DOMAIN) {
      res.status(503).json({ error: 'Inbound email is not configured' })
      return
    }

    const expected = Buffer.from(`Bearer ${env.BREVO_INBOUND_WEBHOOK_TOKEN}`)
    const given = Buffer.from(req.get('authorization') ?? '')
    if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
      res.status(401).json({ error: 'Unauthorized' })
      return
    }

    const items = (req.body as { items?: BrevoInboundItem[] } | undefined)?.items ?? []
    for (const mail of items) {
      const result = await processInboundTicketEmail({
        // RCPT TO first: plus-addresses survive there even when To is rewritten.
        to: [...(mail.Recipients ?? []), ...(mail.To ?? [])]
          .map((m) => m.Address)
          .filter((a): a is string => Boolean(a)),
        text: mail.RawTextBody ?? null,
        html: mail.RawHtmlBody ?? null,
        headers: Object.fromEntries(
          Object.entries(mail.Headers ?? {}).map(([k, v]) => [
            k,
            Array.isArray(v) ? v.join(', ') : v,
          ]),
        ),
        inboundEmailId: mail.MessageId,
        replyDomain: env.TICKET_REPLY_DOMAIN,
      })
      console.info(
        `[inbound-email] from=${(mail.From?.Address ?? '').slice(0, 3)}*** → ${result.outcome}${
          result.outcome === 'skipped' ? `:${result.reason}` : ''
        }`,
      )
    }
    res.json({ received: true })
  } catch (err) {
    next(err)
  }
})
