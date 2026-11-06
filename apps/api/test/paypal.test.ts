import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type * as PaypalModule from '../src/services/payments/paypal.js'

type Paypal = typeof PaypalModule

const fetchMock = vi.fn<typeof fetch>()
let paypal: Paypal

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
const tokenResponse = () => json({ access_token: 'tok', expires_in: 3600 })
const calls = (path: string) => fetchMock.mock.calls.filter(([url]) => String(url).endsWith(path))

describe('PayPal client (live mode, mocked fetch)', () => {
  beforeEach(async () => {
    vi.stubEnv('PAYPAL_CLIENT_ID', 'client')
    vi.stubEnv('PAYPAL_CLIENT_SECRET', 'secret')
    vi.stubEnv('PAYPAL_WEBHOOK_ID', 'WH-1')
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
    vi.resetModules() // fresh env parse and token cache
    paypal = await import('../src/services/payments/paypal.js')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it('is enabled and not mocked with a client id', () => {
    expect(paypal.isPaypalEnabled()).toBe(true)
    expect(paypal.isPaypalMock()).toBe(false)
  })

  it('caches the OAuth token across calls', async () => {
    fetchMock.mockImplementation(async (url) =>
      String(url).endsWith('/v1/oauth2/token')
        ? tokenResponse()
        : json({ id: 'PP1', links: [{ rel: 'payer-action', href: 'https://paypal/approve' }] }),
    )
    const params = {
      orderNumber: 'PS-1',
      accessToken: 'acc',
      amountCents: 5699,
      locale: 'de',
      description: 'Bestellung PS-1',
    }
    await paypal.createPaypalOrder(params)
    await paypal.createPaypalOrder(params)
    expect(calls('/v1/oauth2/token')).toHaveLength(1)
    const [url, init] = calls('/v1/oauth2/token')[0]!
    expect(String(url)).toBe('https://api-m.sandbox.paypal.com/v1/oauth2/token')
    expect((init?.headers as Record<string, string>).authorization).toBe(
      `Basic ${Buffer.from('client:secret').toString('base64')}`,
    )
  })

  it('creates a CAPTURE order in EUR with the redirect experience context', async () => {
    fetchMock
      .mockResolvedValueOnce(tokenResponse())
      .mockResolvedValueOnce(
        json({ id: 'PP1', links: [{ rel: 'payer-action', href: 'https://paypal/approve' }] }),
      )
    const result = await paypal.createPaypalOrder({
      orderNumber: 'PS-1',
      accessToken: 'acc',
      amountCents: 5699,
      locale: 'en',
      description: 'Bestellung PS-1',
    })
    expect(result).toEqual({ id: 'PP1', approveUrl: 'https://paypal/approve' })
    const body = JSON.parse(String(calls('/v2/checkout/orders')[0]![1]?.body))
    expect(body.intent).toBe('CAPTURE')
    expect(body.purchase_units[0].amount).toEqual({ currency_code: 'EUR', value: '56.99' })
    const ctx = body.payment_source.paypal.experience_context
    expect(ctx).toMatchObject({
      user_action: 'PAY_NOW',
      shipping_preference: 'NO_SHIPPING',
      locale: 'en-GB',
    })
    expect(ctx.return_url).toContain('/api/payments/paypal/return?order=PS-1&access=acc')
    expect(ctx.cancel_url).toContain('/api/payments/paypal/return?order=PS-1&access=acc&cancelled=1')
  })

  it('captures with an idempotency key and reads back an already captured order', async () => {
    const order = {
      purchase_units: [
        {
          payments: {
            captures: [
              { id: 'CAP1', status: 'COMPLETED', amount: { value: '56.99', currency_code: 'EUR' } },
            ],
          },
        },
      ],
    }
    fetchMock
      .mockResolvedValueOnce(tokenResponse())
      .mockResolvedValueOnce(json(order, 201))
      .mockResolvedValueOnce(
        json({ name: 'UNPROCESSABLE_ENTITY', details: [{ issue: 'ORDER_ALREADY_CAPTURED' }] }, 422),
      )
      .mockResolvedValueOnce(json(order))

    const expected = { captureId: 'CAP1', status: 'COMPLETED', amountCents: 5699, currency: 'EUR' }
    expect(await paypal.capturePaypalOrder('PP1')).toEqual(expected)
    const init = calls('/v2/checkout/orders/PP1/capture')[0]![1]
    expect((init?.headers as Record<string, string>)['paypal-request-id']).toBe('capture-PP1')

    expect(await paypal.capturePaypalOrder('PP1')).toEqual(expected)
    expect(calls('/v2/checkout/orders/PP1')[0]![1]?.method).toBe('GET')
  })

  it('propagates other capture errors', async () => {
    fetchMock
      .mockResolvedValueOnce(tokenResponse())
      .mockResolvedValueOnce(json({ details: [{ issue: 'INSTRUMENT_DECLINED' }] }, 422))
    await expect(paypal.capturePaypalOrder('PP1')).rejects.toMatchObject({
      issue: 'INSTRUMENT_DECLINED',
    })
  })

  it.each([
    ['COMPLETED', 'succeeded'],
    ['PENDING', 'pending'],
    ['CANCELLED', 'failed'],
    ['FAILED', 'failed'],
  ])('maps refund status %s to %s', async (paypalStatus, status) => {
    fetchMock
      .mockResolvedValueOnce(tokenResponse())
      .mockResolvedValueOnce(json({ id: 'R1', status: paypalStatus }, 201))
    const refund = await paypal.refundPaypalCapture({
      captureId: 'CAP1',
      amountCents: 1000,
      requestId: 'refund-1',
    })
    expect(refund).toMatchObject({ id: 'R1', status })
    const [url, init] = fetchMock.mock.calls[1]!
    expect(String(url)).toContain('/v2/payments/captures/CAP1/refund')
    expect((init?.headers as Record<string, string>)['paypal-request-id']).toBe('refund-1')
    expect(JSON.parse(String(init?.body))).toEqual({
      amount: { currency_code: 'EUR', value: '10.00' },
    })
  })

  it('verifies webhooks with the raw event and the configured webhook id', async () => {
    fetchMock
      .mockResolvedValueOnce(tokenResponse())
      .mockResolvedValueOnce(json({ verification_status: 'FAILURE' }))
    const raw = Buffer.from('{"event_type":"X",  "resource":{}}')
    const headers: Record<string, string> = {
      'paypal-auth-algo': 'SHA256withRSA',
      'paypal-cert-url': 'https://api.paypal.com/v1/notifications/certs/CERT-1',
      'paypal-transmission-id': 't1',
      'paypal-transmission-sig': 'sig',
      'paypal-transmission-time': '2026-01-01T00:00:00Z',
    }
    expect(await paypal.verifyPaypalWebhook(raw, (n) => headers[n])).toBe(false)
    const body = String(fetchMock.mock.calls[1]![1]?.body)
    expect(body).toContain('"webhook_id":"WH-1"')
    expect(body.endsWith(',"webhook_event":{"event_type":"X",  "resource":{}}}')).toBe(true)

    // Missing headers, foreign cert hosts and other algorithms are rejected without asking PayPal.
    const calls = fetchMock.mock.calls.length
    expect(await paypal.verifyPaypalWebhook(raw, () => undefined)).toBe(false)
    const forged: Record<string, string> = { ...headers, 'paypal-cert-url': 'https://evil.example/cert' }
    expect(await paypal.verifyPaypalWebhook(raw, (n) => forged[n])).toBe(false)
    const algo: Record<string, string> = { ...headers, 'paypal-auth-algo': 'none' }
    expect(await paypal.verifyPaypalWebhook(raw, (n) => algo[n])).toBe(false)
    expect(fetchMock.mock.calls.length).toBe(calls)
  })
})

describe('PayPal client (mock mode)', () => {
  it('creates mock orders that capture and refund without network', async () => {
    vi.resetModules()
    const mock = await import('../src/services/payments/paypal.js')
    expect(mock.isPaypalMock()).toBe(true)
    expect(mock.isPaypalEnabled()).toBe(true)
    const order = await mock.createPaypalOrder({
      orderNumber: 'PS-1',
      accessToken: 'acc',
      amountCents: 4200,
      locale: 'de',
      description: 'x',
    })
    expect(order.id).toMatch(/^mock_pp_4200_/)
    expect(order.approveUrl).toContain(
      `/api/payments/paypal/return?order=PS-1&access=acc&token=${order.id}`,
    )
    expect(await mock.capturePaypalOrder(order.id)).toMatchObject({
      status: 'COMPLETED',
      amountCents: 4200,
      currency: 'EUR',
    })
    expect(
      await mock.refundPaypalCapture({ captureId: 'c', amountCents: 1, requestId: 'r' }),
    ).toMatchObject({ id: expect.stringMatching(/^mock_ppr_/), status: 'succeeded' })
  })
})
