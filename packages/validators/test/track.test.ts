import { describe, expect, it } from 'vitest'
import { parseTrackBatch, trackBatchSchema } from '../src/track.js'

const base = {
  v: 1 as const,
  sessionId: '0197fa3e-1111-7111-8111-111111111111',
  visitorId: null,
  consent: { statistics: true, marketing: false },
}

describe('trackBatchSchema', () => {
  it('accepts a valid client batch', () => {
    const parsed = trackBatchSchema.parse({
      ...base,
      events: [
        {
          eventId: '0197fa3f-2222-7222-8222-222222222222',
          name: 'add_to_cart',
          occurredAt: new Date().toISOString(),
          props: { productId: 'p1', quantity: 1 },
        },
      ],
    })
    expect(parsed.events).toHaveLength(1)
  })

  it('rejects server-only event names from the browser', () => {
    const res = trackBatchSchema.safeParse({
      ...base,
      events: [
        {
          eventId: '0197fa3f-2222-7222-8222-222222222222',
          name: 'purchase',
          occurredAt: new Date().toISOString(),
        },
      ],
    })
    expect(res.success).toBe(false)
  })

  it('rejects unknown top-level keys (strict)', () => {
    const res = trackBatchSchema.safeParse({
      ...base,
      revenueCents: 9999,
      events: [
        {
          eventId: '0197fa3f-2222-7222-8222-222222222222',
          name: 'page_view',
          occurredAt: new Date().toISOString(),
        },
      ],
    })
    expect(res.success).toBe(false)
  })

  it('rejects batches without statistics consent', () => {
    const res = trackBatchSchema.safeParse({
      ...base,
      consent: { statistics: false, marketing: false },
      events: [
        {
          eventId: '0197fa3f-2222-7222-8222-222222222222',
          name: 'page_view',
          occurredAt: new Date().toISOString(),
        },
      ],
    })
    expect(res.success).toBe(false)
  })

  it('rejects arbitrary event properties that could carry PII', () => {
    const res = trackBatchSchema.safeParse({
      ...base,
      events: [
        {
          eventId: '0197fa3f-2222-7222-8222-222222222222',
          name: 'page_view',
          occurredAt: new Date().toISOString(),
          props: { email: 'customer@example.com' },
        },
      ],
    })
    expect(res.success).toBe(false)
  })

  it('rejects batches over 20 events and empty batches', () => {
    const one = {
      eventId: '0197fa3f-2222-7222-8222-222222222222',
      name: 'page_view',
      occurredAt: new Date().toISOString(),
    }
    expect(trackBatchSchema.safeParse({ ...base, events: [] }).success).toBe(false)
    expect(trackBatchSchema.safeParse({ ...base, events: Array(21).fill(one) }).success).toBe(false)
  })

  it('rejects a props bag with too many keys', () => {
    const props = Object.fromEntries(Array.from({ length: 21 }, (_, i) => [`k${i}`, i]))
    const res = trackBatchSchema.safeParse({
      ...base,
      events: [
        {
          eventId: '0197fa3f-2222-7222-8222-222222222222',
          name: 'page_view',
          occurredAt: new Date().toISOString(),
          props,
        },
      ],
    })
    expect(res.success).toBe(false)
  })
})

describe('parseTrackBatch (per-event tolerance)', () => {
  const validEvent = {
    eventId: '0197fa3f-2222-7222-8222-222222222222',
    name: 'page_view',
    occurredAt: new Date().toISOString(),
  }

  it('keeps valid co-batched events when one event is malformed', () => {
    const { batch, droppedInvalid } = parseTrackBatch({
      ...base,
      events: [
        validEvent,
        // Out-of-range price: previously a single 400 dropped the whole batch.
        {
          eventId: '0197fa40-3333-7333-8333-333333333333',
          name: 'view_item',
          occurredAt: new Date().toISOString(),
          props: { priceCents: 100_000_001 },
        },
        {
          eventId: '0197fa41-4444-7444-8444-444444444444',
          name: 'add_to_cart',
          occurredAt: new Date().toISOString(),
        },
      ],
    })
    expect(droppedInvalid).toBe(1)
    expect(batch.events.map((e) => e.name)).toEqual(['page_view', 'add_to_cart'])
  })

  it('throws on a malformed envelope (bad session id / missing consent)', () => {
    expect(() => parseTrackBatch({ ...base, sessionId: 'not-a-uuid', events: [validEvent] })).toThrow()
    expect(() =>
      parseTrackBatch({ ...base, consent: { statistics: false, marketing: false }, events: [validEvent] }),
    ).toThrow()
  })

  it('drops server-only event names but keeps the rest', () => {
    const { batch, droppedInvalid } = parseTrackBatch({
      ...base,
      events: [
        validEvent,
        { eventId: '0197fa42-5555-7555-8555-555555555555', name: 'purchase', occurredAt: new Date().toISOString() },
      ],
    })
    expect(droppedInvalid).toBe(1)
    expect(batch.events).toHaveLength(1)
    expect(batch.events[0]?.name).toBe('page_view')
  })
})
