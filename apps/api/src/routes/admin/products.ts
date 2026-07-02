import { productCreateSchema, productUpdateSchema } from '@print-shop/validators'
import { Router } from 'express'
import { z } from 'zod'
import { audit } from '../../lib/audit.js'
import { prisma } from '../../lib/prisma.js'
import { requirePermission } from '../../middleware/auth.js'
import { notFound } from '../../middleware/error.js'

export const adminProductsRouter = Router()

const include = {
  translations: true,
  assets: { orderBy: { sortOrder: 'asc' as const } },
  colorSlots: true,
}

adminProductsRouter.get('/', requirePermission('products:read'), async (_req, res, next) => {
  try {
    const products = await prisma.product.findMany({ include, orderBy: { createdAt: 'asc' } })
    res.json({ products })
  } catch (err) {
    next(err)
  }
})

adminProductsRouter.post('/', requirePermission('products:write'), async (req, res, next) => {
  try {
    const input = productCreateSchema.parse(req.body)
    const product = await prisma.product.create({
      data: {
        slug: input.slug,
        priceCents: input.priceCents,
        active: input.active,
        translations: { create: input.translations },
        colorSlots: { create: input.colorSlots },
      },
      include,
    })
    await audit(req, 'product.create', { type: 'product', id: product.id }, { slug: input.slug })
    res.status(201).json({ product })
  } catch (err) {
    next(err)
  }
})

adminProductsRouter.patch('/:id', requirePermission('products:write'), async (req, res, next) => {
  try {
    const input = productUpdateSchema.parse(req.body)
    const existing = await prisma.product.findUnique({ where: { id: String(req.params.id) } })
    if (!existing) throw notFound('Product not found')
    const product = await prisma.$transaction(async (tx) => {
      if (input.translations) {
        await tx.productTranslation.deleteMany({ where: { productId: existing.id } })
        await tx.productTranslation.createMany({
          data: input.translations.map((t) => ({ ...t, productId: existing.id })),
        })
      }
      if (input.colorSlots) {
        await tx.productColorSlot.deleteMany({ where: { productId: existing.id } })
        await tx.productColorSlot.createMany({
          data: input.colorSlots.map((s) => ({ ...s, productId: existing.id })),
        })
      }
      return tx.product.update({
        where: { id: existing.id },
        data: {
          slug: input.slug,
          priceCents: input.priceCents,
          active: input.active,
        },
        include,
      })
    })
    await audit(req, 'product.update', { type: 'product', id: product.id }, input)
    res.json({ product })
  } catch (err) {
    next(err)
  }
})

const assetSchema = z.object({
  type: z.enum(['image', 'glb_preview', 'production_file']),
  url: z.string().min(1).max(500),
  alt: z.string().max(200).nullable().optional(),
  sortOrder: z.number().int().default(0),
})

adminProductsRouter.post('/:id/assets', requirePermission('assets:write'), async (req, res, next) => {
  try {
    const input = assetSchema.parse(req.body)
    const product = await prisma.product.findUnique({ where: { id: String(req.params.id) } })
    if (!product) throw notFound('Product not found')
    const asset = await prisma.productAsset.create({
      data: { ...input, productId: product.id },
    })
    await audit(req, 'product.asset.create', { type: 'product', id: product.id }, input)
    res.status(201).json({ asset })
  } catch (err) {
    next(err)
  }
})

adminProductsRouter.delete('/:id', requirePermission('products:write'), async (req, res, next) => {
  try {
    const existing = await prisma.product.findUnique({ where: { id: String(req.params.id) } })
    if (!existing) throw notFound('Product not found')
    await prisma.product.delete({ where: { id: existing.id } })
    await audit(req, 'product.delete', { type: 'product', id: existing.id }, { slug: existing.slug })
    res.json({ ok: true })
  } catch (err) {
    next(err)
  }
})
