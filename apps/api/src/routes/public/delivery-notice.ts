import { Router } from 'express'
import { prisma } from '../../lib/prisma.js'

/** Whether the checkout shows the red "delivery currently ~4 weeks" notice. */
export async function publicDeliveryNotice(): Promise<boolean> {
  const row = await prisma.shopSettings.findUnique({
    where: { id: 'singleton' },
    select: { deliveryDelayNotice: true },
  })
  return row?.deliveryDelayNotice ?? false
}

export const deliveryNoticeRouter = Router()

deliveryNoticeRouter.get('/', async (_req, res, next) => {
  try {
    res.set('Cache-Control', 'public, max-age=60')
    res.json({ enabled: await publicDeliveryNotice() })
  } catch (err) {
    next(err)
  }
})
