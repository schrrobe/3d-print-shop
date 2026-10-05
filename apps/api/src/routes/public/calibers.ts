import { Router } from 'express'
import { prisma } from '../../lib/prisma.js'

export const calibersRouter = Router()

/** Calibers that have at least one active product (shop filter chips), grouped then sorted. */
calibersRouter.get('/', async (_req, res, next) => {
  try {
    const calibers = await prisma.caliber.findMany({
      where: { products: { some: { active: true } } },
      select: {
        slug: true,
        name: true,
        group: true,
        sortOrder: true,
        _count: { select: { products: { where: { active: true } } } },
      },
      orderBy: [{ group: 'asc' }, { sortOrder: 'asc' }, { name: 'asc' }],
    })
    res.json({
      calibers: calibers.map(({ _count, ...caliber }) => ({
        ...caliber,
        productCount: _count.products,
      })),
    })
  } catch (err) {
    next(err)
  }
})
