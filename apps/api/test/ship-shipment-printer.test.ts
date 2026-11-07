import { expect, it, vi } from 'vitest'

const tx = {
  shipment: { update: vi.fn().mockResolvedValue({ id: 's1' }) },
  order: { update: vi.fn() },
  printerJob: { findMany: vi.fn(), updateMany: vi.fn() },
  printer: { updateMany: vi.fn() },
  shipmentStatusEvent: { create: vi.fn() },
}

vi.mock('../src/lib/prisma.js', () => ({
  prisma: {
    shipment: { findUnique: vi.fn() },
    $transaction: vi.fn((fn: (t: typeof tx) => unknown) => fn(tx)),
  },
}))
vi.mock('../src/services/order-flow.js', () => ({ notifyShipped: vi.fn() }))

const { prisma } = await import('../src/lib/prisma.js')
const { shipShipment } = await import('../src/services/shipment-flow.js')

const packedShipment = { id: 's1', orderId: 'o1', status: 'packed', order: { status: 'paid' } }

it('rejects a shipment with 409 while a job of the order is still in production', async () => {
  vi.mocked(prisma.shipment.findUnique).mockResolvedValue(packedShipment as never)
  tx.printerJob.findMany.mockResolvedValue([{ status: 'ready_to_ship' }, { status: 'waiting' }])

  await expect(
    shipShipment({ shipmentId: 's1', carrier: 'dhl', trackingNumber: 'DHL-1234' }),
  ).rejects.toMatchObject({ status: 409 })
  expect(tx.printerJob.updateMany).not.toHaveBeenCalled()
})

it('closeAllJobs frees the printer of a job closed mid-print and ships every open job', async () => {
  vi.mocked(prisma.shipment.findUnique).mockResolvedValue(packedShipment as never)
  tx.printerJob.findMany.mockResolvedValue([{ printerId: 'p1' }])

  await shipShipment({
    shipmentId: 's1',
    carrier: 'dhl',
    trackingNumber: 'DHL-1234',
    closeAllJobs: true,
  })

  expect(tx.printer.updateMany).toHaveBeenCalledWith({
    where: { id: { in: ['p1'] } },
    data: { status: 'idle' },
  })
  expect(tx.printerJob.updateMany).toHaveBeenCalledWith({
    where: { orderId: 'o1', status: { not: 'shipped' } },
    data: { status: 'shipped' },
  })
})
