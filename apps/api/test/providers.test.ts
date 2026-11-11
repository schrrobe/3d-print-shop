import type { Server } from 'node:http'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../src/lib/prisma.js', () => {
  const prisma = {
    user: { findUnique: vi.fn() },
    order: { findUnique: vi.fn(), updateMany: vi.fn() },
    printProvider: { findUnique: vi.fn(), findMany: vi.fn() },
    providerAssignment: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    printerJob: { updateMany: vi.fn() },
    printer: { updateMany: vi.fn() },
    color: { findMany: vi.fn().mockResolvedValue([]) },
    productColorSlot: { findMany: vi.fn().mockResolvedValue([]) },
    $transaction: vi.fn(),
  }
  prisma.$transaction.mockImplementation((fn: (tx: unknown) => unknown) => fn(prisma))
  return { prisma }
})
vi.mock('../src/services/email.js', () => ({ sendEmail: vi.fn().mockResolvedValue(true) }))
vi.mock('../src/services/order-flow.js', () => ({ notifyProductionStarted: vi.fn() }))
vi.mock('../src/services/company.js', () => ({
  company: () => ({ name: 'Shop', street: 'Weg 1', zip: '12345', city: 'Ort', email: 'shop@x.de' }),
}))

const { prisma } = await import('../src/lib/prisma.js')
const { sendEmail } = await import('../src/services/email.js')
const { assignOrder, deliveryLines, setAssignmentStatus } =
  await import('../src/services/providers.js')
const { createApp } = await import('../src/app.js')
const { signSession, SESSION_COOKIE } = await import('../src/middleware/auth.js')

const item = {
  id: 'item_1',
  name: '9mm Box',
  quantity: 2,
  unitPriceCents: 5000,
  productId: null,
  colorSelection: null,
  personalization: 'Max',
}
const order = {
  id: 'ord_1',
  orderNumber: 'B-1',
  status: 'paid',
  subtotalCents: 10000,
  discountCents: 0,
  prepaymentDiscountCents: 500,
  firstName: 'Erika',
  lastName: 'Muster',
  company: null,
  street: 'Str 1',
  zip: '10115',
  city: 'Berlin',
  country: 'DE',
  deliveryAddress: null,
  items: [item],
  printerJobs: [{ id: 'job_1', status: 'assigned', printerId: 'pr_1' }],
  providerAssignments: [],
}
const provider = {
  id: 'prov_1',
  name: 'Druck GmbH',
  contactName: null,
  email: 'p@x.de',
  defaultRateBp: 1500,
  active: true,
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(prisma.order.findUnique).mockResolvedValue(order as never)
  vi.mocked(prisma.printProvider.findUnique).mockResolvedValue(provider as never)
  vi.mocked(prisma.providerAssignment.create).mockImplementation(
    ({ data }) => Promise.resolve({ id: 'as_1', createdAt: new Date(), ...data }) as never,
  )
  vi.mocked(prisma.providerAssignment.findUniqueOrThrow).mockImplementation(
    () =>
      Promise.resolve({
        id: 'as_1',
        createdAt: new Date(),
        rateBp: 1500,
        baseCents: 9500,
        payoutCents: 1425,
        shareCustomerData: true,
        note: null,
        provider,
        order,
      }) as never,
  )
  vi.mocked(prisma.providerAssignment.updateMany).mockResolvedValue({ count: 1 } as never)
  vi.mocked(prisma.order.updateMany).mockResolvedValue({ count: 1 } as never)
})

describe('assignOrder', () => {
  it('freezes rate and payout on goods value, frees the queue and mails a PDF', async () => {
    const { assignment, emailSent } = await assignOrder('ord_1', {
      providerId: 'prov_1',
      shareCustomerData: true,
      note: null,
    })
    // 100 € goods − 5 € Vorkasse discount = 95 €, 15 % → 14,25 €
    expect(assignment).toMatchObject({ rateBp: 1500, baseCents: 9500, payoutCents: 1425 })
    expect(prisma.printerJob.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'waiting', printerId: null }),
      }),
    )
    // Printer shared with another order's assigned job stays prepared.
    expect(prisma.printer.updateMany).toHaveBeenCalledWith({
      where: {
        id: { in: ['pr_1'] },
        status: 'prepared',
        jobs: { none: { status: 'assigned', orderId: { not: 'ord_1' } } },
      },
      data: { status: 'idle' },
    })
    expect(prisma.order.updateMany).toHaveBeenCalledWith({
      where: { id: 'ord_1', status: { in: ['paid', 'in_production'] } },
      data: { status: 'in_production' },
    })
    expect(emailSent).toBe(true)
    const call = vi.mocked(sendEmail).mock.calls.find((c) => c[1] === 'provider_order')!
    expect(call[0]).toBe('p@x.de')
    expect(call[3]?.[0]?.content.subarray(0, 4).toString()).toBe('%PDF')
  })

  it('rolls back when the order was cancelled after the read', async () => {
    vi.mocked(prisma.order.updateMany).mockResolvedValue({ count: 0 } as never)
    await expect(
      assignOrder('ord_1', { providerId: 'prov_1', shareCustomerData: false, note: null }),
    ).rejects.toMatchObject({ status: 409 })
    expect(prisma.providerAssignment.create).not.toHaveBeenCalled()
    expect(sendEmail).not.toHaveBeenCalled()
  })

  it('does not send a production order for an assignment cancelled meanwhile', async () => {
    vi.mocked(prisma.providerAssignment.findUniqueOrThrow).mockResolvedValue({
      id: 'as_1',
      status: 'cancelled',
      provider,
      order,
    } as never)
    const { emailSent } = await assignOrder('ord_1', {
      providerId: 'prov_1',
      shareCustomerData: false,
      note: null,
    })
    expect(emailSent).toBe(false)
    expect(vi.mocked(sendEmail).mock.calls.map((c) => c[1])).not.toContain('provider_order')
  })

  it('uses an explicit rate override', async () => {
    const { assignment } = await assignOrder('ord_1', {
      providerId: 'prov_1',
      rateBp: 2000,
      shareCustomerData: false,
      note: null,
    })
    expect(assignment).toMatchObject({ rateBp: 2000, payoutCents: 1900 })
  })

  it('refuses once a job is printing in-house', async () => {
    vi.mocked(prisma.order.findUnique).mockResolvedValue({
      ...order,
      printerJobs: [{ id: 'job_1', status: 'printing', printerId: 'pr_1' }],
    } as never)
    await expect(
      assignOrder('ord_1', { providerId: 'prov_1', shareCustomerData: false, note: null }),
    ).rejects.toMatchObject({ status: 409 })
  })

  it('cancels an open assignment of another provider and notifies it', async () => {
    vi.mocked(prisma.order.findUnique).mockResolvedValue({
      ...order,
      status: 'in_production',
      providerAssignments: [
        { id: 'old', status: 'assigned', provider: { ...provider, email: 'old@x.de' } },
      ],
    } as never)
    await assignOrder('ord_1', { providerId: 'prov_1', shareCustomerData: false, note: null })
    expect(prisma.providerAssignment.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'old', status: 'assigned' } }),
    )
    expect(vi.mocked(sendEmail).mock.calls.map((c) => [c[0], c[1]])).toContainEqual([
      'old@x.de',
      'provider_order_cancelled',
    ])
  })
})

describe('deliveryLines', () => {
  const shop = { name: 'Shop', street: 'Weg 1', zip: '12345', city: 'Ort' }

  it('without direct shipping names only the shop, never the customer', () => {
    const text = deliveryLines({ shareCustomerData: false }, order, shop).join('\n')
    expect(text).toContain('Shop, Weg 1, 12345 Ort')
    for (const pii of ['Erika', 'Muster', 'Str 1', '10115', 'Berlin'])
      expect(text).not.toContain(pii)
  })

  it('with direct shipping carries name and address', () => {
    expect(deliveryLines({ shareCustomerData: true }, order, shop)).toEqual([
      'Direktversand an:',
      'Erika Muster',
      'Str 1',
      '10115 Berlin, DE',
    ])
  })

  it('direct shipping goes to the delivery address when support set one', () => {
    const deliveryAddress = {
      firstName: 'Max',
      lastName: 'Nachbar',
      company: 'Büro GmbH',
      street: 'Andere Str 9',
      zip: '1010',
      city: 'Wien',
      country: 'AT',
    }
    expect(deliveryLines({ shareCustomerData: true }, { ...order, deliveryAddress }, shop)).toEqual(
      ['Direktversand an:', 'Max Nachbar', 'Büro GmbH', 'Andere Str 9', '1010 Wien, AT'],
    )
  })
})

describe('setAssignmentStatus', () => {
  const base = { id: 'as_1', orderId: 'ord_1', provider, order }

  it('direct shipping: completed puts jobs and order on ready_to_ship', async () => {
    vi.mocked(prisma.providerAssignment.findUnique).mockResolvedValue({
      ...base,
      status: 'assigned',
      shareCustomerData: true,
    } as never)
    await setAssignmentStatus('as_1', 'completed')
    expect(prisma.printerJob.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'ready_to_ship' }) }),
    )
    expect(prisma.order.updateMany).toHaveBeenCalledWith({
      where: { id: 'ord_1', status: 'in_production' },
      data: { status: 'ready_to_ship' },
    })
  })

  it('delivery to shop: completed leaves jobs alone, received sends them to QC', async () => {
    vi.mocked(prisma.providerAssignment.findUnique).mockResolvedValue({
      ...base,
      status: 'assigned',
      shareCustomerData: false,
    } as never)
    await setAssignmentStatus('as_1', 'completed')
    expect(prisma.printerJob.updateMany).not.toHaveBeenCalled()

    vi.mocked(prisma.providerAssignment.findUnique).mockResolvedValue({
      ...base,
      status: 'completed',
      shareCustomerData: false,
    } as never)
    await setAssignmentStatus('as_1', 'received')
    expect(prisma.printerJob.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: 'quality_check' } }),
    )
  })

  it('rejects received for direct shipping and cancel after completion', async () => {
    vi.mocked(prisma.providerAssignment.findUnique).mockResolvedValue({
      ...base,
      status: 'completed',
      shareCustomerData: true,
    } as never)
    await expect(setAssignmentStatus('as_1', 'received')).rejects.toMatchObject({ status: 409 })
    await expect(setAssignmentStatus('as_1', 'cancelled')).rejects.toMatchObject({ status: 409 })
  })
})

describe('permissions', () => {
  let server: Server
  let baseUrl = ''
  const productionCookie = `${SESSION_COOKIE}=${signSession(
    { id: 'user_2', email: 'prod@x.de', name: 'Prod', role: 'production' },
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
  beforeEach(() => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 'user_2',
      email: 'prod@x.de',
      name: 'Prod',
      active: true,
      role: { id: 'r', name: 'production' },
      sessionVersion: 0,
      sessionsInvalidatedAt: null,
    } as never)
  })

  const req = (path: string, init: RequestInit = {}) =>
    fetch(`${baseUrl}${path}`, {
      ...init,
      headers: { cookie: productionCookie, 'content-type': 'application/json' },
    })

  it('production may not open the provider report', async () => {
    const res = await req('/api/admin/providers?from=2026-01-01&to=2026-02-01')
    expect(res.status).toBe(403)
  })

  it('production may not override the rate', async () => {
    const res = await req('/api/admin/providers/assign/ord_1', {
      method: 'POST',
      body: JSON.stringify({ providerId: 'prov_1', rateBp: 9000 }),
    })
    expect(res.status).toBe(403)
    expect(prisma.providerAssignment.create).not.toHaveBeenCalled()
  })

  it('production sees the provider on an order but no amounts', async () => {
    vi.mocked(prisma.order.findUnique).mockResolvedValue({
      ...order,
      payments: [],
      invoice: null,
      tickets: [],
      printerJobs: [],
      providerAssignments: [
        {
          id: 'as_1',
          status: 'assigned',
          rateBp: 1500,
          baseCents: 9500,
          payoutCents: 1425,
          paidOutAt: null,
          provider: { id: 'prov_1', name: 'Druck GmbH' },
        },
      ],
    } as never)
    const res = await req('/api/admin/orders/ord_1')
    expect(res.status).toBe(200)
    const body = (await res.json()) as { order: { providerAssignments: Record<string, unknown>[] } }
    const a = body.order.providerAssignments[0]!
    expect(a.provider).toEqual({ id: 'prov_1', name: 'Druck GmbH' })
    expect(a).not.toHaveProperty('payoutCents')
    expect(a).not.toHaveProperty('rateBp')
    expect(a).not.toHaveProperty('baseCents')
  })
})
