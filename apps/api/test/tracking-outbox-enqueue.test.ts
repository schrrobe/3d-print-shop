import { describe, expect, it } from 'vitest'
import type { PurchaseFanoutInput } from '../src/services/tracking/outbox.js'
import { buildPurchasePayloads } from '../src/services/tracking/outbox.js'

const startedAt = new Date('2026-07-01T10:00:00.000Z')
const paidAt = new Date('2026-07-02T12:30:45.500Z')

function makeInput(overrides: Partial<PurchaseFanoutInput> = {}): PurchaseFanoutInput {
  return {
    orderId: 'order-1',
    totalCents: 12_345,
    paidAt,
    consent: { statistics: true, marketing: true },
    session: {
      fbclid: 'fb-click-1',
      ttclid: 'tt-click-1',
      userAgent: 'Mozilla/5.0 Test',
      landingPath: '/products/vase?utm_source=meta',
      startedAt,
    },
    destinations: ['meta_capi', 'tiktok_events'],
    webUrl: 'https://shop.example',
    ...overrides,
  }
}

describe('buildPurchasePayloads', () => {
  it('builds one frozen payload per destination with matching click id', () => {
    const rows = buildPurchasePayloads(makeInput())

    expect(rows.map((r) => r.destination)).toEqual(['meta_capi', 'tiktok_events'])
    const meta = rows[0]!.payload
    expect(meta).toMatchObject({
      v: 1,
      eventName: 'purchase',
      eventId: 'purchase:order-1',
      orderId: 'order-1',
      eventTime: Math.floor(paidAt.getTime() / 1000),
      valueCents: 12_345,
      currency: 'EUR',
      eventSourceUrl: 'https://shop.example/products/vase?utm_source=meta',
      clientUserAgent: 'Mozilla/5.0 Test',
      fbc: `fb.1.${startedAt.getTime()}.fb-click-1`,
      ttclid: null,
    })
    expect(rows[1]!.payload).toMatchObject({ fbc: null, ttclid: 'tt-click-1' })
  })

  it('returns nothing without marketing consent', () => {
    expect(
      buildPurchasePayloads(makeInput({ consent: { statistics: true, marketing: false } })),
    ).toEqual([])
  })

  it('returns nothing without a session', () => {
    expect(buildPurchasePayloads(makeInput({ session: null }))).toEqual([])
  })

  it('skips destinations whose click id is missing (no PII fallback)', () => {
    const input = makeInput()
    input.session!.fbclid = null
    input.session!.ttclid = null
    expect(buildPurchasePayloads(input)).toEqual([])

    const fbOnly = makeInput()
    fbOnly.session!.ttclid = null
    const rows = buildPurchasePayloads(fbOnly)
    expect(rows).toHaveLength(1)
    expect(rows[0]!.destination).toBe('meta_capi')
  })

  it('skips destinations that are not enabled', () => {
    const rows = buildPurchasePayloads(makeInput({ destinations: ['tiktok_events'] }))
    expect(rows).toHaveLength(1)
    expect(rows[0]!.destination).toBe('tiktok_events')
  })

  it('placeholder sessions (landingPath "") produce no event_source_url', () => {
    const input = makeInput()
    input.session!.landingPath = ''
    const rows = buildPurchasePayloads(input)
    expect(rows[0]!.payload.eventSourceUrl).toBeNull()
  })

  it('a missing user agent stays null but the row is still built', () => {
    const input = makeInput()
    input.session!.userAgent = null
    const rows = buildPurchasePayloads(input)
    expect(rows).toHaveLength(2)
    expect(rows[0]!.payload.clientUserAgent).toBeNull()
  })

  it('strips a trailing slash from the web url', () => {
    const rows = buildPurchasePayloads(makeInput({ webUrl: 'https://shop.example/' }))
    expect(rows[0]!.payload.eventSourceUrl).toBe(
      'https://shop.example/products/vase?utm_source=meta',
    )
  })
})
