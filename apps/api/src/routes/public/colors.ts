import { Router } from 'express'
import { prisma } from '../../lib/prisma.js'

export const colorsRouter = Router()

colorsRouter.get('/', async (_req, res, next) => {
  try {
    const colors = await prisma.color.findMany({
      where: { active: true },
      orderBy: { name: 'asc' },
    })
    res.json({ colors })
  } catch (err) {
    next(err)
  }
})
