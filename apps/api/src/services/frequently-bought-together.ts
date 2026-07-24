import { prisma } from '../lib/prisma.js'
import { publicProductInclude } from '../lib/product-query.js'

/** Only fully completed orders count towards co-purchase pairs. */
const COUNTED_STATUS = 'completed' as const

/** Pairs must co-occur in ≥2 orders — never expose a single customer's basket. */
export const FBT_MIN_COUNT = 2
export const FBT_TAKE = 4
const CACHE_TTL_MS = 10 * 60 * 1000

export type RecommendationSource = 'copurchase' | 'fallback'

export interface ProductRecommendations {
  products: unknown[]
  source: RecommendationSource
}

/** Pure aggregation — exported for unit tests. Expects productIds deduped per order. */
export function aggregateCoPurchases(
  orders: { productIds: string[] }[],
  targetProductId: string,
  options: { minCount?: number; take?: number } = {},
): { productId: string; count: number }[] {
  const minCount = options.minCount ?? FBT_MIN_COUNT
  const take = options.take ?? FBT_TAKE

  const counts = new Map<string, number>()
  for (const order of orders) {
    if (!order.productIds.includes(targetProductId)) continue
    for (const productId of new Set(order.productIds)) {
      if (productId === targetProductId) continue
      counts.set(productId, (counts.get(productId) ?? 0) + 1)
    }
  }

  return [...counts.entries()]
    .filter(([, count]) => count >= minCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, take)
    .map(([productId, count]) => ({ productId, count }))
}

const cache = new Map<string, { data: ProductRecommendations; expires: number }>()

/**
 * "Frequently bought together" per product, aggregated in JS from completed
 * orders. Falls back to the newest other active products while co-purchase data
 * is still sparse. Module-level cache with a 10-minute TTL — shop volume is small.
 */
export async function recommendationsForProduct(
  productId: string,
): Promise<ProductRecommendations> {
  const cached = cache.get(productId)
  if (cached && cached.expires > Date.now()) return cached.data

  const orders = await prisma.order.findMany({
    where: { status: COUNTED_STATUS, items: { some: { productId } } },
    select: { items: { select: { productId: true } } },
  })

  const baskets = orders.map((order) => ({
    productIds: [...new Set(order.items.map((i) => i.productId).filter((id): id is string => id != null))],
  }))

  const ranked = aggregateCoPurchases(baskets, productId, {
    take: Number.MAX_SAFE_INTEGER,
  })

  let products: unknown[] = []
  let source: RecommendationSource = 'copurchase'
  if (ranked.length > 0) {
    const ids = ranked.map((r) => r.productId)
    const found = await prisma.product.findMany({
      where: { id: { in: ids }, active: true },
      include: publicProductInclude,
    })
    const byId = new Map(found.map((p) => [p.id, p]))
    products = ids
      .map((id) => byId.get(id))
      .filter((p) => p != null)
      .slice(0, FBT_TAKE)
  }

  if (products.length === 0) {
    source = 'fallback'
    products = await prisma.product.findMany({
      where: { active: true, id: { not: productId } },
      include: publicProductInclude,
      orderBy: { createdAt: 'desc' },
      take: FBT_TAKE,
    })
  }

  const data = { products, source }
  cache.set(productId, { data, expires: Date.now() + CACHE_TTL_MS })
  return data
}
