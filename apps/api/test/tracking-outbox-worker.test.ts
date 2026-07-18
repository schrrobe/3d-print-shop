import { describe, expect, it } from 'vitest'
import type {
  PurchaseOutboxPayload,
  TrackingEventSender,
} from '../src/services/tracking/destinations/sender.js'
import { TrackingSendError } from '../src/services/tracking/destinations/sender.js'
import type { TrackingOutboxDelegate } from '../src/services/tracking/outbox.js'
import { computeNextAttemptAt, processDueOutboxRows } from '../src/services/tracking/outbox.js'

type OutboxStatus = 'pending' | 'sending' | 'sent' | 'failed' | 'skipped'

interface FakeRow {
  id: string
  destination: string
  status: OutboxStatus
  payload: unknown
  attempts: number
  nextAttemptAt: Date
  lockUntil: Date | null
  lastError: string | null
  responseCode: number | null
  sentAt: Date | null
}

function makePayload(overrides: Partial<PurchaseOutboxPayload> = {}): PurchaseOutboxPayload {
  return {
    v: 1,
    eventName: 'purchase',
    eventId: 'purchase:order-1',
    orderId: 'order-1',
    eventTime: Math.floor(Date.now() / 1000) - 3600,
    valueCents: 12_345,
    currency: 'EUR',
    eventSourceUrl: 'https://shop.example/lp',
    clientUserAgent: 'Mozilla/5.0 Test',
    fbc: 'fb.1.1751364000000.fb-click-1',
    ttclid: null,
    ...overrides,
  }
}

function makeRow(overrides: Partial<FakeRow> = {}): FakeRow {
  return {
    id: `row-${Math.random().toString(36).slice(2, 8)}`,
    destination: 'meta_capi',
    status: 'pending',
    payload: makePayload(),
    attempts: 0,
    nextAttemptAt: new Date(Date.now() - 60_000),
    lockUntil: null,
    lastError: null,
    responseCode: null,
    sentAt: null,
    ...overrides,
  }
}

/**
 * In-memory fake with real compare-and-swap semantics for the exact where
 * shapes the worker uses — verifies the idempotency logic itself.
 */
function fakeDelegate(rows: FakeRow[]): TrackingOutboxDelegate & { rows: FakeRow[] } {
  function matches(row: FakeRow, where: Record<string, unknown>): boolean {
    if ('id' in where && row.id !== where.id) return false
    if ('status' in where && typeof where.status === 'string' && row.status !== where.status) {
      return false
    }
    const nextAttemptAt = where.nextAttemptAt as { lte: Date } | undefined
    if (nextAttemptAt && row.nextAttemptAt > nextAttemptAt.lte) return false
    const lockUntil = where.lockUntil as { lt: Date } | undefined
    if (lockUntil && (!row.lockUntil || row.lockUntil >= lockUntil.lt)) return false
    return true
  }

  return {
    rows,
    async findMany(args) {
      return rows
        .filter((row) => matches(row, args.where))
        .sort((a, b) => a.nextAttemptAt.getTime() - b.nextAttemptAt.getTime())
        .slice(0, args.take)
    },
    async updateMany(args) {
      let count = 0
      for (const row of rows) {
        if (!matches(row, args.where)) continue
        count += 1
        for (const [key, value] of Object.entries(args.data)) {
          if (key === 'attempts' && typeof value === 'object' && value !== null) {
            row.attempts += (value as { increment: number }).increment
          } else {
            ;(row as unknown as Record<string, unknown>)[key] = value
          }
        }
      }
      return { count }
    },
  }
}

function successSender(destination = 'meta_capi'): TrackingEventSender & {
  calls: PurchaseOutboxPayload[]
} {
  const calls: PurchaseOutboxPayload[] = []
  return {
    destination: destination as TrackingEventSender['destination'],
    calls,
    async send(payload) {
      calls.push(payload)
      return { responseCode: 200 }
    },
  }
}

function failingSender(retryable: boolean): TrackingEventSender {
  return {
    destination: 'meta_capi',
    async send() {
      throw new TrackingSendError('boom', retryable ? 'meta_rate_limited' : 'meta_invalid_request', retryable, retryable ? 429 : 400)
    },
  }
}

describe('processDueOutboxRows', () => {
  it('sends a due pending row', async () => {
    const row = makeRow()
    const db = fakeDelegate([row])
    const sender = successSender()

    const result = await processDueOutboxRows({ outbox: db, senders: { meta_capi: sender } })

    expect(result).toMatchObject({ claimed: 1, sent: 1, retried: 0, failed: 0, skipped: 0 })
    expect(sender.calls).toHaveLength(1)
    expect(row.status).toBe('sent')
    expect(row.sentAt).toBeInstanceOf(Date)
    expect(row.responseCode).toBe(200)
    expect(row.attempts).toBe(1)
    expect(row.lastError).toBeNull()
    expect(row.lockUntil).toBeNull()
  })

  it('leaves rows with a future nextAttemptAt alone', async () => {
    const row = makeRow({ nextAttemptAt: new Date(Date.now() + 60_000) })
    const db = fakeDelegate([row])
    const sender = successSender()

    const result = await processDueOutboxRows({ outbox: db, senders: { meta_capi: sender } })

    expect(result.claimed).toBe(0)
    expect(sender.calls).toHaveLength(0)
    expect(row.status).toBe('pending')
  })

  it('a retryable failure goes back to pending with backoff', async () => {
    const row = makeRow()
    const db = fakeDelegate([row])
    const before = Date.now()

    const result = await processDueOutboxRows({
      outbox: db,
      senders: { meta_capi: failingSender(true) },
    })

    expect(result).toMatchObject({ claimed: 1, retried: 1, failed: 0 })
    expect(row.status).toBe('pending')
    expect(row.nextAttemptAt.getTime()).toBeGreaterThan(before)
    expect(row.lastError).toContain('[meta_rate_limited]')
    expect(row.responseCode).toBe(429)
    expect(row.attempts).toBe(1)
  })

  it('a permanent failure is marked failed without retry', async () => {
    const row = makeRow()
    const db = fakeDelegate([row])

    const result = await processDueOutboxRows({
      outbox: db,
      senders: { meta_capi: failingSender(false) },
    })

    expect(result).toMatchObject({ claimed: 1, retried: 0, failed: 1 })
    expect(row.status).toBe('failed')
    expect(row.lastError).toContain('[meta_invalid_request]')
  })

  it('an exhausted retryable row fails at max attempts', async () => {
    const row = makeRow({ attempts: 2 })
    const db = fakeDelegate([row])

    const result = await processDueOutboxRows({
      outbox: db,
      senders: { meta_capi: failingSender(true) },
      maxAttempts: 3,
    })

    expect(result.failed).toBe(1)
    expect(row.status).toBe('failed')
    expect(row.attempts).toBe(3)
  })

  it('skips events past the destination age limit without calling the sender', async () => {
    const row = makeRow({
      payload: makePayload({ eventTime: Math.floor(Date.now() / 1000) - 8 * 24 * 3600 }),
    })
    const db = fakeDelegate([row])
    const sender = successSender()

    const result = await processDueOutboxRows({ outbox: db, senders: { meta_capi: sender } })

    expect(result.skipped).toBe(1)
    expect(sender.calls).toHaveLength(0)
    expect(row.status).toBe('skipped')
    expect(row.lastError).toBe('event_expired')
  })

  it('skips rows whose destination has no configured sender', async () => {
    const row = makeRow({ destination: 'tiktok_events' })
    const db = fakeDelegate([row])

    const result = await processDueOutboxRows({ outbox: db, senders: {} })

    expect(result.skipped).toBe(1)
    expect(row.status).toBe('skipped')
    expect(row.lastError).toBe('destination_disabled')
  })

  it('never sends the same row twice with concurrent workers (CAS claim)', async () => {
    const row = makeRow()
    const db = fakeDelegate([row])
    const sender = successSender()

    const [a, b] = await Promise.all([
      processDueOutboxRows({ outbox: db, senders: { meta_capi: sender } }),
      processDueOutboxRows({ outbox: db, senders: { meta_capi: sender } }),
    ])

    expect(sender.calls).toHaveLength(1)
    expect(a.claimed + b.claimed).toBe(1)
    expect(row.status).toBe('sent')
    expect(row.attempts).toBe(1)
  })

  it('recovers expired sending locks back to pending (re-send is dedup-safe)', async () => {
    const stuck = makeRow({
      status: 'sending',
      lockUntil: new Date(Date.now() - 1000),
      attempts: 1,
    })
    const db = fakeDelegate([stuck])
    const sender = successSender()

    const result = await processDueOutboxRows({ outbox: db, senders: { meta_capi: sender } })

    expect(result.recovered).toBe(1)
    // Recovery runs before the due query, so the row sends in the same tick.
    expect(result.sent).toBe(1)
    expect(stuck.status).toBe('sent')
    expect(stuck.attempts).toBe(2)
  })

  it('leaves an active sending lock alone', async () => {
    const active = makeRow({ status: 'sending', lockUntil: new Date(Date.now() + 60_000) })
    const db = fakeDelegate([active])
    const sender = successSender()

    const result = await processDueOutboxRows({ outbox: db, senders: { meta_capi: sender } })

    expect(result.recovered).toBe(0)
    expect(sender.calls).toHaveLength(0)
    expect(active.status).toBe('sending')
  })

  it('an unparsable payload fails permanently without calling the sender', async () => {
    const row = makeRow({ payload: { totally: 'wrong' } })
    const db = fakeDelegate([row])
    const sender = successSender()

    const result = await processDueOutboxRows({ outbox: db, senders: { meta_capi: sender } })

    expect(result.failed).toBe(1)
    expect(sender.calls).toHaveLength(0)
    expect(row.status).toBe('failed')
    expect(row.lastError).toContain('payload_invalid')
  })
})

describe('computeNextAttemptAt', () => {
  const now = new Date('2026-07-17T12:00:00.000Z')

  it('doubles per attempt from 60s (jitter neutral at random=0.5)', () => {
    const neutral = () => 0.5
    expect(computeNextAttemptAt(1, now, neutral).getTime() - now.getTime()).toBe(60_000)
    expect(computeNextAttemptAt(2, now, neutral).getTime() - now.getTime()).toBe(120_000)
    expect(computeNextAttemptAt(5, now, neutral).getTime() - now.getTime()).toBe(960_000)
  })

  it('caps at 6 hours', () => {
    const neutral = () => 0.5
    expect(computeNextAttemptAt(30, now, neutral).getTime() - now.getTime()).toBe(21_600_000)
  })

  it('keeps jitter within ±20%', () => {
    const low = computeNextAttemptAt(1, now, () => 0).getTime() - now.getTime()
    const high = computeNextAttemptAt(1, now, () => 1).getTime() - now.getTime()
    expect(low).toBe(48_000)
    expect(high).toBe(72_000)
  })
})
