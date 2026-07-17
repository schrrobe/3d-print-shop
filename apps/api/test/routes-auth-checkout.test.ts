import type { Server } from 'node:http'
import argon2 from 'argon2'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../src/lib/prisma.js', () => ({
  prisma: {
    user: { findUnique: vi.fn(), update: vi.fn() },
    adminAuditLog: { create: vi.fn().mockResolvedValue({}) },
    order: { findUnique: vi.fn() },
    product: { findMany: vi.fn() },
    color: { findMany: vi.fn() },
  },
}))

const { createApp } = await import('../src/app.js')
const { prisma } = await import('../src/lib/prisma.js')

const mockedUserFindUnique = vi.mocked(prisma.user.findUnique)
const mockedOrderFindUnique = vi.mocked(prisma.order.findUnique)
const mockedProductFindMany = vi.mocked(prisma.product.findMany)
const mockedColorFindMany = vi.mocked(prisma.color.findMany)

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
  mockedUserFindUnique.mockReset()
  mockedOrderFindUnique.mockReset()
  mockedProductFindMany.mockReset()
  mockedColorFindMany.mockReset()
})

function postJson(path: string, body: unknown, headers: Record<string, string> = {}) {
  return fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify(body),
  })
}

async function adminUser(overrides: Record<string, unknown> = {}) {
  return {
    id: 'user_1',
    email: 'admin@example.com',
    name: 'Admin',
    passwordHash: await argon2.hash('correct-password'),
    active: true,
    roleId: 'role_1',
    role: { id: 'role_1', name: 'admin' },
    sessionVersion: 0,
    sessionsInvalidatedAt: null,
    ...overrides,
  }
}

describe('POST /api/admin/auth/login', () => {
  it('rejects an invalid body with a validation error', async () => {
    const res = await postJson('/api/admin/auth/login', { email: 'not-an-email' })

    expect(res.status).toBe(400)
    expect(await res.json()).toMatchObject({ error: 'validation_error' })
  })

  it('rejects unknown users and wrong passwords with the same 401', async () => {
    mockedUserFindUnique.mockResolvedValue(null)
    const unknown = await postJson('/api/admin/auth/login', {
      email: 'nobody@example.com',
      password: 'irrelevant-password',
    })
    expect(unknown.status).toBe(401)
    expect(await unknown.json()).toMatchObject({ message: 'Invalid credentials' })

    mockedUserFindUnique.mockResolvedValue((await adminUser()) as never)
    const wrongPassword = await postJson('/api/admin/auth/login', {
      email: 'admin@example.com',
      password: 'wrong-password',
    })
    expect(wrongPassword.status).toBe(401)
    expect(await wrongPassword.json()).toMatchObject({ message: 'Invalid credentials' })
  })

  it('rejects inactive users', async () => {
    mockedUserFindUnique.mockResolvedValue((await adminUser({ active: false })) as never)

    const res = await postJson('/api/admin/auth/login', {
      email: 'admin@example.com',
      password: 'correct-password',
    })

    expect(res.status).toBe(401)
  })

  it('sets a hardened session cookie on success', async () => {
    mockedUserFindUnique.mockResolvedValue((await adminUser()) as never)

    const res = await postJson('/api/admin/auth/login', {
      email: 'admin@example.com',
      password: 'correct-password',
    })

    expect(res.status).toBe(200)
    const body = (await res.json()) as { user: { email: string; permissions: string[] } }
    expect(body.user.email).toBe('admin@example.com')
    expect(body.user.permissions.length).toBeGreaterThan(0)

    const cookie = res.headers.get('set-cookie') ?? ''
    expect(cookie).toContain('ps_session=')
    expect(cookie).toContain('HttpOnly')
    expect(cookie).toContain('SameSite=Strict')
  })

  it('rejects sessions issued before sessionsInvalidatedAt', async () => {
    mockedUserFindUnique.mockResolvedValue((await adminUser()) as never)
    const login = await postJson('/api/admin/auth/login', {
      email: 'admin@example.com',
      password: 'correct-password',
    })
    const cookie = (login.headers.get('set-cookie') ?? '').split(';')[0] ?? ''

    // Same user, but all sessions were invalidated after this token was issued.
    mockedUserFindUnique.mockResolvedValue(
      (await adminUser({ sessionsInvalidatedAt: new Date(Date.now() + 10_000) })) as never,
    )
    const rejected = await fetch(`${baseUrl}/api/admin/auth/me`, { headers: { cookie } })
    expect(rejected.status).toBe(401)

    // Without the invalidation marker, the same cookie is accepted.
    mockedUserFindUnique.mockResolvedValue((await adminUser()) as never)
    const accepted = await fetch(`${baseUrl}/api/admin/auth/me`, { headers: { cookie } })
    expect(accepted.status).toBe(200)
  })
})

describe('POST /api/checkout', () => {
  it('rejects an invalid body with a validation error', async () => {
    const res = await postJson('/api/checkout', { items: [] })

    expect(res.status).toBe(400)
    expect(await res.json()).toMatchObject({ error: 'validation_error' })
  })

  it('rejects unknown or inactive products', async () => {
    mockedOrderFindUnique.mockResolvedValue(null)
    mockedProductFindMany.mockResolvedValue([])
    mockedColorFindMany.mockResolvedValue([])

    const res = await postJson(
      '/api/checkout',
      {
        items: [{ productId: 'clzz00000000000000000001', quantity: 1, colorSelection: {} }],
        address: {
          firstName: 'Max',
          lastName: 'Mustermann',
          street: 'Musterstraße 1',
          zip: '12345',
          city: 'Berlin',
          country: 'DE',
          email: 'max@example.com',
        },
        paymentMethod: 'bank_transfer',
      },
      { 'idempotency-key': 'test-checkout-idempotency-key-1' },
    )

    expect(res.status).toBe(400)
    const body = (await res.json()) as { message: string }
    expect(body.message).toContain('Product not available')
  })
})

describe('POST /api/t/events', () => {
  const event = {
    eventId: '0197fa3f-2222-7222-8222-222222222222',
    name: 'page_view',
    occurredAt: new Date().toISOString(),
  }

  it('rejects a batch without statistics consent', async () => {
    const res = await postJson('/api/t/events', {
      v: 1,
      sessionId: '0197fa3e-1111-7111-8111-111111111111',
      visitorId: null,
      consent: { statistics: false, marketing: false },
      events: [event],
    })

    expect(res.status).toBe(400)
    expect(await res.json()).toMatchObject({ error: 'validation_error' })
  })

  it('rejects cross-site browser ingest before persistence', async () => {
    const res = await postJson(
      '/api/t/events',
      {
        v: 1,
        sessionId: '0197fa3e-1111-7111-8111-111111111111',
        visitorId: null,
        consent: { statistics: true, marketing: false },
        events: [event],
      },
      { origin: 'https://attacker.example', 'sec-fetch-site': 'cross-site' },
    )

    expect(res.status).toBe(403)
    expect(await res.json()).toMatchObject({ error: 'forbidden' })
  })
})
