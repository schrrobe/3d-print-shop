import { deriveBitcoinStatus, isBitcoinPaid } from '@print-shop/utils'
import { Router } from 'express'
import { env } from '../../env.js'
import { prisma } from '../../lib/prisma.js'
import { badRequest, notFound } from '../../middleware/error.js'
import { sensitiveLimiter } from '../../middleware/rate-limit.js'
import { markOrderPaid } from '../../services/order-flow.js'
import { bitcoinProvider } from '../../services/payments/bitcoin.js'

export const paymentsRouter = Router()

paymentsRouter.get('/methods', (_req, res) => {
  res.json({ methods: ['stripe', 'bank_transfer', ...(env.BITCOIN_ENABLED ? ['bitcoin'] : [])] })
})

/** Payment status polling (used by the confirmation page). */
paymentsRouter.get('/:paymentId', async (req, res, next) => {
  try {
    const orderToken = String(req.get('x-order-token') ?? '')
    const payment = await prisma.payment.findUnique({
      where: { id: String(req.params.paymentId) },
      include: {
        bitcoinPayment: true,
        order: { select: { orderNumber: true, status: true, accessToken: true } },
      },
    })
    if (!payment || !orderToken || orderToken !== payment.order.accessToken) {
      throw notFound('Payment not found')
    }
    res.json({
      payment: {
        id: payment.id,
        method: payment.method,
        status: payment.status,
        orderStatus: payment.order.status,
        bitcoin: payment.bitcoinPayment
          ? {
              address: payment.bitcoinPayment.address,
              expectedSats: Number(payment.bitcoinPayment.expectedSats),
              receivedSats: Number(payment.bitcoinPayment.receivedSats),
              confirmations: payment.bitcoinPayment.confirmations,
              status: payment.bitcoinPayment.status,
              requiredConfirmations: env.BITCOIN_REQUIRED_CONFIRMATIONS,
            }
          : undefined,
      },
    })
  } catch (err) {
    next(err)
  }
})

/**
 * Syncs a bitcoin payment against the blockchain provider and marks the order
 * as paid once >= 2 confirmations arrived for the full amount.
 */
paymentsRouter.post('/bitcoin/:paymentId/sync', sensitiveLimiter, async (req, res, next) => {
  try {
    if (!env.BITCOIN_ENABLED) throw badRequest('Bitcoin payments are not enabled')
    const orderToken = String(req.get('x-order-token') ?? '')
    const payment = await prisma.payment.findUnique({
      where: { id: String(req.params.paymentId) },
      include: { bitcoinPayment: true, order: { select: { accessToken: true } } },
    })
    if (!payment?.bitcoinPayment || !orderToken || orderToken !== payment.order.accessToken) {
      throw notFound('Bitcoin payment not found')
    }
    const btc = payment.bitcoinPayment

    const chain = await bitcoinProvider.getAddressStatus(btc.address)
    const snapshot = {
      expectedSats: Number(btc.expectedSats),
      receivedSats: Number(chain.receivedSats),
      confirmations: chain.confirmations,
      expired: btc.expiresAt < new Date() && chain.receivedSats === 0n,
    }
    const status = deriveBitcoinStatus(snapshot, env.BITCOIN_REQUIRED_CONFIRMATIONS)

    const updated = await prisma.bitcoinPayment.update({
      where: { id: btc.id },
      data: {
        receivedSats: chain.receivedSats,
        confirmations: chain.confirmations,
        txId: chain.txId,
        status,
      },
    })

    if (isBitcoinPaid(snapshot, env.BITCOIN_REQUIRED_CONFIRMATIONS) && payment.status !== 'paid') {
      await markOrderPaid(payment.orderId, payment.id)
    }

    res.json({
      bitcoin: {
        status: updated.status,
        receivedSats: Number(updated.receivedSats),
        confirmations: updated.confirmations,
        requiredConfirmations: env.BITCOIN_REQUIRED_CONFIRMATIONS,
      },
    })
  } catch (err) {
    next(err)
  }
})
