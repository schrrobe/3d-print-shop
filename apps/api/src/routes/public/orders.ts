import { Router } from 'express'
import { prisma } from '../../lib/prisma.js'
import { notFound, unauthorized } from '../../middleware/error.js'
import { sensitiveLimiter } from '../../middleware/rate-limit.js'
import { publicOrderDto } from '../../services/order-dto.js'
import { generateInvoicePdf } from '../../services/invoice.js'

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
        invoice: order.invoice ? { number: order.invoice.number, issuedAt: order.invoice.issuedAt } : null,
      }),
    })
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
    const pdfPath =
      order.invoice.pdfPath ?? (await generateInvoicePdf(order.invoice, order))
    res.download(pdfPath, `${order.invoice.number}.pdf`)
  } catch (err) {
    next(err)
  }
})
