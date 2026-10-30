import type { Server } from 'node:http'
import jwt from 'jsonwebtoken'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

vi.mock('../src/lib/prisma.js', () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    order: { aggregate: vi.fn(), groupBy: vi.fn() },
    salesChannel: { findMany: vi.fn() },
    salesChannelClick: { groupBy: vi.fn() },
    trackingEvent: { count: vi.fn(), findFirst: vi.fn() },
    $queryRaw: vi.fn(),
  },
}))

const { createApp } = await import('../src/app.js')
const { env } = await import('../src/env.js')
const { prisma } = await import('../src/lib/prisma.js')

let server: Server
let baseUrl = ''
const cookie = `ps_session=${jwt.sign({ sub: 'user_1', ver: 0 }, env.JWT_SECRET, { algorithm: 'HS256' })}`

beforeAll(async () => {
  server = createApp().listen(0)
  await new Promise<void>((resolve) => server.once('listening', resolve))
  const address = server.address()
  if (!address || typeof address === 'string') throw new Error('No server port')
  baseUrl = `http://127.0.0.1:${address.port}`
  vi.mocked(prisma.user.findUnique).mockResolvedValue({
    id: 'user_1',
    email: 'admin@example.com',
    name: 'Admin',
    active: true,
    role: { id: 'role_1', name: 'admin' },
    sessionVersion: 0,
    sessionsInvalidatedAt: null,
  } as never)
})

afterAll(() => {
  server.close()
})

const get = (path: string) => fetch(`${baseUrl}${path}`, { headers: { cookie } })
const range = 'from=2026-10-01T00:00:00.000Z&to=2026-11-01T00:00:00.000Z'

// One paid Vorkasse order: 100 € goods, 5 % Vorkasse discount, 6,99 € shipping.
const paidOrderSums = {
  subtotalCents: 10000,
  discountCents: 0,
  prepaymentDiscountCents: 500,
  totalCents: 10199,
}

describe('admin revenue KPIs with Vorkasse discount', () => {
  it('a channel owning the only order gets 100 % of shop revenue', async () => {
    vi.mocked(prisma.salesChannel.findMany).mockResolvedValue([
      { id: 'ch_1', code: 'abc', voucher: null, product: null },
    ] as never)
    vi.mocked(prisma.salesChannelClick.groupBy).mockResolvedValue([] as never)
    vi.mocked(prisma.order.groupBy).mockResolvedValue([
      {
        salesChannelId: 'ch_1',
        _count: { _all: 1 },
        _sum: { commissionBaseCents: 9500, commissionCents: 0 },
      },
    ] as never)
    vi.mocked(prisma.order.aggregate).mockResolvedValue({ _sum: paidOrderSums } as never)

    const res = await get(`/api/admin/sales-channels?${range}`)
    expect(res.status).toBe(200)
    const body = (await res.json()) as {
      shopRevenueCents: number
      channels: { revenueCents: number }[]
    }
    expect(body.shopRevenueCents).toBe(9500)
    expect(body.channels[0]?.revenueCents).toBe(body.shopRevenueCents)
  })

  it('gross revenue adds the Vorkasse discount back onto the net total', async () => {
    vi.mocked(prisma.$queryRaw).mockResolvedValue([] as never)
    vi.mocked(prisma.trackingEvent.count).mockResolvedValue(0)
    vi.mocked(prisma.trackingEvent.findFirst).mockResolvedValue(null)
    vi.mocked(prisma.order.aggregate).mockResolvedValue({ _sum: paidOrderSums, _count: 1 } as never)

    const res = await get(`/api/admin/tracking/overview?${range}`)
    expect(res.status).toBe(200)
    const body = (await res.json()) as {
      current: { kpis: { grossRevenueCents: number; netRevenueCents: number } }
    }
    expect(body.current.kpis.netRevenueCents).toBe(10199)
    expect(body.current.kpis.grossRevenueCents).toBe(10699)
  })
})
