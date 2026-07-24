import type { Prisma } from '@prisma/client'
import { Router } from 'express'
import { prisma } from '../../lib/prisma.js'
import { notFound } from '../../middleware/error.js'
import { popularConfigurationsForProduct } from '../../services/popular-configurations.js'
import { reviewPublicDto } from '../../services/reviews.js'

export const productsRouter = Router()

const publicProductInclude = {
  translations: true,
  assets: { where: { type: { not: 'production_file' as const } }, orderBy: { sortOrder: 'asc' as const } },
  colorSlots: { include: { defaultColor: true } },
}

productsRouter.get('/', async (req, res, next) => {
  try {
    const q = (typeof req.query.q === 'string' ? req.query.q.trim() : '').slice(0, 100)
    const where: Prisma.ProductWhereInput = { active: true }
    if (q) {
      where.OR = [
        { slug: { contains: q, mode: 'insensitive' } },
        {
          translations: {
            some: {
              OR: [
                { name: { contains: q, mode: 'insensitive' } },
                { description: { contains: q, mode: 'insensitive' } },
              ],
            },
          },
        },
      ]
    }
    const products = await prisma.product.findMany({
      where,
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

/** Approved reviews + aggregate rating for the product detail page. */
productsRouter.get('/:slug/reviews', async (req, res, next) => {
  try {
    const product = await prisma.product.findFirst({
      where: { slug: String(req.params.slug), active: true },
      select: { id: true },
    })
    if (!product) throw notFound('Product not found')
    const [reviews, aggregate] = await Promise.all([
      prisma.review.findMany({
        where: { productId: product.id, status: 'approved' },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      prisma.review.aggregate({
        where: { productId: product.id, status: 'approved' },
        _avg: { rating: true },
        _count: true,
      }),
    ])
    res.json({
      reviews: reviews.map(reviewPublicDto),
      averageRating: aggregate._avg.rating ? Math.round(aggregate._avg.rating * 10) / 10 : null,
      count: aggregate._count,
    })
  } catch (err) {
    next(err)
  }
})

/** Popular color combinations (aggregated from real orders, threshold ≥2). */
productsRouter.get('/:slug/popular-configurations', async (req, res, next) => {
  try {
    const product = await prisma.product.findFirst({
      where: { slug: String(req.params.slug), active: true },
      select: { id: true },
    })
    if (!product) throw notFound('Product not found')
    const combinations = await popularConfigurationsForProduct(product.id)
    res.json({ combinations })
  } catch (err) {
    next(err)
  }
})
