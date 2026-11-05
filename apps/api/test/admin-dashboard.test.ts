import type { Server } from 'node:http'
import jwt from 'jsonwebtoken'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

vi.mock('../src/lib/prisma.js', () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    order: { groupBy: vi.fn(), aggregate: vi.fn(), findMany: vi.fn() },
    quoteRequest: { count: vi.fn() },
    printer: { findMany: vi.fn() },
    printerJob: { count: vi.fn() },
    payment: { groupBy: vi.fn() },
    ticket: { count: vi.fn() },
    orderItem: { groupBy: vi.fn() },
    productTranslation: { findMany: vi.fn() },
    $queryRaw: vi.fn(),
  },
}))

const { createApp } = await import('../src/app.js')
const { env } = await import('../src/env.js')
const { prisma } = await import('../src/lib/prisma.js')

let server: Server
let baseUrl = ''
const cookie = `ps_session=${jwt.sign({ sub: 'user_1', ver: 0 }, env.JWT_SECRET, { algorithm: 'HS256' })}`

const asRole = (name: string) =>
  vi.mocked(prisma.user.findUnique).mockResolvedValue({
    id: 'user_1',
    email: 'staff@example.com',
    name: 'Staff',
    active: true,
    role: { id: 'role_1', name },
    sessionVersion: 0,
    sessionsInvalidatedAt: null,
  } as never)

beforeAll(async () => {
  server = createApp().listen(0)
  await new Promise<void>((resolve) => server.once('listening', resolve))
  const address = server.address()
  if (!address || typeof address === 'string') throw new Error('No server port')
  baseUrl = `http://127.0.0.1:${address.port}`

  vi.mocked(prisma.order.groupBy).mockResolvedValue([] as never)
  vi.mocked(prisma.order.aggregate).mockResolvedValue({ _sum: { totalCents: 0 } } as never)
  vi.mocked(prisma.order.findMany).mockResolvedValue([])
  vi.mocked(prisma.quoteRequest.count).mockResolvedValue(0)
  vi.mocked(prisma.printer.findMany).mockResolvedValue([])
  vi.mocked(prisma.printerJob.count).mockResolvedValue(0)
  vi.mocked(prisma.payment.groupBy).mockResolvedValue([] as never)
  vi.mocked(prisma.ticket.count).mockResolvedValue(0)
  vi.mocked(prisma.$queryRaw).mockResolvedValue([{ returning: 3n, total: 10n }] as never)
})

afterAll(() => {
  server.close()
})

const getDashboard = async () => {
  const res = await fetch(`${baseUrl}/api/admin/dashboard`, { headers: { cookie } })
  expect(res.status).toBe(200)
  return (await res.json()) as { returningVisitors: unknown }
}

describe('admin dashboard returning visitors', () => {
  it('returns counts for roles with tracking:read', async () => {
    asRole('admin')
    expect((await getDashboard()).returningVisitors).toEqual({ returning: 3, total: 10, days: 30 })
  })

  it('hides tracking stats from roles without tracking:read', async () => {
    asRole('support')
    vi.mocked(prisma.$queryRaw).mockClear()
    expect((await getDashboard()).returningVisitors).toBeNull()
    expect(prisma.$queryRaw).not.toHaveBeenCalled()
  })
})

describe('admin dashboard top products', () => {
  it('returns the five best sellers with their share of all units sold', async () => {
    asRole('admin')
    const group = (productId: string, quantity: number) => ({ productId, _sum: { quantity } })
    vi.mocked(prisma.orderItem.groupBy).mockResolvedValue(
      [group('p1', 9), group('p2', 5), group('p3', 4), group('p4', 3), group('p5', 2), group('p6', 1)] as never,
    )
    vi.mocked(prisma.productTranslation.findMany).mockResolvedValue([{ productId: 'p1', name: 'Kaliberbox 9mm' }] as never)

    const res = await fetch(`${baseUrl}/api/admin/dashboard/top-products?days=30`, { headers: { cookie } })
    expect(res.status).toBe(200)
    const body = (await res.json()) as { total: number; products: { productId: string; name: string; quantity: number }[] }
    expect(body.total).toBe(24)
    expect(body.products.map((p) => p.productId)).toEqual(['p1', 'p2', 'p3', 'p4', 'p5'])
    expect(body.products[0]).toEqual({ productId: 'p1', name: 'Kaliberbox 9mm', quantity: 9 })
    const where = vi.mocked(prisma.orderItem.groupBy).mock.calls[0]![0].where as { order: { createdAt: { gte: Date } } }
    expect(Date.now() - where.order.createdAt.gte.getTime()).toBeCloseTo(30 * 24 * 60 * 60 * 1000, -4)
  })

  it('rejects periods outside the offered choices', async () => {
    asRole('admin')
    const res = await fetch(`${baseUrl}/api/admin/dashboard/top-products?days=12`, { headers: { cookie } })
    expect(res.status).toBe(400)
  })
})
