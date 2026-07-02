import { Router } from 'express'
import { prisma } from '../../lib/prisma.js'
import { notFound } from '../../middleware/error.js'

export const productsRouter = Router()

const publicProductInclude = {
  translations: true,
  assets: { where: { type: { not: 'production_file' as const } }, orderBy: { sortOrder: 'asc' as const } },
  colorSlots: { include: { defaultColor: true } },
}

productsRouter.get('/', async (_req, res, next) => {
  try {
    const products = await prisma.product.findMany({
      where: { active: true },
      include: publicProductInclude,
      orderBy: { createdAt: 'asc' },
    })
    res.json({ products })
  } catch (err) {
    next(err)
  }
})

productsRouter.get('/:slug', async (req, res, next) => {
  try {
    const product = await prisma.product.findFirst({
      where: { slug: String(req.params.slug), active: true },
      include: publicProductInclude,
    })
    if (!product) throw notFound('Product not found')
    res.json({ product })
  } catch (err) {
    next(err)
  }
})
