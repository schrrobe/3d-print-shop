import type { Server } from 'node:http'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../src/lib/prisma.js', () => {
  const prisma = {
    user: { findUnique: vi.fn() },
    order: { findUnique: vi.fn(), updateMany: vi.fn() },
    shipmentItem: { findMany: vi.fn() },
    shipment: {
      findMany: vi.fn(),
      updateMany: vi.fn(),
      findUniqueOrThrow: vi.fn(),
    },
    providerAssignment: { count: vi.fn().mockResolvedValue(0) },
    $queryRaw: vi.fn(),
    $transaction: vi.fn(),
  }
  // Interactive transactions run against the same mock.
  prisma.$transaction.mockImplementation((fn: (tx: unknown) => unknown) => fn(prisma))
  return { prisma }
})
vi.mock('../src/services/dhl.js', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  createDhlLabel: vi.fn(),
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
const items = [
  { id: 'item_1', quantity: 2 },
  { id: 'item_2', quantity: 1 },
]
const packed = (covered: { orderItemId: string; quantity: number }[]) => ({
  id: 'sh_1',
  shipmentNumber: 'VER-1',
  status: 'packed',
  labelPdfPath: null,
  shippedAt: null,
  items: covered,
})
const order = {
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
  items,
  shipments: [],
}
const activeLabel = { status: 'packed', labelPdfPath: '/x.pdf', shippedAt: null }

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(prisma.$queryRaw).mockResolvedValue([{ locked: true }] as never)
  vi.mocked(createDhlLabel).mockResolvedValue({
    shipmentNo: '00340434161094042557',
    pdf: Buffer.from('%PDF-'),
    warnings: [],
  })
})

describe('createOrderDhlLabel', () => {
  it('labels the delivery address, not the billing address', async () => {
    vi.mocked(prisma.order.findUnique).mockResolvedValue(order as never)
    vi.mocked(prisma.shipment.findMany).mockResolvedValue([
      packed([
        { orderItemId: 'item_1', quantity: 2 },
        { orderItemId: 'item_2', quantity: 1 },
      ]),
    ] as never)
    vi.mocked(prisma.shipmentItem.findMany).mockResolvedValue([
      { quantity: 3, orderItem: { unitPriceCents: 5000 } },
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

  it('refuses a packed partial shipment instead of labelling half the order', async () => {
    vi.mocked(prisma.order.findUnique).mockResolvedValue(order as never)
    vi.mocked(prisma.shipment.findMany).mockResolvedValue([
      packed([{ orderItemId: 'item_1', quantity: 2 }]),
    ] as never)

    await expect(createOrderDhlLabel({ orderId: 'ord_1', weightGrams: 900 })).rejects.toMatchObject(
      { status: 409 },
    )
    expect(createDhlLabel).not.toHaveBeenCalled()
  })

  it('refuses while another label operation holds the order lock', async () => {
    vi.mocked(prisma.$queryRaw).mockResolvedValueOnce([{ locked: false }] as never)

    await expect(createOrderDhlLabel({ orderId: 'ord_1', weightGrams: 900 })).rejects.toMatchObject(
      { status: 409 },
    )
    expect(createDhlLabel).not.toHaveBeenCalled()
  })
})

describe('order routes vs. an active DHL label (checked under the order lock)', () => {
  let server: Server
  let baseUrl = ''
  const cookie = `${SESSION_COOKIE}=${signSession(
    { id: 'user_1', email: 'a@x.de', name: 'Admin', role: 'admin' },
    0,
  )}`
  const req = (path: string, init: RequestInit) =>
    fetch(`${baseUrl}${path}`, {
      ...init,
      headers: { cookie, 'content-type': 'application/json' },
    })

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
  beforeEach(() => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 'user_1',
      email: 'a@x.de',
      name: 'Admin',
      active: true,
      role: { id: 'r', name: 'admin' },
      sessionVersion: 0,
      sessionsInvalidatedAt: null,
    } as never)
  })

  it('refuses a delivery address change while the label with the old address is active', async () => {
    vi.mocked(prisma.order.findUnique).mockResolvedValue({
      trackingNumber: null,
      shippedAt: null,
    } as never)
    vi.mocked(prisma.shipment.findMany).mockResolvedValue([activeLabel] as never)

    const res = await req('/api/admin/orders/ord_1', {
      method: 'PATCH',
      body: JSON.stringify({ deliveryAddress }),
    })

    expect(res.status).toBe(409)
    expect(prisma.order.updateMany).not.toHaveBeenCalled()
  })

  it('refuses to cancel the order when a label became active after the first read', async () => {
    // First read: no label yet; under the lock the label (created meanwhile) is active.
    vi.mocked(prisma.order.findUnique).mockResolvedValue({
      id: 'ord_1',
      status: 'paid',
      payments: [],
      shipments: [],
    } as never)
    vi.mocked(prisma.shipment.findMany).mockResolvedValue([activeLabel] as never)

    const res = await req('/api/admin/orders/ord_1/status', {
      method: 'POST',
      body: JSON.stringify({ status: 'cancelled' }),
    })

    expect(res.status).toBe(409)
    expect(prisma.order.updateMany).not.toHaveBeenCalled()
  })
})
