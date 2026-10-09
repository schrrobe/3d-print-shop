import type { Server } from 'node:http'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../src/lib/prisma.js', () => ({
  prisma: {
    product: { findMany: vi.fn(), findFirst: vi.fn() },
    caliber: { findMany: vi.fn() },
  },
}))

const { createApp } = await import('../src/app.js')
const { prisma } = await import('../src/lib/prisma.js')

const mockedProductFindMany = vi.mocked(prisma.product.findMany)
const mockedProductFindFirst = vi.mocked(prisma.product.findFirst)
const mockedCaliberFindMany = vi.mocked(prisma.caliber.findMany)

let server: Server
let baseUrl: string

beforeAll(async () => {
  server = createApp().listen(0)
  await new Promise((resolve) => server.once('listening', resolve))
  const address = server.address()
  if (address === null || typeof address === 'string') throw new Error('No server port')
  baseUrl = `http://127.0.0.1:${address.port}`
})

afterAll(() => {
  server.close()
})

beforeEach(() => {
  mockedProductFindMany.mockReset()
  mockedProductFindMany.mockResolvedValue([] as never)
  mockedProductFindFirst.mockReset()
  mockedCaliberFindMany.mockReset()
})

function whereOf() {
  return mockedProductFindMany.mock.calls[0]?.[0]?.where
}

describe('GET /api/products', () => {
  it('lists active products without a search filter', async () => {
    const res = await fetch(`${baseUrl}/api/products`)
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ products: [] })
    expect(whereOf()).toEqual({ active: true })
  })

  it('builds an OR filter across slug and translations when q is given', async () => {
    const res = await fetch(`${baseUrl}/api/products?q=vase`)
    expect(res.status).toBe(200)
    expect(whereOf()).toEqual({
      active: true,
      OR: [
        { slug: { contains: 'vase', mode: 'insensitive' } },
        {
          translations: {
            some: {
              OR: [
                { name: { contains: 'vase', mode: 'insensitive' } },
                { description: { contains: 'vase', mode: 'insensitive' } },
              ],
            },
          },
        },
      ],
    })
  })

  it('ignores a whitespace-only query', async () => {
    await fetch(`${baseUrl}/api/products?q=%20%20%20`)
    expect(whereOf()).toEqual({ active: true })
  })

  it('caps the query at 100 characters', async () => {
    const long = 'a'.repeat(250)
    await fetch(`${baseUrl}/api/products?q=${long}`)
    const where = whereOf() as { OR?: Array<{ slug?: { contains: string } }> }
    expect(where.OR?.[0]?.slug?.contains).toBe('a'.repeat(100))
  })

  it('treats a repeated q param (array) as no search', async () => {
    const res = await fetch(`${baseUrl}/api/products?q=a&q=b`)
    expect(res.status).toBe(200)
    expect(whereOf()).toEqual({ active: true })
  })
})

describe('GET /api/products?caliber=', () => {
  it('filters to products linked to the caliber', async () => {
    const res = await fetch(`${baseUrl}/api/products?caliber=9mm-luger`)
    expect(res.status).toBe(200)
    expect(whereOf()).toEqual({ active: true, calibers: { some: { slug: '9mm-luger' } } })
  })

  it('combines the caliber filter with q', async () => {
    await fetch(`${baseUrl}/api/products?caliber=308-win&q=100`)
    const where = whereOf() as { calibers?: unknown; OR?: unknown[] }
    expect(where.calibers).toEqual({ some: { slug: '308-win' } })
    expect(where.OR).toHaveLength(2)
  })

  it('rejects a malformed caliber slug', async () => {
    const res = await fetch(`${baseUrl}/api/products?caliber=${encodeURIComponent('9mm Luger')}`)
    expect(res.status).toBe(400)
    expect(mockedProductFindMany).not.toHaveBeenCalled()
  })

  it('rejects a repeated caliber param (array)', async () => {
    const res = await fetch(`${baseUrl}/api/products?caliber=a&caliber=b`)
    expect(res.status).toBe(400)
  })
})

describe('GET /api/products/:slug siblings', () => {
  const base = { slug: 'patronenbox-9mm-luger-50', capacity: 50, priceCents: 1490 }

  it('returns active products of the same family sorted by capacity', async () => {
    mockedProductFindFirst.mockResolvedValue({ ...base, familyKey: '9mm-luger' } as never)
    const siblings = [base, { slug: 'patronenbox-9mm-luger-100', capacity: 100, priceCents: 1990 }]
    mockedProductFindMany.mockResolvedValue(siblings as never)
    const res = await fetch(`${baseUrl}/api/products/${base.slug}`)
    expect(res.status).toBe(200)
    expect(((await res.json()) as { product: { siblings: unknown } }).product.siblings).toEqual(
      siblings,
    )
    expect(mockedProductFindMany.mock.calls[0]?.[0]).toMatchObject({
      where: { familyKey: '9mm-luger', active: true },
      orderBy: [{ capacity: 'asc' }, { slug: 'asc' }],
    })
  })

  it('returns only the product itself without a familyKey', async () => {
    mockedProductFindFirst.mockResolvedValue({ ...base, familyKey: null } as never)
    const res = await fetch(`${baseUrl}/api/products/${base.slug}`)
    expect(((await res.json()) as { product: { siblings: unknown } }).product.siblings).toEqual([
      base,
    ])
    expect(mockedProductFindMany).not.toHaveBeenCalled()
  })
})

describe('GET /api/calibers', () => {
  it('lists calibers with active products and flattens the product count', async () => {
    mockedCaliberFindMany.mockResolvedValue([
      {
        slug: '9mm-luger',
        name: '9 mm Luger',
        group: 'HANDGUN',
        sortOrder: 10,
        _count: { products: 2 },
      },
    ] as never)
    const res = await fetch(`${baseUrl}/api/calibers`)
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({
      calibers: [
        { slug: '9mm-luger', name: '9 mm Luger', group: 'HANDGUN', sortOrder: 10, productCount: 2 },
      ],
    })
    expect(mockedCaliberFindMany.mock.calls[0]?.[0]).toMatchObject({
      where: { products: { some: { active: true } } },
      orderBy: [{ group: 'asc' }, { sortOrder: 'asc' }, { name: 'asc' }],
    })
  })
})
