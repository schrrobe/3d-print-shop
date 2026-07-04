import { canonicalColorSelection } from '@print-shop/utils'
import { savedConfigurationSchema } from '@print-shop/validators'
import { Router } from 'express'
import { env } from '../../env.js'
import { prisma } from '../../lib/prisma.js'
import { randomToken } from '../../lib/tokens.js'
import { badRequest, notFound } from '../../middleware/error.js'
import { sensitiveLimiter } from '../../middleware/rate-limit.js'

export const configurationsRouter = Router()

/**
 * Share a color configuration. Deduped on the canonical (productId, selection)
 * key so repeated shares of the same combo return the same stable link.
 */
configurationsRouter.post('/', sensitiveLimiter, async (req, res, next) => {
  try {
    const input = savedConfigurationSchema.parse(req.body)
    const product = await prisma.product.findFirst({
      where: { id: input.productId, active: true },
      include: { colorSlots: true },
    })
    if (!product) throw notFound('Product not found')

    const validSlots = new Set(product.colorSlots.map((s) => s.slot as string))
    for (const slot of Object.keys(input.selectedColors)) {
      if (!validSlots.has(slot)) throw badRequest(`Unknown color zone for this product: ${slot}`)
    }
    const colorIds = Object.values(input.selectedColors)
    const colorCount = await prisma.color.count({ where: { id: { in: colorIds } } })
    if (colorCount !== new Set(colorIds).size) throw badRequest('Unknown color in configuration')

    const canonical = canonicalColorSelection(input.selectedColors)
    const existingRows = await prisma.savedConfiguration.findMany({
      where: { productId: product.id },
      select: { shareToken: true, selectedColors: true },
      take: 500,
    })
    const existing = existingRows.find(
      (row) => canonicalColorSelection(row.selectedColors as Record<string, string>) === canonical,
    )
    const shareToken = existing?.shareToken
      ?? (
        await prisma.savedConfiguration.create({
          data: {
            productId: product.id,
            selectedColors: input.selectedColors,
            shareToken: randomToken(12),
          },
        })
      ).shareToken

    res.status(existing ? 200 : 201).json({
      shareToken,
      url: `${env.WEB_URL}/products/${product.slug}?config=${shareToken}`,
    })
  } catch (err) {
    next(err)
  }
})

/** Load a shared configuration incl. per-zone availability. */
configurationsRouter.get('/:shareToken', async (req, res, next) => {
  try {
    const configuration = await prisma.savedConfiguration.findUnique({
      where: { shareToken: String(req.params.shareToken) },
      include: { product: { select: { id: true, slug: true, active: true } } },
    })
    if (!configuration || !configuration.product.active) throw notFound('Configuration not found')

    const selection = configuration.selectedColors as Record<string, string>
    const colors = await prisma.color.findMany({
      where: { id: { in: Object.values(selection) } },
      select: { id: true, name: true, hex: true, active: true, outOfStock: true },
    })
    const colorById = new Map(colors.map((c) => [c.id, c]))
    const availability = Object.fromEntries(
      Object.entries(selection).map(([slot, colorId]) => {
        const color = colorById.get(colorId)
        const state = !color || !color.active ? 'unavailable' : color.outOfStock ? 'out_of_stock' : 'ok'
        return [slot, state]
      }),
    )

    res.json({
      productId: configuration.product.id,
      slug: configuration.product.slug,
      selectedColors: selection,
      availability,
    })
  } catch (err) {
    next(err)
  }
})
