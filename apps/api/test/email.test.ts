import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../src/lib/prisma.js', () => ({
  prisma: { emailLog: { create: vi.fn().mockResolvedValue({}) } },
}))

// env is parsed at module load — stub before importing.
vi.stubEnv('BREVO_API_KEY', 'test-brevo-key')
vi.stubEnv('EMAIL_FROM', 'Print Shop <noreply@shop.example>')

const { sendEmail } = await import('../src/services/email.js')
const { prisma } = await import('../src/lib/prisma.js')
const mockedLogCreate = vi.mocked(prisma.emailLog.create)

const rendered = { subject: 'Rechnung', html: '<p>Hallo</p>', text: 'Hallo' }
const fetchMock = vi.fn()
vi.stubGlobal('fetch', fetchMock)

beforeEach(() => {
  fetchMock.mockReset()
  mockedLogCreate.mockClear()
})

describe('sendEmail via Brevo', () => {
  it('posts the Brevo payload and logs sent', async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 201 })

    await sendEmail(
      'kunde@example.com',
      'invoice',
      rendered,
      [{ filename: 'R-1.pdf', content: Buffer.from('pdf') }],
      {
        replyTo: 'ticket+abc@reply.shop.example',
      },
    )

    const [url, init] = fetchMock.mock.calls[0]!
    expect(url).toBe('https://api.brevo.com/v3/smtp/email')
    expect(init.headers['api-key']).toBe('test-brevo-key')
    expect(JSON.parse(init.body)).toEqual({
      sender: { name: 'Print Shop', email: 'noreply@shop.example' },
      to: [{ email: 'kunde@example.com' }],
      subject: 'Rechnung',
      htmlContent: '<p>Hallo</p>',
      textContent: 'Hallo',
      replyTo: { email: 'ticket+abc@reply.shop.example' },
      attachment: [{ name: 'R-1.pdf', content: Buffer.from('pdf').toString('base64') }],
    })
    expect(mockedLogCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ status: 'sent' }),
    })
  })

  it('logs failed on a non-2xx response without throwing', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 400, text: async () => 'sender not verified' })

    await expect(sendEmail('kunde@example.com', 'magic_link', rendered)).resolves.toBeUndefined()

    expect(mockedLogCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        status: 'failed',
        error: expect.stringContaining('Brevo 400'),
      }),
    })
  })
})
