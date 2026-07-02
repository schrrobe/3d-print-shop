import { Router } from 'express'
import { env } from '../../env.js'
import { prisma } from '../../lib/prisma.js'
import { notFound, unauthorized } from '../../middleware/error.js'

export const ordersRouter = Router()

/** Guest order status page — requires the access token from the confirmation. */
ordersRouter.get('/:orderNumber', async (req, res, next) => {
  try {
    const token = String(req.query.token ?? '')
    const order = await prisma.order.findUnique({
      where: { orderNumber: String(req.params.orderNumber) },
      include: {
        items: true,
        payments: { include: { bitcoinPayment: true } },
        invoice: { select: { number: true, issuedAt: true } },
      },
    })
    if (!order) throw notFound('Order not found')
    if (!token || token !== order.accessToken) throw unauthorized('Invalid order token')

    res.json({
      order: {
        orderNumber: order.orderNumber,
        status: order.status,
        locale: order.locale,
        createdAt: order.createdAt,
        subtotalCents: order.subtotalCents,
        shippingCents: order.shippingCents,
        totalCents: order.totalCents,
        carrier: order.carrier,
        trackingNumber: order.trackingNumber,
        items: order.items.map((i) => ({
          name: i.name,
          quantity: i.quantity,
          unitPriceCents: i.unitPriceCents,
          colorSelection: i.colorSelection,
        })),
        invoice: order.invoice,
        payments: order.payments.map((p) => ({
          id: p.id,
          method: p.method,
          status: p.status,
          amountCents: p.amountCents,
          reference: p.reference,
          bank:
            p.method === 'bank_transfer'
              ? {
                  accountHolder: env.BANK_ACCOUNT_HOLDER,
                  iban: env.BANK_IBAN,
                  bic: env.BANK_BIC,
                  reference: p.reference ?? order.orderNumber,
                }
              : undefined,
          bitcoin: p.bitcoinPayment
            ? {
                address: p.bitcoinPayment.address,
                expectedSats: Number(p.bitcoinPayment.expectedSats),
                receivedSats: Number(p.bitcoinPayment.receivedSats),
                confirmations: p.bitcoinPayment.confirmations,
                status: p.bitcoinPayment.status,
                requiredConfirmations: env.BITCOIN_REQUIRED_CONFIRMATIONS,
              }
            : undefined,
        })),
      },
    })
  } catch (err) {
    next(err)
  }
})
