import { Router } from 'express'
import { env } from '../../env.js'
import { prisma } from '../../lib/prisma.js'
import { randomToken } from '../../lib/tokens.js'
import { notFound } from '../../middleware/error.js'
import { markOrderPaid } from '../../services/order-flow.js'
import { processInboundTicketEmail } from '../../services/ticket.js'

/**
 * Dev-only helpers (never mounted in production, see app.ts):
 * simulate Stripe completion, advance mock bitcoin confirmations,
 * inspect the email log (used by e2e tests).
 */
export const devRouter = Router()

devRouter.post('/stripe/complete/:sessionId', async (req, res, next) => {
  try {
    const payment = await prisma.payment.findFirst({
      where: { stripeSessionId: String(req.params.sessionId) },
    })
    if (!payment) throw notFound('Payment not found for session')
    if (payment.status !== 'paid') await markOrderPaid(payment.orderId, payment.id)
    res.json({ ok: true })
  } catch (err) {
    next(err)
  }
})

devRouter.post('/bitcoin/:paymentId/advance', async (req, res, next) => {
  try {
    const btc = await prisma.bitcoinPayment.findUnique({
      where: { paymentId: String(req.params.paymentId) },
    })
    if (!btc) throw notFound('Bitcoin payment not found')
    const body = (req.body ?? {}) as { confirmations?: number; receivedSats?: number }
    await prisma.bitcoinPayment.update({
      where: { id: btc.id },
      data: {
        confirmations: body.confirmations ?? btc.confirmations + 1,
        receivedSats:
          body.receivedSats !== undefined ? BigInt(body.receivedSats) : btc.expectedSats,
        txId: btc.txId ?? 'mock_tx_dev',
      },
    })
    res.json({ ok: true })
  } catch (err) {
    next(err)
  }
})

/**
 * Simulates an inbound ticket reply mail — exercises the full shared pipeline
 * (address parse → lookup → auto-reply check → quote stripping → status/dedupe),
 * bypassing only the svix signature and the Resend body fetch.
 */
devRouter.post('/inbound-ticket-email', async (req, res, next) => {
  try {
    const body = req.body as {
      token?: string
      to?: string
      text?: string
      headers?: Record<string, string>
    }
    const domain = env.TICKET_REPLY_DOMAIN || 'reply.example.com'
    const to = body.to ? [body.to] : body.token ? [`ticket+${body.token}@${domain}`] : []
    const result = await processInboundTicketEmail({
      to,
      text: body.text ?? null,
      headers: body.headers ?? {},
      inboundEmailId: `dev_${randomToken(8)}`,
      replyDomain: domain,
    })
    res.json(result)
  } catch (err) {
    next(err)
  }
})

devRouter.get('/emails', async (req, res, next) => {
  try {
    const to = req.query.to ? String(req.query.to) : undefined
    const template = req.query.template ? String(req.query.template) : undefined
    const emails = await prisma.emailLog.findMany({
      where: { to, template },
      orderBy: { createdAt: 'desc' },
      take: 20,
    })
    res.json({ emails })
  } catch (err) {
    next(err)
  }
})
