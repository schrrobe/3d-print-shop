import { describe, expect, it } from 'vitest'
import { mapMetaCapiError, toMetaEventsBody } from '../src/services/tracking/destinations/meta-capi.js'
import { MOCK_OUTBOX_FAILURE_MARKER, MockTrackingSender } from '../src/services/tracking/destinations/mock.js'
import type { PurchaseOutboxPayload } from '../src/services/tracking/destinations/sender.js'
import { TrackingSendError } from '../src/services/tracking/destinations/sender.js'
import { mapTikTokError, toTikTokBody } from '../src/services/tracking/destinations/tiktok-events.js'

function makePayload(overrides: Partial<PurchaseOutboxPayload> = {}): PurchaseOutboxPayload {
  return {
    v: 1,
    eventName: 'purchase',
    eventId: 'purchase:order-1',
    orderId: 'order-1',
    eventTime: 1_780_000_000,
    valueCents: 12_345,
    currency: 'EUR',
    eventSourceUrl: 'https://shop.example/lp',
    clientUserAgent: 'Mozilla/5.0 Test',
    fbc: 'fb.1.1751364000000.fb-click-1',
    ttclid: null,
    ...overrides,
  }
}

describe('toMetaEventsBody', () => {
  it('builds the exact Conversions API shape (cents → decimal value)', () => {
    const body = toMetaEventsBody(makePayload(), { accessToken: 'tok' })
    expect(body).toEqual({
      data: [
        {
          event_name: 'Purchase',
          event_time: 1_780_000_000,
          event_id: 'purchase:order-1',
          action_source: 'website',
          event_source_url: 'https://shop.example/lp',
          user_data: {
            fbc: 'fb.1.1751364000000.fb-click-1',
            client_user_agent: 'Mozilla/5.0 Test',
          },
          custom_data: { currency: 'EUR', value: 123.45 },
        },
      ],
      access_token: 'tok',
    })
  })

  it('omits null fields and includes test_event_code only when set', () => {
    const body = toMetaEventsBody(
      makePayload({ eventSourceUrl: null, clientUserAgent: null }),
      { accessToken: 'tok', testEventCode: 'TEST123' },
    ) as { data: [Record<string, unknown>]; test_event_code?: string }
    expect(body.test_event_code).toBe('TEST123')
    expect(body.data[0]).not.toHaveProperty('event_source_url')
    expect(body.data[0].user_data).toEqual({ fbc: 'fb.1.1751364000000.fb-click-1' })
  })
})

describe('mapMetaCapiError', () => {
  it('token errors are permanent', () => {
    const err = mapMetaCapiError(400, { error: { message: 'expired', code: 190 } })
    expect(err.code).toBe('meta_invalid_token')
    expect(err.retryable).toBe(false)
    expect(err.responseCode).toBe(400)
  })

  it('rate limits are retryable (Meta codes and plain HTTP 429)', () => {
    for (const code of [4, 17, 32, 613]) {
      expect(mapMetaCapiError(400, { error: { code } }).retryable).toBe(true)
    }
    expect(mapMetaCapiError(429, null).retryable).toBe(true)
  })

  it('server errors retry, other 4xx fail permanently', () => {
    expect(mapMetaCapiError(500, null).retryable).toBe(true)
    const invalid = mapMetaCapiError(400, { error: { message: 'bad param', code: 100 } })
    expect(invalid.retryable).toBe(false)
    expect(invalid.code).toBe('meta_invalid_request')
  })
})

describe('toTikTokBody', () => {
  it('builds the exact Events API shape with CompletePayment', () => {
    const body = toTikTokBody(makePayload({ fbc: null, ttclid: 'tt-click-1' }), {
      pixelCode: 'PIXEL1',
    })
    expect(body).toEqual({
      event_source: 'web',
      event_source_id: 'PIXEL1',
      data: [
        {
          event: 'CompletePayment',
          event_time: 1_780_000_000,
          event_id: 'purchase:order-1',
          user: { ttclid: 'tt-click-1', user_agent: 'Mozilla/5.0 Test' },
          page: { url: 'https://shop.example/lp' },
          properties: { currency: 'EUR', value: 123.45 },
        },
      ],
    })
  })

  it('omits page/test_event_code when unset', () => {
    const body = toTikTokBody(
      makePayload({ fbc: null, ttclid: 'tt-click-1', eventSourceUrl: null }),
      { pixelCode: 'PIXEL1', testEventCode: 'TIKTEST' },
    ) as { data: [Record<string, unknown>]; test_event_code?: string }
    expect(body.test_event_code).toBe('TIKTEST')
    expect(body.data[0]).not.toHaveProperty('page')
  })
})

describe('mapTikTokError', () => {
  it('HTTP 200 with non-zero body code is a permanent error (TikTok pitfall)', () => {
    const err = mapTikTokError(200, { code: 40002, message: 'invalid pixel' })
    expect(err.retryable).toBe(false)
    expect(err.code).toBe('tiktok_invalid_request')
    expect(err.message).toContain('40002')
  })

  it('429 and 5xx are retryable', () => {
    expect(mapTikTokError(429, null).retryable).toBe(true)
    expect(mapTikTokError(503, null).retryable).toBe(true)
  })
})

describe('MockTrackingSender', () => {
  it('succeeds with a 200 by default', async () => {
    const sender = new MockTrackingSender('meta_capi')
    await expect(sender.send(makePayload())).resolves.toEqual({ responseCode: 200 })
  })

  it('fails retryably when the order id carries the failure marker', async () => {
    const sender = new MockTrackingSender('tiktok_events')
    const payload = makePayload({ orderId: `e2e-${MOCK_OUTBOX_FAILURE_MARKER}-1` })
    await expect(sender.send(payload)).rejects.toSatisfy(
      (err: unknown) => err instanceof TrackingSendError && err.retryable,
    )
  })
})
