import { describe, expect, it } from 'vitest'
import type { PurchaseFanoutInput } from '../src/services/tracking/outbox.js'
import { createHash } from 'node:crypto'
import type {
  OutboxPayload,
  TrackingDestination,
} from '../src/services/tracking/destinations/index.js'
import { buildPurchasePayloads, sendClientConversions } from '../src/services/tracking/outbox.js'

const emailHash = createHash('sha256').update('kunde@example.com').digest('hex')

const startedAt = new Date('2026-07-01T10:00:00.000Z')
const paidAt = new Date('2026-07-02T12:30:45.500Z')

function makeInput(overrides: Partial<PurchaseFanoutInput> = {}): PurchaseFanoutInput {
  return {
    orderId: 'order-1',
    totalCents: 12_345,
    email: ' Kunde@Example.com ',
    itemCount: 2,
    paidAt,
    attribution: null,
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
      emailHash,
      numItems: 2,
    })
    expect(rows[1]!.payload).toMatchObject({ fbc: null, ttclid: 'tt-click-1', emailHash })
  })

  it('prefers checkout cookies, IP and UA over session data', () => {
    const rows = buildPurchasePayloads(
      makeInput({
        attribution: {
          ip: '203.0.113.7',
          userAgent: 'Checkout UA',
          fbp: 'fb.1.1.fbp',
          fbc: 'fb.1.2.cookie-fbc',
          ttp: 'ttp-1',
        },
      }),
    )
    expect(rows[0]!.payload).toMatchObject({
      clientIp: '203.0.113.7',
      clientUserAgent: 'Checkout UA',
      fbp: 'fb.1.1.fbp',
      fbc: 'fb.1.2.cookie-fbc',
    })
    expect(rows[1]!.payload).toMatchObject({ ttp: 'ttp-1', clientIp: '203.0.113.7' })
  })

  it('returns nothing without marketing consent', () => {
    expect(
      buildPurchasePayloads(makeInput({ consent: { statistics: true, marketing: false } })),
    ).toEqual([])
  })

  it('sends without session or click ids (hashed email still matches)', () => {
    const rows = buildPurchasePayloads(makeInput({ session: null }))
    expect(rows.map((r) => r.destination)).toEqual(['meta_capi', 'tiktok_events'])
    expect(rows[0]!.payload).toMatchObject({
      fbc: null,
      emailHash,
      eventSourceUrl: 'https://shop.example/checkout',
    })
  })

  it('skips destinations that are not enabled', () => {
    const rows = buildPurchasePayloads(makeInput({ destinations: ['tiktok_events'] }))
    expect(rows).toHaveLength(1)
    expect(rows[0]!.destination).toBe('tiktok_events')
  })

  it('placeholder sessions (landingPath "") fall back to the checkout url', () => {
    const input = makeInput()
    input.session!.landingPath = ''
    const rows = buildPurchasePayloads(input)
    expect(rows[0]!.payload.eventSourceUrl).toBe('https://shop.example/checkout')
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

describe('sendClientConversions', () => {
  const occurredAt = new Date('2026-07-02T12:00:00.000Z')
  const db = { trackingSession: { findUnique: async () => null } } as never

  function fakeSenders() {
    const sent: { destination: string; payload: OutboxPayload }[] = []
    const sender = (destination: TrackingDestination) => ({
      destination,
      send: async (payload: OutboxPayload) => {
        sent.push({ destination, payload })
        return { responseCode: 200 }
      },
    })
    return {
      sent,
      senders: { meta_capi: sender('meta_capi'), tiktok_events: sender('tiktok_events') },
    }
  }

  it('sends conversion events with value and the shared event id; skips others', async () => {
    const { sent, senders } = fakeSenders()
    await sendClientConversions(db, {
      sessionId: 's1',
      webUrl: 'https://shop.example',
      senders,
      attribution: { ip: '203.0.113.7', userAgent: 'UA', fbp: 'fb.1.1.fbp', ttp: 'ttp-1' },
      clickIds: { ttclid: 'tt-click-1' },
      events: [
        {
          eventId: 'e1',
          name: 'add_to_cart',
          path: '/products/vase?x=1',
          occurredAt,
          props: { productId: 'p1', quantity: 2, unitPriceCents: 1_500 },
        },
        { eventId: 'e2', name: 'page_view', path: '/', occurredAt },
        { eventId: 'e3', name: 'remove_from_cart', path: '/cart', occurredAt },
        { eventId: 'e4', name: 'page_view', path: '/order/123', occurredAt },
      ],
    })
    // mock provider → both destinations; TikTok has no server page view; sensitive path dropped
    expect(sent.map((r) => `${r.payload.eventId}:${r.destination}`)).toEqual([
      'e1:meta_capi',
      'e1:tiktok_events',
      'e2:meta_capi',
    ])
    expect(sent[0]!.payload).toMatchObject({
      eventName: 'add_to_cart',
      valueCents: 3_000,
      contentId: 'p1',
      numItems: 2,
      clientIp: '203.0.113.7',
      fbp: 'fb.1.1.fbp',
      eventSourceUrl: 'https://shop.example/products/vase',
      eventTime: Math.floor(occurredAt.getTime() / 1000),
    })
    expect(sent[1]!.payload).toMatchObject({ ttp: 'ttp-1', ttclid: 'tt-click-1' })
  })
})
