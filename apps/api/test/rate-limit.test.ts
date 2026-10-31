import type { Server } from 'node:http'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

vi.mock('../src/lib/prisma.js', () => ({
  prisma: { order: { findUnique: vi.fn().mockResolvedValue(null) } },
}))

const { createApp } = await import('../src/app.js')

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

/** Which limiter policy answered, or null when none counted the request. */
async function policy(path: string, viaNginx = true) {
  const res = await fetch(`${baseUrl}${path}`, {
    headers: viaNginx ? { 'x-forwarded-for': '203.0.113.7' } : {},
  })
  return res.headers.get('ratelimit-policy')
}

describe('public rate limits', () => {
  it('counts public routes reached through nginx', async () => {
    expect(await policy('/api/orders/PS-2026-00000001?token=x')).toMatch(/^"public"/)
  })

  it('skips internal SSR fetches without X-Forwarded-For', async () => {
    expect(await policy('/api/orders/PS-2026-00000001?token=x', false)).toBeNull()
  })

  it('leaves admin reads to auth and the admin limiter', async () => {
    expect(await policy('/api/admin/auth/me')).toBeNull()
  })

  it('applies the resize limiter only to resized product images', async () => {
    expect(await policy('/api/product-images/missing.jpg?w=320')).toMatch(/"image-resize"/)
    expect(await policy('/api/product-images/missing.jpg')).not.toMatch(/"image-resize"/)
  })
})
