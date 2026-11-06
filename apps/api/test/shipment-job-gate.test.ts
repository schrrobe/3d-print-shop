import { expect, it, vi } from 'vitest'

vi.mock('../src/lib/prisma.js', () => ({ prisma: { printerJob: { findMany: vi.fn() } } }))

const { prisma } = await import('../src/lib/prisma.js')
const { openJobIdsReadyToShip } = await import('../src/services/shipment-flow.js')

it('returns open job ids when every job is ready_to_ship', async () => {
  vi.mocked(prisma.printerJob.findMany).mockResolvedValue([
    { id: 'a', status: 'ready_to_ship' },
  ] as never)
  await expect(openJobIdsReadyToShip('o1')).resolves.toEqual(['a'])
})

it('rejects with 409 while a job is still in production', async () => {
  vi.mocked(prisma.printerJob.findMany).mockResolvedValue([
    { id: 'a', status: 'ready_to_ship' },
    { id: 'b', status: 'printing' },
  ] as never)
  await expect(openJobIdsReadyToShip('o1')).rejects.toMatchObject({ status: 409 })
})
