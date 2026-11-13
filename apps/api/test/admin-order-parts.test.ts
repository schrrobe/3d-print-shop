import type { Server } from 'node:http'
import { afterAll, beforeAll, beforeEach, expect, it, vi } from 'vitest'

vi.mock('../src/lib/prisma.js', () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    orderItem: { findFirst: vi.fn(), update: vi.fn() },
    order: { updateMany: vi.fn() },
    adminAuditLog: { create: vi.fn() },
  },
}))
vi.mock('../src/services/order-flow.js', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  notifyProductionStarted: vi.fn(),
}))

const { createApp } = await import('../src/app.js')
const { prisma } = await import('../src/lib/prisma.js')
const { notifyProductionStarted } = await import('../src/services/order-flow.js')
const { signSession, SESSION_COOKIE } = await import('../src/middleware/auth.js')
const { publicOrderDto } = await import('../src/services/order-dto.js')

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

function sessionFor(role: string) {
  vi.mocked(prisma.user.findUnique).mockResolvedValue({
    id: 'user_1',
    email: 'staff@example.com',
    name: 'Staff',
    active: true,
    sessionVersion: 0,
    sessionsInvalidatedAt: null,
    role: { name: role },
  } as never)
  return `${SESSION_COOKIE}=${signSession(
    { id: 'user_1', email: 'staff@example.com', name: 'Staff', role: role as never },
    0,
  )}`
}

function item(orderStatus: string, productId: string | null = 'prod_1') {
  return { id: 'item_1', productId, order: { id: 'order_1', status: orderStatus } }
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(prisma.orderItem.update).mockImplementation((({
    data,
  }: {
    data: Record<string, string | undefined>
  }) =>
    Promise.resolve({
      housingStatus: data.housingStatus ?? 'open',
      insertStatus: data.insertStatus ?? 'open',
      lidStatus: data.lidStatus ?? 'open',
    })) as never)
  vi.mocked(prisma.order.updateMany).mockResolvedValue({ count: 1 })
})

function patch(body: unknown, role = 'production') {
  return fetch(`${baseUrl}/api/admin/orders/order_1/items/item_1/parts`, {
    method: 'PATCH',
    headers: { cookie: sessionFor(role), 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

it('first part in progress moves a paid order to in_production and mails once', async () => {
  vi.mocked(prisma.orderItem.findFirst).mockResolvedValue(item('paid') as never)
  const res = await patch({ housing: 'in_progress' })
  expect(res.status).toBe(200)
  expect(await res.json()).toEqual({
    parts: { housing: 'in_progress', insert: 'open', lid: 'open' },
    productionStarted: true,
  })
  expect(prisma.order.updateMany).toHaveBeenCalledWith({
    where: { id: 'order_1', status: 'paid' },
    data: { status: 'in_production' },
  })
  expect(notifyProductionStarted).toHaveBeenCalledWith('order_1')
})

it('no second mail when the order is already in production', async () => {
  vi.mocked(prisma.orderItem.findFirst).mockResolvedValue(item('in_production') as never)
  const res = await patch({ lid: 'done' })
  expect(res.status).toBe(200)
  expect(prisma.order.updateMany).not.toHaveBeenCalled()
  expect(notifyProductionStarted).not.toHaveBeenCalled()
})

it('lost race against another status change sends no mail', async () => {
  vi.mocked(prisma.orderItem.findFirst).mockResolvedValue(item('paid') as never)
  vi.mocked(prisma.order.updateMany).mockResolvedValue({ count: 0 })
  const res = await patch({ insert: 'done' })
  expect(((await res.json()) as { productionStarted: boolean }).productionStarted).toBe(false)
  expect(notifyProductionStarted).not.toHaveBeenCalled()
})

it('rejects items without product, orders outside production, and support role', async () => {
  vi.mocked(prisma.orderItem.findFirst).mockResolvedValue(item('paid', null) as never)
  expect((await patch({ housing: 'done' })).status).toBe(409)
  vi.mocked(prisma.orderItem.findFirst).mockResolvedValue(item('shipped') as never)
  expect((await patch({ housing: 'done' })).status).toBe(409)
  expect((await patch({ housing: 'done' }, 'support')).status).toBe(403)
  expect((await patch({})).status).toBe(400)
  expect(prisma.orderItem.update).not.toHaveBeenCalled()
})

it('customers see parts only from in_production and once at least one was ticked', () => {
  const parts = (status: string, housingStatus: string) =>
    publicOrderDto({
      status,
      items: [{ productId: 'prod_1', housingStatus, insertStatus: 'open', lidStatus: 'open' }],
      payments: [],
      invoice: null,
    } as never).items[0]?.parts
  expect(parts('paid', 'done')).toBeNull()
  expect(parts('shipped', 'open')).toBeNull()
  expect(parts('shipped', 'done')).toEqual({ housing: 'done', insert: 'open', lid: 'open' })
})
