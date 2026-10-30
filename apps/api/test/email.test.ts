import { beforeEach, describe, expect, it, vi } from 'vitest'

const sendMail = vi.fn()
vi.mock('nodemailer', () => ({ default: { createTransport: () => ({ sendMail }) } }))
vi.mock('../src/env.js', () => ({ env: { SMTP_HOST: 'smtp.test', EMAIL_FROM: 'shop@test' } }))
vi.mock('../src/lib/prisma.js', () => ({ prisma: { emailLog: { create: vi.fn() } } }))

const { prisma } = await import('../src/lib/prisma.js')
const { sendEmail } = await import('../src/services/email.js')

const rendered = { subject: 'Rechnung', html: '<p>x</p>', text: 'x' }

beforeEach(() => vi.clearAllMocks())

describe('sendEmail', () => {
  it('reports an accepted email as delivered even if the log write fails', async () => {
    sendMail.mockResolvedValue({ rejected: [] })
    vi.mocked(prisma.emailLog.create).mockRejectedValue(new Error('db down'))

    await expect(sendEmail('kunde@example.com', 'invoice', rendered)).resolves.toBe(true)
  })

  it('reports an SMTP failure as not delivered and logs it', async () => {
    sendMail.mockRejectedValue(new Error('smtp down'))
    vi.mocked(prisma.emailLog.create).mockResolvedValue({} as never)

    await expect(sendEmail('kunde@example.com', 'invoice', rendered)).resolves.toBe(false)
    expect(prisma.emailLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ status: 'failed', error: 'Error: smtp down' }),
    })
  })
})
