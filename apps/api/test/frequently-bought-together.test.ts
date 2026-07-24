import { beforeEach, describe, expect, it, vi } from 'vitest'

const prismaMocks = vi.hoisted(() => ({
  orderFindMany: vi.fn(),
  productFindMany: vi.fn(),
}))

vi.mock('../src/lib/prisma.js', () => ({
  prisma: {
    order: { findMany: prismaMocks.orderFindMany },
    product: { findMany: prismaMocks.productFindMany },
  },
}))

const { aggregateCoPurchases, recommendationsForProduct } =
  await import('../src/services/frequently-bought-together.js')

const order = (...productIds: string[]) => ({ productIds })

describe('aggregateCoPurchases', () => {
  it('only surfaces pairs co-purchased at least twice (privacy threshold)', () => {
    const result = aggregateCoPurchases(
      [
        order('target', 'mag-pouch'),
        order('target', 'mag-pouch'),
        order('target', 'cleaning-kit'), // single co-purchase of one customer
      ],
      'target',
    )
    expect(result).toEqual([{ productId: 'mag-pouch', count: 2 }])
  })

  it('ignores orders that do not contain the target product', () => {
    const result = aggregateCoPurchases(
      [order('mag-pouch', 'cleaning-kit'), order('mag-pouch', 'cleaning-kit')],
      'target',
    )
    expect(result).toEqual([])
  })

  it('never recommends the target product itself', () => {
    const result = aggregateCoPurchases(
      [order('target', 'target', 'mag-pouch'), order('target', 'mag-pouch')],
      'target',
    )
    expect(result.map((r) => r.productId)).not.toContain('target')
  })

  it('counts a product once per order (dedupe within basket)', () => {
    const result = aggregateCoPurchases(
      [order('target', 'mag-pouch', 'mag-pouch'), order('target')],
      'target',
      { minCount: 2 },
    )
    // two rows in one order = one co-occurrence, below the threshold
    expect(result).toEqual([])
  })

  it('sorts by count descending and respects take', () => {
    const result = aggregateCoPurchases(
      [
        order('target', 'mag-pouch', 'cleaning-kit'),
        order('target', 'mag-pouch', 'cleaning-kit'),
        order('target', 'cleaning-kit'),
      ],
      'target',
      { take: 1 },
    )
    expect(result).toEqual([{ productId: 'cleaning-kit', count: 3 }])
  })

  it('returns empty for no orders', () => {
    expect(aggregateCoPurchases([], 'target')).toEqual([])
  })
})

describe('recommendationsForProduct', () => {
  beforeEach(() => {
    prismaMocks.orderFindMany.mockReset()
    prismaMocks.productFindMany.mockReset()
  })

  it('limits recommendations after inactive ranked products are filtered', async () => {
    prismaMocks.orderFindMany.mockResolvedValue(
      [
        ['inactive-a', 'inactive-b', 'inactive-c', 'inactive-d', 'active-e'],
        ['inactive-a', 'inactive-b', 'inactive-c', 'inactive-d', 'active-e'],
        ['inactive-a', 'inactive-b', 'inactive-c', 'inactive-d'],
        ['inactive-a', 'inactive-b', 'inactive-c'],
        ['inactive-a', 'inactive-b'],
        ['inactive-a'],
      ].map((productIds) => ({
        items: [{ productId: 'target' }, ...productIds.map((productId) => ({ productId }))],
      })),
    )
    prismaMocks.productFindMany.mockResolvedValue([{ id: 'active-e' }])

    const result = await recommendationsForProduct('target')

    expect(prismaMocks.productFindMany).toHaveBeenCalledOnce()
    expect(prismaMocks.productFindMany.mock.calls[0]?.[0]?.where.id.in).toContain('active-e')
    expect(result).toEqual({ products: [{ id: 'active-e' }], source: 'copurchase' })
  })
})
