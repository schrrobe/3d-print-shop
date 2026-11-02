import type { Server } from 'node:http'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../src/lib/prisma.js', () => ({
  prisma: { payment: { findFirst: vi.fn(), updateMany: vi.fn() } },
}))
vi.mock('../src/services/email.js', () => ({ sendEmail: vi.fn().mockResolvedValue(true) }))
vi.mock('../src/services/order-flow.js', () => ({ markOrderPaid: vi.fn() }))

const { createApp } = await import('../src/app.js')
const { prisma } = await import('../src/lib/prisma.js')
const { sendEmail } = await import('../src/services/email.js')
const { markOrderPaid } = await import('../src/services/order-flow.js')

const findFirst = vi.mocked(prisma.payment.findFirst)
const updateMany = vi.mocked(prisma.payment.updateMany)
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
  vi.clearAllMocks()
  updateMany.mockResolvedValue({ count: 1 })
})

function payment(status: string, orderStatus: string, reference: string | null = null) {
  return {
    id: 'pay_1',
    orderId: 'order_1',
    status,
    reference,
    amountCents: 5699,
    order: { id: 'order_1', orderNumber: 'PS-1', status: orderStatus },
  } as never
}

/** Mock mode (no STRIPE_SECRET_KEY): the raw JSON body is the event. */
function completed(sessionId: string) {
  return fetch(`${baseUrl}/api/webhooks/stripe`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      type: 'checkout.session.completed',
      data: {
        object: {
          id: sessionId,
          payment_link: 'plink_1',
          payment_status: 'paid',
          currency: 'eur',
          amount_total: 5699,
        },
      },
    }),
  })
}

const refundAlert = () =>
  vi.mocked(sendEmail).mock.calls.filter(([, template]) => template === 'admin_notification')

describe('POST /api/webhooks/stripe', () => {
  it('marks a pending payment-link payment paid and claims the session', async () => {
    findFirst.mockResolvedValue(payment('pending', 'awaiting_payment'))

    expect((await completed('cs_1')).status).toBe(200)
    expect(updateMany).toHaveBeenCalledWith({
      where: { id: 'pay_1', OR: [{ reference: null }, { reference: 'cs_1' }] },
      data: { reference: 'cs_1' },
    })
    expect(vi.mocked(markOrderPaid)).toHaveBeenCalledWith('order_1', 'pay_1')
    expect(refundAlert()).toHaveLength(0)
  })

  it('acknowledges a payment on a cancelled order and alerts an admin', async () => {
    findFirst.mockResolvedValue(payment('expired', 'cancelled'))

    expect((await completed('cs_1')).status).toBe(200)
    expect(vi.mocked(markOrderPaid)).not.toHaveBeenCalled()
    expect(refundAlert()).toHaveLength(1)
  })

  it('alerts on a second session paying the same link, but not on a retry', async () => {
    findFirst.mockResolvedValue(payment('paid', 'paid', 'cs_1'))

    expect((await completed('cs_1')).status).toBe(200)
    expect(refundAlert()).toHaveLength(0)

    expect((await completed('cs_2')).status).toBe(200)
    expect(vi.mocked(markOrderPaid)).not.toHaveBeenCalled()
    expect(refundAlert()).toHaveLength(1)
  })

  it('alerts when a concurrent session already claimed the pending payment', async () => {
    findFirst.mockResolvedValue(payment('pending', 'awaiting_payment', 'cs_1'))
    updateMany.mockResolvedValue({ count: 0 })

    expect((await completed('cs_2')).status).toBe(200)
    expect(vi.mocked(markOrderPaid)).not.toHaveBeenCalled()
    expect(refundAlert()).toHaveLength(1)
  })
})
