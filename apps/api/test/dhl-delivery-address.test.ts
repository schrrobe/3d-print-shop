import type { Server } from 'node:http'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../src/lib/prisma.js', () => {
  const prisma = {
    user: { findUnique: vi.fn() },
    order: { findUnique: vi.fn(), updateMany: vi.fn() },
    shipmentItem: { findMany: vi.fn() },
    shipment: { updateMany: vi.fn(), findUniqueOrThrow: vi.fn() },
    providerAssignment: { count: vi.fn().mockResolvedValue(0) },
  }
  return { prisma }
})
vi.mock('../src/services/dhl.js', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  createDhlLabel: vi.fn().mockResolvedValue({
    shipmentNo: '00340434161094042557',
    pdf: Buffer.from('%PDF'),
    warnings: [],
  }),
  cancelDhlLabel: vi.fn(),
}))
vi.mock('node:fs/promises', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  mkdir: vi.fn(),
  writeFile: vi.fn(),
  rm: vi.fn(),
}))
vi.mock('../src/services/company.js', () => ({
  company: () => ({ name: 'Shop', street: 'Weg 1', zip: '12345', city: 'Ort', email: 'shop@x.de' }),
}))

const { prisma } = await import('../src/lib/prisma.js')
const { createDhlLabel } = await import('../src/services/dhl.js')
const { createOrderDhlLabel } = await import('../src/services/shipment-flow.js')
const { createApp } = await import('../src/app.js')
const { signSession, SESSION_COOKIE } = await import('../src/middleware/auth.js')

const deliveryAddress = {
  firstName: 'Max',
  lastName: 'Nachbar',
  company: 'Büro GmbH',
  street: 'Andere Str 9',
  zip: '1010',
  city: 'Wien',
  country: 'AT',
}

beforeEach(() => vi.clearAllMocks())

describe('createOrderDhlLabel', () => {
  it('labels the delivery address, not the billing address', async () => {
    vi.mocked(prisma.order.findUnique).mockResolvedValue({
      id: 'ord_1',
      orderNumber: 'B-1',
      status: 'paid',
      firstName: 'Erika',
      lastName: 'Muster',
      company: null,
      street: 'Str 1',
      zip: '10115',
      city: 'Berlin',
      country: 'DE',
      email: 'e@x.de',
      carrierEmailConsentAt: null,
      shippingCents: 1749,
      deliveryAddress,
      items: [],
      shipments: [
        {
          id: 'sh_1',
          shipmentNumber: 'VER-1',
          status: 'packed',
          labelPdfPath: null,
          shippedAt: null,
        },
      ],
    } as never)
    vi.mocked(prisma.shipmentItem.findMany).mockResolvedValue([
      { quantity: 1, orderItem: { unitPriceCents: 5000 } },
    ] as never)
    vi.mocked(prisma.shipment.updateMany).mockResolvedValue({ count: 1 })

    await createOrderDhlLabel({ orderId: 'ord_1', weightGrams: 900 })

    const sent = vi.mocked(createDhlLabel).mock.calls[0]![0]
    expect(sent.product).toBe('V53WPAK')
    expect(sent.consignee).toEqual({
      name1: 'Büro GmbH',
      name2: 'Max Nachbar',
      addressStreet: 'Andere Str 9',
      postalCode: '1010',
      city: 'Wien',
      country: 'AUT',
    })
  })
})

describe('PATCH /api/admin/orders/:id deliveryAddress', () => {
  let server: Server
  let baseUrl = ''
  const cookie = `${SESSION_COOKIE}=${signSession(
    { id: 'user_1', email: 'a@x.de', name: 'Admin', role: 'admin' },
    0,
  )}`

  beforeAll(async () => {
    server = createApp().listen(0)
    await new Promise((resolve) => server.once('listening', resolve))
    const address = server.address()
    if (!address || typeof address === 'string') throw new Error('No server port')
    baseUrl = `http://127.0.0.1:${address.port}`
  })
  afterAll(() => {
    server.close()
  })

  it('is refused while a DHL label with the old address is active', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 'user_1',
      email: 'a@x.de',
      name: 'Admin',
      active: true,
      role: { id: 'r', name: 'admin' },
      sessionVersion: 0,
      sessionsInvalidatedAt: null,
    } as never)
    vi.mocked(prisma.order.findUnique).mockResolvedValue({
      trackingNumber: null,
      shippedAt: null,
      shipments: [{ status: 'packed', labelPdfPath: '/x.pdf', shippedAt: null }],
    } as never)

    const res = await fetch(`${baseUrl}/api/admin/orders/ord_1`, {
      method: 'PATCH',
      headers: { cookie, 'content-type': 'application/json' },
      body: JSON.stringify({ deliveryAddress }),
    })

    expect(res.status).toBe(409)
    expect(prisma.order.updateMany).not.toHaveBeenCalled()
  })
})
