import type { Server } from 'node:http'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

const ticketCreate = vi.fn().mockResolvedValue({ ticketNumber: 'TIC-1' })
const orderFindUnique = vi.fn()
vi.mock('../src/lib/prisma.js', () => ({
  prisma: {
    order: { findUnique: orderFindUnique },
    $transaction: (fn: (tx: unknown) => unknown) => fn({ ticket: { create: ticketCreate } }),
  },
}))
vi.mock('../src/services/ticket.js', () => ({
  allocateTicketNumber: vi.fn().mockResolvedValue('TIC-1'),
  ticketReplyToAddress: () => undefined,
}))
vi.mock('../src/services/email.js', () => ({ sendEmail: vi.fn().mockResolvedValue(true) }))

const { createApp } = await import('../src/app.js')
const { sendEmail } = await import('../src/services/email.js')
const mockedSend = vi.mocked(sendEmail)

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
  ticketCreate.mockClear()
  mockedSend.mockClear()
})

const post = (body: unknown) =>
  fetch(`${baseUrl}/api/withdrawals`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })

const valid = { name: 'Max Muster', email: 'max@example.com', orderNumber: 'PS-2026-1' }

describe('POST /api/withdrawals', () => {
  it('rejects a declaration without name, order or email (§ 356a Abs. 2)', async () => {
    expect((await post({ ...valid, name: '' })).status).toBe(400)
    expect((await post({ ...valid, orderNumber: '' })).status).toBe(400)
    expect((await post({ ...valid, email: 'nope' })).status).toBe(400)
    expect(ticketCreate).not.toHaveBeenCalled()
  })

  it('files a high-priority ticket linked to the matching order and confirms receipt', async () => {
    orderFindUnique.mockResolvedValueOnce({ id: 'o1', email: 'MAX@example.com' })
    const res = await post({ ...valid, items: '1x 9 mm Box', message: 'spam http://x' })

    expect(res.status).toBe(201)
    const json = (await res.json()) as { ticketNumber: string; receivedAt: string }
    expect(json.ticketNumber).toBe('TIC-1')
    const data = ticketCreate.mock.calls[0]![0].data
    expect(data).toMatchObject({ orderId: 'o1', priority: 'high', category: 'order' })
    expect(data.messages.create[0].body).toContain('1x 9 mm Box')

    const [to, template, rendered] = mockedSend.mock.calls[0]!
    expect(to).toBe('max@example.com')
    expect(template).toBe('withdrawal_received')
    expect(rendered.html).toContain('PS-2026-1')
    expect(rendered.text).toContain('1x 9 mm Box')
    // free text stays in the ticket, never echoed to an unverified address
    expect(data.messages.create[0].body).toContain('spam http://x')
    expect(rendered.html).not.toContain('spam http://x')
  })

  it('still accepts the declaration when order and email do not match (no enumeration)', async () => {
    orderFindUnique.mockResolvedValueOnce({ id: 'o1', email: 'other@example.com' })
    const res = await post(valid)

    expect(res.status).toBe(201)
    expect(ticketCreate.mock.calls[0]![0].data.orderId).toBeNull()
    expect(mockedSend).toHaveBeenCalledOnce()
  })
})
