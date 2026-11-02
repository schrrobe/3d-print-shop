import type { Server } from 'node:http'
import { afterAll, beforeAll, beforeEach, expect, it, vi } from 'vitest'

vi.mock('../src/lib/prisma.js', () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    order: { findUnique: vi.fn() },
    printerJob: { findMany: vi.fn() },
    maintenanceWindow: { findMany: vi.fn() },
    printer: { findMany: vi.fn() },
    qcRecord: { findMany: vi.fn() },
    shipment: { findUnique: vi.fn() },
    color: { findMany: vi.fn() },
    productColorSlot: { findMany: vi.fn() },
  },
}))
vi.mock('../src/services/qc.js', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  jobsQcClearance: vi.fn().mockResolvedValue([]),
}))
vi.mock('../src/services/shipment-flow.js', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  shipmentJobIds: vi.fn().mockResolvedValue([]),
}))

const { createApp } = await import('../src/app.js')
const { prisma } = await import('../src/lib/prisma.js')
const { signSession, SESSION_COOKIE } = await import('../src/middleware/auth.js')

let server: Server
let baseUrl: string
// admin session: route permissions are covered elsewhere; here we check the color payload
const cookie = `${SESSION_COOKIE}=${signSession(
  { id: 'user_1', email: 'admin@example.com', name: 'Admin', role: 'admin' },
  0,
)}`

const coloredItem = {
  id: 'item_1',
  name: '9mm Box',
  quantity: 1,
  productId: 'prod_1',
  personalization: 'Max',
  colorSelection: { zone_2_accent: 'c_red', zone_1_main: 'c_black', zone_3_detail: 'c_gone' },
}
const plainItem = { id: 'item_2', name: 'Sonderbox', quantity: 1, productId: null, colorSelection: null }
const expectedColors = [
  { slot: 'zone_1_main', label: 'Korpus', name: 'Schwarz', hex: '#000000' },
  { slot: 'zone_2_accent', label: 'zone_2_accent', name: 'Rot', hex: '#ff0000' },
  { slot: 'zone_3_detail', label: 'zone_3_detail', name: 'Unbekannte Farbe', hex: null },
]

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
  vi.mocked(prisma.user.findUnique).mockResolvedValue({
    id: 'user_1',
    email: 'admin@example.com',
    name: 'Admin',
    active: true,
    sessionVersion: 0,
    sessionsInvalidatedAt: null,
    role: { name: 'admin' },
  } as never)
  vi.mocked(prisma.color.findMany).mockResolvedValue([
    { id: 'c_black', name: 'Schwarz', hex: '#000000' },
    { id: 'c_red', name: 'Rot', hex: '#ff0000' },
  ] as never)
  vi.mocked(prisma.productColorSlot.findMany).mockResolvedValue([
    { productId: 'prod_1', slot: 'zone_1_main', label: 'Korpus' },
  ] as never)
})

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`${baseUrl}${path}`, { headers: { cookie } })
  expect(res.status).toBe(200)
  return (await res.json()) as T
}

type WithColors = { colors: unknown[] }

it('order detail: resolves colors per item', async () => {
  vi.mocked(prisma.order.findUnique).mockResolvedValue({
    id: 'order_1',
    payments: [],
    items: [coloredItem, plainItem],
  } as never)
  const { order } = await getJson<{ order: { items: WithColors[] } }>('/api/admin/orders/order_1')
  expect(order.items[0]?.colors).toEqual(expectedColors)
  expect(order.items[1]?.colors).toEqual([])
})

it('production queue: resolves colors on job.orderItem', async () => {
  vi.mocked(prisma.printerJob.findMany).mockResolvedValue([
    { id: 'job_1', status: 'waiting', orderItem: coloredItem },
    { id: 'job_2', status: 'waiting', orderItem: null },
  ] as never)
  const { jobs } = await getJson<{ jobs: { orderItem: WithColors | null }[] }>(
    '/api/admin/production/queue',
  )
  expect(jobs[0]?.orderItem?.colors).toEqual(expectedColors)
  expect(jobs[1]?.orderItem).toBeNull()
})

it('production calendar: resolves colors for scheduled and unscheduled jobs', async () => {
  vi.mocked(prisma.printerJob.findMany)
    .mockResolvedValueOnce([{ id: 'job_1', orderItem: coloredItem }] as never)
    .mockResolvedValueOnce([{ id: 'job_2', orderItem: coloredItem }] as never)
  vi.mocked(prisma.maintenanceWindow.findMany).mockResolvedValue([] as never)
  vi.mocked(prisma.printer.findMany).mockResolvedValue([] as never)
  const body = await getJson<{
    jobs: { orderItem: WithColors }[]
    unscheduledJobs: { orderItem: WithColors }[]
  }>(
    '/api/admin/production/calendar?from=2026-11-02T00:00:00.000Z&to=2026-11-09T00:00:00.000Z',
  )
  expect(body.jobs[0]?.orderItem.colors).toEqual(expectedColors)
  expect(body.unscheduledJobs[0]?.orderItem.colors).toEqual(expectedColors)
})

it('qc: resolves colors for records and jobs in QC', async () => {
  vi.mocked(prisma.qcRecord.findMany).mockResolvedValue([
    { id: 'qc_1', printerJob: { id: 'job_1', orderItem: coloredItem } },
  ] as never)
  vi.mocked(prisma.printerJob.findMany).mockResolvedValue([
    { id: 'job_2', orderItem: coloredItem, qcRecords: [] },
  ] as never)
  const body = await getJson<{
    records: { printerJob: { orderItem: WithColors } }[]
    jobsInQc: { orderItem: WithColors }[]
  }>('/api/admin/qc')
  expect(body.records[0]?.printerJob.orderItem.colors).toEqual(expectedColors)
  expect(body.jobsInQc[0]?.orderItem.colors).toEqual(expectedColors)
})

it('shipment detail: resolves colors on items', async () => {
  vi.mocked(prisma.shipment.findUnique).mockResolvedValue({
    id: 'ship_1',
    items: [{ quantity: 1, orderItem: coloredItem }],
  } as never)
  const { shipment } = await getJson<{ shipment: { items: { orderItem: WithColors }[] } }>(
    '/api/admin/shipments/ship_1',
  )
  expect(shipment.items[0]?.orderItem.colors).toEqual(expectedColors)
})
