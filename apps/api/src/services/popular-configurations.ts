import { canonicalColorSelection, type ColorSelection } from '@print-shop/utils'
import { Prisma } from '@prisma/client'
import { prisma } from '../lib/prisma.js'

/** Only real purchases count towards popularity. */
const COUNTED_ORDER_STATUSES = [
  'paid',
  'in_production',
  'quality_check',
  'ready_to_ship',
  'shipped',
  'completed',
] as const

/** Combos must appear in ≥2 order items — never expose a single customer's private combo. */
export const POPULAR_MIN_COUNT = 2
export const POPULAR_TAKE = 5
const CACHE_TTL_MS = 10 * 60 * 1000

export interface PopularConfiguration {
  selectedColors: ColorSelection
  count: number
  swatches: { slot: string; colorId: string; hex: string; name: string }[]
  available: boolean
}

interface ColorInfo {
  id: string
  hex: string
  name: string
  active: boolean
  outOfStock: boolean
}

/** Pure aggregation — exported for unit tests. */
export function aggregatePopularConfigurations(
  selections: ColorSelection[],
  colors: ColorInfo[],
  options: { minCount?: number; take?: number } = {},
): PopularConfiguration[] {
  const minCount = options.minCount ?? POPULAR_MIN_COUNT
  const take = options.take ?? POPULAR_TAKE
  const colorById = new Map(colors.map((c) => [c.id, c]))

  const byKey = new Map<string, { selection: ColorSelection; count: number }>()
  for (const selection of selections) {
    if (!selection || Object.keys(selection).length === 0) continue
    const key = canonicalColorSelection(selection)
    const entry = byKey.get(key)
    if (entry) entry.count += 1
    else byKey.set(key, { selection, count: 1 })
  }

  return [...byKey.values()]
    .filter((entry) => entry.count >= minCount)
    .sort((a, b) => b.count - a.count)
    .slice(0, take)
    .map((entry) => {
      const swatches = Object.entries(entry.selection).map(([slot, colorId]) => {
        const color = colorById.get(colorId)
        return {
          slot,
          colorId,
          hex: color?.hex ?? '#000000',
          name: color?.name ?? 'Unbekannt',
        }
      })
      const available = Object.values(entry.selection).every((colorId) => {
        const color = colorById.get(colorId)
        return color != null && color.active && !color.outOfStock
      })
      return { selectedColors: entry.selection, count: entry.count, swatches, available }
    })
    .filter((combo) => combo.swatches.length > 0)
}

const cache = new Map<string, { data: PopularConfiguration[]; expires: number }>()

/**
 * Popular combinations per product, aggregated in JS (Prisma cannot group by a
 * Json column). Module-level cache with a 10-minute TTL — shop volume is small.
 */
export async function popularConfigurationsForProduct(
  productId: string,
): Promise<PopularConfiguration[]> {
  const cached = cache.get(productId)
  if (cached && cached.expires > Date.now()) return cached.data

  const [items, colors] = await Promise.all([
    prisma.orderItem.findMany({
      where: {
        productId,
        order: { status: { in: [...COUNTED_ORDER_STATUSES] } },
        colorSelection: { not: Prisma.JsonNull },
      },
      select: { colorSelection: true },
    }),
    prisma.color.findMany({
      select: { id: true, hex: true, name: true, active: true, outOfStock: true },
    }),
  ])

  const selections = items
    .map((i) => i.colorSelection as ColorSelection | null)
    .filter((s): s is ColorSelection => s != null && typeof s === 'object')

  const data = aggregatePopularConfigurations(selections, colors)
  cache.set(productId, { data, expires: Date.now() + CACHE_TTL_MS })
  return data
}
