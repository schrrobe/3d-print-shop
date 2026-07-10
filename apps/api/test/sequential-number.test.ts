import { describe, expect, it, vi } from 'vitest'
import type { SequentialCounterDelegate } from '../src/lib/sequential-number.js'
import { nextSequentialNumber } from '../src/lib/sequential-number.js'

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

describe('nextSequentialNumber', () => {
  it('formats prefix, current year and zero-padded sequence', async () => {
    const counter = fakeCounter(11)
    const year = new Date().getFullYear()

    const result = await nextSequentialNumber(counter, 'RE')

    expect(result).toEqual({ number: `RE-${year}-00012`, year, sequence: 12 })
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

  it('increments across consecutive calls', async () => {
    const counter = fakeCounter()

    const first = await nextSequentialNumber(counter, 'REK')
    const second = await nextSequentialNumber(counter, 'REK')

    expect(first.sequence).toBe(1)
    expect(second.sequence).toBe(2)
    expect(second.number.endsWith('-00002')).toBe(true)
  })
})
