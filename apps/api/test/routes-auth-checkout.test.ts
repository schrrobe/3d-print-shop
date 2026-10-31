import type { Server } from 'node:http'
import argon2 from 'argon2'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../src/lib/prisma.js', () => ({
  prisma: {
    user: { findUnique: vi.fn(), update: vi.fn() },
    adminAuditLog: { create: vi.fn().mockResolvedValue({}) },
    order: { findUnique: vi.fn() },
    product: { findMany: vi.fn() },
    voucher: { findUnique: vi.fn() },
    color: { findMany: vi.fn() },
    trackingSession: { findUnique: vi.fn().mockResolvedValue(null) },
    $transaction: vi.fn(),
  },
}))

const { createApp } = await import('../src/app.js')
const { prisma } = await import('../src/lib/prisma.js')

const mockedUserFindUnique = vi.mocked(prisma.user.findUnique)
const mockedOrderFindUnique = vi.mocked(prisma.order.findUnique)
const mockedProductFindMany = vi.mocked(prisma.product.findMany)
const mockedColorFindMany = vi.mocked(prisma.color.findMany)
const mockedVoucherFindUnique = vi.mocked(prisma.voucher.findUnique)

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

  describe('free 50 box', () => {
    const paidId = 'clzz00000000000000000001'
    const boxId = 'clzz00000000000000000002'
    const product = (id: string, priceCents: number, capacity: number) => ({
      id,
      priceCents,
      capacity,
      translations: [{ locale: 'de', name: 'Box' }],
      colorSlots: [],
    })
    const checkout = (quantity: number, key: string) =>
      postJson(
        '/api/checkout',
        {
          items: [{ productId: paidId, quantity, colorSelection: {} }],
          freeBox: { productId: boxId, colorSelection: {} },
          address: {
            firstName: 'Max',
            lastName: 'Mustermann',
            street: 'Musterstraße 1',
            zip: '1010',
            city: 'Wien',
            country: 'AT',
            email: 'max@example.com',
          },
          paymentMethod: 'bank_transfer',
        },
        { 'idempotency-key': key },
      )

    beforeEach(() => {
      mockedOrderFindUnique.mockResolvedValue(null)
      mockedColorFindMany.mockResolvedValue([])
    })

    it('rejects the free box below 100 €', async () => {
      mockedProductFindMany.mockResolvedValue([
        product(paidId, 4999, 100),
        product(boxId, 1490, 50),
      ] as never)

      const res = await checkout(2, 'test-checkout-free-box-key-1')

      expect(res.status).toBe(400)
      expect(((await res.json()) as { message: string }).message).toContain('too low')
    })

    it('rejects a free box that is not a 50 box', async () => {
      mockedProductFindMany.mockResolvedValue([
        product(paidId, 5000, 100),
        product(boxId, 1990, 100),
      ] as never)

      const res = await checkout(2, 'test-checkout-free-box-key-2')

      expect(res.status).toBe(400)
      expect(((await res.json()) as { message: string }).message).toContain('50 rounds')
    })

    it('counts the personalisation surcharge toward the 100 € threshold', async () => {
      mockedProductFindMany.mockResolvedValue([
        product(paidId, 4700, 100),
        product(boxId, 1490, 50),
      ] as never)
      const body = (personalization?: string) => ({
        items: [{ productId: paidId, quantity: 2, colorSelection: {}, personalization }],
        freeBox: { productId: boxId, colorSelection: {} },
        address: {
          firstName: 'Max',
          lastName: 'Mustermann',
          street: 'Musterstraße 1',
          zip: '1010',
          city: 'Wien',
          country: 'AT',
          email: 'max@example.com',
        },
        paymentMethod: 'bank_transfer',
      })

      const plain = await postJson('/api/checkout', body(), {
        'idempotency-key': 'test-checkout-personal-key-1',
      })
      expect(((await plain.json()) as { message: string }).message).toContain('too low')

      // 2 × (47 € + 6 €) = 106 € — past the threshold check
      const personal = await postJson('/api/checkout', body('Max'), {
        'idempotency-key': 'test-checkout-personal-key-2',
      })
      expect(((await personal.json()) as { message?: string }).message ?? '').not.toContain(
        'too low',
      )
    })

    it('puts custom lettering and personalisation into the order item name', async () => {
      mockedProductFindMany.mockResolvedValue([product(paidId, 4700, 100)] as never)
      let itemsCreated: unknown
      vi.mocked(prisma.$transaction).mockImplementationOnce(((
        fn: (tx: unknown) => Promise<unknown>,
      ) =>
        fn({
          order: {
            create: vi.fn((args: { data: { items: { create: unknown } } }) => {
              itemsCreated = args.data.items.create
              throw new Error('stop after snapshot')
            }),
          },
        })) as never)

      await postJson(
        '/api/checkout',
        {
          items: [
            {
              productId: paidId,
              quantity: 1,
              colorSelection: {},
              labelText: 'JAGD',
              personalization: 'Max',
            },
          ],
          address: {
            firstName: 'Max',
            lastName: 'Mustermann',
            street: 'Musterstraße 1',
            zip: '1010',
            city: 'Wien',
            country: 'AT',
            email: 'max@example.com',
          },
          paymentMethod: 'bank_transfer',
        },
        { 'idempotency-key': 'test-checkout-lettering-key-1' },
      )

      expect(itemsCreated).toEqual([
        expect.objectContaining({
          name: 'Box – Schriftzug: JAGD – Personalisierung: Max',
          // Lettering is free; only the personalisation adds 6 €
          unitPriceCents: 5300,
        }),
      ])
    })

    it('rejects personalisation with disallowed characters', async () => {
      const res = await postJson(
        '/api/checkout',
        {
          items: [{ productId: paidId, quantity: 1, colorSelection: {}, personalization: '<b>' }],
          address: {
            firstName: 'Max',
            lastName: 'Mustermann',
            street: 'Musterstraße 1',
            zip: '1010',
            city: 'Wien',
            country: 'AT',
            email: 'max@example.com',
          },
          paymentMethod: 'bank_transfer',
        },
        { 'idempotency-key': 'test-checkout-personal-key-3' },
      )
      expect(res.status).toBe(400)
      expect(await res.json()).toMatchObject({ error: 'validation_error' })
    })
  })
})

describe('POST /api/t/events', () => {
  const event = {
    eventId: '0197fa3f-2222-7222-8222-222222222222',
    name: 'page_view',
    occurredAt: new Date().toISOString(),
  }

  it('rejects a batch without any consent', async () => {
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

  it('stores nothing for a marketing-only batch (forwarded to the conversion APIs only)', async () => {
    vi.mocked(prisma.$transaction).mockClear()
    const res = await postJson('/api/t/events', {
      v: 1,
      sessionId: '0197fa3e-1111-7111-8111-111111111111',
      visitorId: null,
      consent: { statistics: false, marketing: true },
      events: [event],
    })

    expect(res.status).toBe(202)
    expect(await res.json()).toMatchObject({ accepted: 0 })
    expect(prisma.$transaction).not.toHaveBeenCalled()
  })

  it('accepts a text/plain sendBeacon batch and answers 202', async () => {
    // navigator.sendBeacon posts the batch as a text/plain Blob, so the custom
    // body parser must accept text/plain and reach recordClientBatch (a tx).
    const tx = {
      trackingVisitor: { upsert: vi.fn() },
      trackingSession: { upsert: vi.fn(), updateMany: vi.fn() },
      trackingEvent: { createMany: vi.fn().mockResolvedValue({ count: 1 }) },
    }
    vi.mocked(prisma.$transaction).mockImplementation(((fn: (client: unknown) => unknown) =>
      fn(tx)) as never)

    const res = await fetch(`${baseUrl}/api/t/events`, {
      method: 'POST',
      headers: { 'content-type': 'text/plain' },
      body: JSON.stringify({
        v: 1,
        sessionId: '0197fa3e-1111-7111-8111-111111111111',
        visitorId: null,
        consent: { statistics: true, marketing: false },
        events: [event],
      }),
    })

    expect(res.status).toBe(202)
    expect(await res.json()).toMatchObject({ accepted: 1 })
  })
})

describe('POST /api/vouchers/validate', () => {
  const productId = 'clzz00000000000000000001'
  const validate = (personalization?: string) =>
    postJson('/api/vouchers/validate', {
      code: 'sommer10',
      items: [{ productId, quantity: 2, colorSelection: {}, personalization }],
    })

  beforeEach(() => {
    mockedProductFindMany.mockResolvedValue([{ id: productId, priceCents: 4700 }] as never)
    mockedVoucherFindUnique.mockResolvedValue({
      code: 'SOMMER10',
      type: 'percent',
      value: 10,
      active: true,
      validFrom: null,
      validUntil: null,
      maxRedemptions: null,
      redemptionCount: 0,
      minOrderCents: 10_000,
    } as never)
  })

  it('counts the personalisation surcharge toward the minimum order', async () => {
    const plain = await validate()
    expect(await plain.json()).toMatchObject({ valid: false, reason: 'min_order_not_met' })

    // 2 × (47 € + 6 €) = 106 € — 10 % off
    const personal = await validate('Max')
    expect(await personal.json()).toMatchObject({ valid: true, discountCents: 1060 })
  })

  it('rejects personalisation with disallowed characters', async () => {
    const res = await validate('<b>')

    expect(res.status).toBe(400)
    expect(await res.json()).toMatchObject({ error: 'validation_error' })
  })
})
