import type { Server } from 'node:http'
import { afterAll, beforeAll, beforeEach, expect, it, vi } from 'vitest'

const tx = {
  order: { updateMany: vi.fn() },
  invoice: { updateMany: vi.fn() },
}
vi.mock('../src/lib/prisma.js', () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    order: { findUnique: vi.fn() },
    adminAuditLog: { create: vi.fn() },
    $transaction: vi.fn((fn: (t: typeof tx) => unknown) => fn(tx)),
  },
}))

const { createApp } = await import('../src/app.js')
const { prisma } = await import('../src/lib/prisma.js')
const { signSession, SESSION_COOKIE } = await import('../src/middleware/auth.js')

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

function session() {
  vi.mocked(prisma.user.findUnique).mockResolvedValue({
    id: 'user_1',
    email: 'staff@example.com',
    name: 'Staff',
    active: true,
    sessionVersion: 0,
    sessionsInvalidatedAt: null,
    role: { name: 'admin' },
  } as never)
  return `${SESSION_COOKIE}=${signSession(
    { id: 'user_1', email: 'staff@example.com', name: 'Staff', role: 'admin' as never },
    0,
  )}`
}

function order(status: string, payments: { method: string; status: string }[]) {
  vi.mocked(prisma.order.findUnique).mockResolvedValue({
    id: 'order_1',
    status,
    payments,
  } as never)
}

const reactivate = () =>
  fetch(`${baseUrl}/api/admin/orders/order_1/reactivate`, {
    method: 'POST',
    headers: { cookie: session() },
  })

beforeEach(() => {
  vi.clearAllMocks()
  tx.order.updateMany.mockResolvedValue({ count: 1 })
  tx.invoice.updateMany.mockResolvedValue({ count: 1 })
})

it('late bank transfer: back to awaiting_bank_transfer, cancelled invoice detached', async () => {
  order('cancelled', [{ method: 'bank_transfer', status: 'pending' }])
  const res = await reactivate()
  expect(res.status).toBe(200)
  expect(tx.order.updateMany).toHaveBeenCalledWith({
    where: { id: 'order_1', status: 'cancelled' },
    data: { status: 'awaiting_bank_transfer' },
  })
  expect(tx.invoice.updateMany).toHaveBeenCalledWith({
    where: { orderId: 'order_1', cancellationNumber: { not: null } },
    data: { orderId: null, replacedOrderId: 'order_1' },
  })
})

it('refuses orders that are not cancelled, were paid, or have no open payment', async () => {
  order('paid', [{ method: 'bank_transfer', status: 'pending' }])
  expect((await reactivate()).status).toBe(409)
  order('cancelled', [{ method: 'stripe', status: 'refunded' }])
  expect((await reactivate()).status).toBe(409)
  order('cancelled', [{ method: 'stripe_payment_link', status: 'expired' }])
  expect((await reactivate()).status).toBe(409)
  expect(tx.order.updateMany).not.toHaveBeenCalled()
})

it('lost race: nothing detached', async () => {
  order('cancelled', [{ method: 'stripe', status: 'pending' }])
  tx.order.updateMany.mockResolvedValue({ count: 0 })
  expect((await reactivate()).status).toBe(409)
  expect(tx.invoice.updateMany).not.toHaveBeenCalled()
})
