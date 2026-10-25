import { describe, expect, it, vi } from 'vitest'
import type { SequentialCounterDelegate } from '../src/lib/sequential-number.js'
import {
  formatSequentialNumber,
  nextSequentialNumber,
  permute,
} from '../src/lib/sequential-number.js'

function fakeCounter(startAt = 0): SequentialCounterDelegate & { calls: unknown[] } {
  let lastSequence = startAt
  const calls: unknown[] = []
  return {
    calls,
    upsert: vi.fn(async (args: unknown) => {
      calls.push(args)
      lastSequence += 1
      return { year: new Date().getFullYear(), lastSequence }
    }),
  }
}

const FORMAT = /^[A-Z]+-\d{4}-[0-9A-HJKMNP-TV-Z]{6}$/

describe('nextSequentialNumber', () => {
  it('formats prefix, current year and an obfuscated 6-char Crockford suffix', async () => {
    const counter = fakeCounter(11)
    const year = new Date().getFullYear()

    const result = await nextSequentialNumber(counter, 'RE')

    expect(result).toMatchObject({ year, sequence: 12 })
    expect(result.number).toMatch(FORMAT)
    expect(result.number.startsWith(`RE-${year}-`)).toBe(true)
    expect(result.number).toBe(formatSequentialNumber('RE', year, 12))
  })

  it('upserts the per-year counter row with an atomic increment', async () => {
    const counter = fakeCounter()
    const year = new Date().getFullYear()

    await nextSequentialNumber(counter, 'VER')

    expect(counter.calls[0]).toEqual({
      where: { year },
      create: { year, lastSequence: 1 },
      update: { lastSequence: { increment: 1 } },
    })
  })

  it('increments across consecutive calls without exposing the sequence', async () => {
    const counter = fakeCounter()

    const first = await nextSequentialNumber(counter, 'REK')
    const second = await nextSequentialNumber(counter, 'REK')

    expect(first.sequence).toBe(1)
    expect(second.sequence).toBe(2)
    expect(second.number).not.toBe(first.number)
    expect(second.number.endsWith('00002')).toBe(false)
  })
})

describe('formatSequentialNumber', () => {
  it('differs per prefix and per key for the same sequence', () => {
    expect(formatSequentialNumber('RE', 2026, 7).slice(-6)).not.toBe(
      formatSequentialNumber('TIC', 2026, 7).slice(-6),
    )
    expect(formatSequentialNumber('RE', 2026, 7, 'key-a-0123456789')).not.toBe(
      formatSequentialNumber('RE', 2026, 7, 'key-b-0123456789'),
    )
  })

  it('never collides with the legacy 5-digit format', () => {
    expect(formatSequentialNumber('RE', 2026, 12)).not.toMatch(/^RE-2026-\d{5}$/)
  })
})

describe('permute', () => {
  it('is a bijection on the 30-bit space (no duplicate numbers)', () => {
    const seen = new Set<number>()
    for (let n = 1; n <= 20_000; n++) seen.add(permute('RE-2026', n))
    for (let n = 2 ** 30 - 1000; n < 2 ** 30; n++) seen.add(permute('RE-2026', n))
    expect(seen.size).toBe(21_000)
    for (const v of seen) expect(v).toBeLessThan(2 ** 30)
  })
})
