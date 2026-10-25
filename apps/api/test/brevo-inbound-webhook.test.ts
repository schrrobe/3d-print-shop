import type { Server } from 'node:http'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

process.env.BREVO_INBOUND_WEBHOOK_TOKEN = 'test-token'
process.env.TICKET_REPLY_DOMAIN = 'reply.example.com'

vi.mock('../src/lib/prisma.js', () => ({ prisma: {} }))
vi.mock('../src/services/ticket.js', () => ({
  processInboundTicketEmail: vi.fn().mockResolvedValue({ outcome: 'skipped', reason: 'no_token' }),
}))

const { createApp } = await import('../src/app.js')
const { processInboundTicketEmail } = await import('../src/services/ticket.js')
const mockedProcess = vi.mocked(processInboundTicketEmail)

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
  mockedProcess.mockClear()
})

function post(body: unknown, authorization?: string) {
  return fetch(`${baseUrl}/api/webhooks/brevo-inbound`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(authorization ? { authorization } : {}) },
    body: JSON.stringify(body),
  })
}

describe('POST /api/webhooks/brevo-inbound', () => {
  it('rejects a missing or wrong bearer token', async () => {
    expect((await post({ items: [] })).status).toBe(401)
    expect((await post({ items: [] }, 'Bearer nope')).status).toBe(401)
    expect(mockedProcess).not.toHaveBeenCalled()
  })

  it('maps each Brevo item onto the inbound ticket pipeline', async () => {
    const res = await post(
      {
        items: [
          {
            MessageId: '<abc@mail.example>',
            From: { Address: 'kunde@example.com' },
            Recipients: [{ Address: 'ticket+TOKEN@reply.example.com' }],
            To: [{ Address: 'Support <support@example.com>' }],
            RawTextBody: 'Danke!',
            RawHtmlBody: null,
            Headers: { 'Auto-Submitted': 'no', Received: ['a', 'b'] },
          },
        ],
      },
      'Bearer test-token',
    )

    expect(res.status).toBe(200)
    expect(mockedProcess).toHaveBeenCalledWith({
      to: ['ticket+TOKEN@reply.example.com', 'Support <support@example.com>'],
      text: 'Danke!',
      html: null,
      headers: { 'Auto-Submitted': 'no', Received: 'a, b' },
      inboundEmailId: '<abc@mail.example>',
      replyDomain: 'reply.example.com',
    })
  })
})
