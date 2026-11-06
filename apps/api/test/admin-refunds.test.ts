import type { Server } from 'node:http'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../src/lib/prisma.js', () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    adminAuditLog: { create: vi.fn().mockResolvedValue({}) },
  },
}))
vi.mock('../src/services/refunds.js', () => ({
  createRefund: vi.fn().mockResolvedValue({
    id: 'ref_1',
    amountCents: 500,
    provider: 'stripe',
    status: 'succeeded',
  }),
  getOrderRefunds: vi.fn().mockResolvedValue({ refunds: [], refundableCents: 0 }),
}))

const { createApp } = await import('../src/app.js')
const { prisma } = await import('../src/lib/prisma.js')
const { signSession, SESSION_COOKIE } = await import('../src/middleware/auth.js')
const { createRefund } = await import('../src/services/refunds.js')

let server: Server
let baseUrl: string
let role = 'admin'

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
  vi.clearAllMocks()
  vi.mocked(prisma.user.findUnique).mockImplementation((async () => ({
    id: 'user_1',
    email: 'u@example.com',
    name: 'U',
    active: true,
    sessionVersion: 0,
    sessionsInvalidatedAt: null,
    role: { name: role },
  })) as never)
})

function call(method: string, path: string, body?: unknown) {
  const cookie = `${SESSION_COOKIE}=${signSession(
    { id: 'user_1', email: 'u@example.com', name: 'U', role: role as 'admin' },
    0,
  )}`
  return fetch(`${baseUrl}/api/admin/refunds${path}`, {
    method,
    headers: { 'content-type': 'application/json', cookie },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
}

describe('admin refund routes RBAC', () => {
  it.each(['support', 'product_manager', 'production', 'shipping'])(
    'forbids refund writes for %s',
    async (r) => {
      role = r
      expect((await call('POST', '/orders/o1', { amountCents: 500, reason: 'x' })).status).toBe(403)
      expect((await call('POST', '/orders/o1/cancel', { reason: 'x' })).status).toBe(403)
      expect((await call('POST', '/corrections/rk1/resend')).status).toBe(403)
      expect(createRefund).not.toHaveBeenCalled()
    },
  )

  it('lets admins refund and audit-logs it', async () => {
    role = 'admin'
    const res = await call('POST', '/orders/o1', { amountCents: 500, reason: 'Kulanz' })
    expect(res.status).toBe(201)
    expect(createRefund).toHaveBeenCalledWith(
      expect.objectContaining({ orderId: 'o1', amountCents: 500, adminUserId: 'user_1' }),
    )
    expect(prisma.adminAuditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ action: 'order.refund' }) }),
    )
  })

  it('validates that an amount or full is given', async () => {
    role = 'admin'
    expect((await call('POST', '/orders/o1', { reason: 'x' })).status).toBe(400)
  })

  it('cancel & refund is a full refund restricted to paid orders', async () => {
    role = 'admin'
    expect((await call('POST', '/orders/o1/cancel', { reason: 'Storno' })).status).toBe(201)
    expect(createRefund).toHaveBeenCalledWith(
      expect.objectContaining({ full: true, requireStatus: 'paid' }),
    )
  })
})
