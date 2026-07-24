import type { Server } from 'node:http'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../src/lib/prisma.js', () => ({
  prisma: {
    product: { findMany: vi.fn() },
  },
}))

const { createApp } = await import('../src/app.js')
const { prisma } = await import('../src/lib/prisma.js')

const mockedProductFindMany = vi.mocked(prisma.product.findMany)

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
