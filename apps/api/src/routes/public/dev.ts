import { Router } from 'express'
import { prisma } from '../../lib/prisma.js'
import { notFound } from '../../middleware/error.js'
import { markOrderPaid } from '../../services/order-flow.js'

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
