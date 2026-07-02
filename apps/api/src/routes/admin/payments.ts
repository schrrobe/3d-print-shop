import { Router } from 'express'
import { prisma } from '../../lib/prisma.js'
import { requirePermission } from '../../middleware/auth.js'

export const adminPaymentsRouter = Router()

adminPaymentsRouter.get('/', requirePermission('payments:read'), async (_req, res, next) => {
  try {
    const payments = await prisma.payment.findMany({
      include: {
        order: { select: { orderNumber: true } },
        bitcoinPayment: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    })
    res.json({
      payments: payments.map((p) => ({
        ...p,
        bitcoinPayment: p.bitcoinPayment
          ? {
              ...p.bitcoinPayment,
              expectedSats: Number(p.bitcoinPayment.expectedSats),
              receivedSats: Number(p.bitcoinPayment.receivedSats),
            }
          : null,
      })),
    })
  } catch (err) {
    next(err)
  }
})
