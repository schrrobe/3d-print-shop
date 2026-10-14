import type { Server } from 'node:http'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../src/lib/prisma.js', () => ({
  prisma: {
    order: { findUnique: vi.fn() },
    $transaction: vi.fn(),
  },
}))
vi.mock('../src/services/email.js', () => ({ sendEmail: vi.fn().mockResolvedValue(undefined) }))
vi.mock('../src/services/ticket.js', () => ({
  allocateTicketNumber: vi.fn().mockResolvedValue('TIC-2026-00001'),
  ticketReplyToAddress: vi.fn().mockReturnValue(undefined),
}))

const { createApp } = await import('../src/app.js')
const { prisma } = await import('../src/lib/prisma.js')
const { sendEmail } = await import('../src/services/email.js')

const ticketCreate = vi.fn()
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
  vi.mocked(sendEmail).mockClear()
  ticketCreate.mockReset().mockImplementation(async ({ data }) => ({ id: 't1', ...data }))
  vi.mocked(prisma.$transaction).mockImplementation(async (fn: unknown) =>
    (fn as (tx: unknown) => unknown)({ ticket: { create: ticketCreate } }),
  )
})

const body = {
  name: 'Erika Muster',
  orderNumber: 'KB-2026-00000042',
  email: 'erika@example.com',
}

function post(payload: unknown) {
  return fetch(`${baseUrl}/api/withdrawals`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

describe('POST /api/withdrawals (§ 356a BGB)', () => {
  it('stores the declaration as withdrawal ticket and sends a receipt with content and time', async () => {
    vi.mocked(prisma.order.findUnique).mockResolvedValue({
      id: 'order_1',
      email: 'Erika@Example.com',
    } as never)

    const res = await post({ ...body, items: '1× Patronenbox 9mm' })

    expect(res.status).toBe(201)
    const json = await res.json()
    expect(json.ticketNumber).toBe('TIC-2026-00001')
    expect(Number.isNaN(Date.parse(json.receivedAt))).toBe(false)

    const data = ticketCreate.mock.calls[0]![0].data
    expect(data).toMatchObject({ category: 'withdrawal', orderId: 'order_1', email: body.email })
    expect(data.messages.create[0].body).toContain('1× Patronenbox 9mm')

    const receipt = vi.mocked(sendEmail).mock.calls.find((c) => c[1] === 'withdrawal_received')!
    expect(receipt[0]).toBe(body.email)
    expect(receipt[2].text).toContain(body.orderNumber)
    expect(receipt[2].text).toContain('1× Patronenbox 9mm')
    expect(receipt[2].text).toMatch(/Eingegangen am: .*\d{1,2}:\d{2}:\d{2}/)
    expect(vi.mocked(sendEmail).mock.calls.some((c) => c[1] === 'admin_notification')).toBe(true)
  })

  it('accepts a declaration with unknown order number but does not link it', async () => {
    vi.mocked(prisma.order.findUnique).mockResolvedValue(null)

    const res = await post(body)

    expect(res.status).toBe(201)
    expect(ticketCreate.mock.calls[0]![0].data.orderId).toBeNull()
  })

  it('does not link an order whose email differs', async () => {
    vi.mocked(prisma.order.findUnique).mockResolvedValue({
      id: 'order_1',
      email: 'someone-else@example.com',
    } as never)

    await post(body)

    expect(ticketCreate.mock.calls[0]![0].data.orderId).toBeNull()
  })

  it('rejects a declaration without the § 356a Abs. 2 data', async () => {
    const res = await post({ name: 'Erika' })
    expect(res.status).toBe(400)
    expect(ticketCreate).not.toHaveBeenCalled()
  })
})
