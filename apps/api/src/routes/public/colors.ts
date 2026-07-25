import { Router } from 'express'
import { prisma } from '../../lib/prisma.js'

export const colorsRouter = Router()

colorsRouter.get('/', async (_req, res, next) => {
  try {
    // Explicit public shape (mirrors ApiColor in the web app). Internal
    // inventory/printer fields (stockGrams, minStockGrams, amsSlot) stay out of
    // this unauthenticated response.
    const colors = await prisma.color.findMany({
      where: { active: true },
      select: {
        id: true,
        name: true,
        hex: true,
        material: true,
        manufacturer: true,
        active: true,
        outOfStock: true,
      },
      orderBy: { name: 'asc' },
    })
    res.json({ colors })
  } catch (err) {
    next(err)
  }
})
