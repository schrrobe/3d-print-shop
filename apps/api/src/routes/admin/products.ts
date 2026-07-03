import { mkdirSync } from 'node:fs'
import { unlink } from 'node:fs/promises'
import path from 'node:path'
import { getFileExtension } from '@print-shop/utils'
import { productCreateSchema, productUpdateSchema } from '@print-shop/validators'
import { Router } from 'express'
import multer from 'multer'
import { z } from 'zod'
import { env } from '../../env.js'
import { audit } from '../../lib/audit.js'
import { prisma } from '../../lib/prisma.js'
import { randomToken } from '../../lib/tokens.js'
import { requirePermission } from '../../middleware/auth.js'
import { badRequest, notFound } from '../../middleware/error.js'

export const adminProductsRouter = Router()

const include = {
  translations: true,
  assets: { orderBy: { sortOrder: 'asc' as const } },
  colorSlots: true,
}

const modelsDir = path.resolve(env.UPLOAD_DIR, 'models')
mkdirSync(modelsDir, { recursive: true })

const modelUpload = multer({
  storage: multer.diskStorage({
    destination: modelsDir,
    filename: (req, _file, cb) => {
      cb(null, `${String(req.params.id)}_${randomToken(6)}.glb`)
    },
  }),
  limits: { fileSize: env.UPLOAD_MAX_BYTES, files: 1 },
  fileFilter: (_req, file, cb) => {
    const extension = getFileExtension(file.originalname)
    if (extension !== '.glb') {
      cb(badRequest(`File type not allowed: ${extension || '(none)'} — only .glb`))
      return
    }
    cb(null, true)
  },
})

adminProductsRouter.get('/', requirePermission('products:read'), async (_req, res, next) => {
  try {
    const products = await prisma.product.findMany({ include, orderBy: { createdAt: 'asc' } })
    res.json({ products })
  } catch (err) {
    next(err)
  }
})

adminProductsRouter.get('/:id', requirePermission('products:read'), async (req, res, next) => {
  try {
    const product = await prisma.product.findUnique({
      where: { id: String(req.params.id) },
      include,
    })
    if (!product) throw notFound('Product not found')
    res.json({ product })
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

adminProductsRouter.post(
  '/:id/model',
  requirePermission('assets:write'),
  modelUpload.single('file'),
  async (req, res, next) => {
    try {
      const file = req.file
      if (!file) throw badRequest('A .glb file is required (field "file")')
      const product = await prisma.product.findUnique({
        where: { id: String(req.params.id) },
        include: { assets: { where: { type: 'glb_preview' } } },
      })
      if (!product) {
        await unlink(file.path).catch(() => {})
        throw notFound('Product not found')
      }
      // one glb_preview per product: replace the asset, unlink previously uploaded files
      for (const old of product.assets) {
        if (old.url.startsWith('/api/models/')) {
          await unlink(path.join(modelsDir, path.basename(old.url))).catch(() => {})
        }
      }
      const [, asset] = await prisma.$transaction([
        prisma.productAsset.deleteMany({ where: { productId: product.id, type: 'glb_preview' } }),
        prisma.productAsset.create({
          data: {
            productId: product.id,
            type: 'glb_preview',
            url: `/api/models/${file.filename}`,
            sortOrder: 0,
          },
        }),
      ])
      await audit(
        req,
        'product.model.upload',
        { type: 'product', id: product.id },
        { filename: file.filename, sizeBytes: file.size },
      )
      res.status(201).json({ asset })
    } catch (err) {
      next(err)
    }
  },
)

adminProductsRouter.delete('/:id', requirePermission('products:write'), async (req, res, next) => {
  try {
    const existing = await prisma.product.findUnique({ where: { id: String(req.params.id) } })
    if (!existing) throw notFound('Product not found')
    // CartItem.product has a Restrict FK — clear ephemeral cart lines first
    await prisma.$transaction([
      prisma.cartItem.deleteMany({ where: { productId: existing.id } }),
      prisma.product.delete({ where: { id: existing.id } }),
    ])
    await audit(req, 'product.delete', { type: 'product', id: existing.id }, { slug: existing.slug })
    res.json({ ok: true })
  } catch (err) {
    next(err)
  }
})
