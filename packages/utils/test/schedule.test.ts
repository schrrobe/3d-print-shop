import { describe, expect, it } from 'vitest'
import { findOverlaps, windowsOverlap } from '../src/schedule.js'

const w = (startsAt: string, endsAt: string) => ({ startsAt, endsAt })

describe('windowsOverlap (half-open intervals)', () => {
  it('detects a plain overlap', () => {
    expect(
      windowsOverlap(w('2026-07-06T08:00:00Z', '2026-07-06T12:00:00Z'), w('2026-07-06T10:00:00Z', '2026-07-06T14:00:00Z')),
    ).toBe(true)
  })

  it('is symmetric', () => {
    const a = w('2026-07-06T08:00:00Z', '2026-07-06T12:00:00Z')
    const b = w('2026-07-06T11:00:00Z', '2026-07-06T13:00:00Z')
    expect(windowsOverlap(a, b)).toBe(windowsOverlap(b, a))
  })

  it('touching edges do NOT overlap (a.end === b.start)', () => {
    expect(
      windowsOverlap(w('2026-07-06T08:00:00Z', '2026-07-06T12:00:00Z'), w('2026-07-06T12:00:00Z', '2026-07-06T14:00:00Z')),
    ).toBe(false)
  })

  it('full containment overlaps', () => {
    expect(
      windowsOverlap(w('2026-07-06T08:00:00Z', '2026-07-06T20:00:00Z'), w('2026-07-06T10:00:00Z', '2026-07-06T11:00:00Z')),
    ).toBe(true)
  })

  it('identical windows overlap', () => {
    const a = w('2026-07-06T08:00:00Z', '2026-07-06T12:00:00Z')
    expect(windowsOverlap(a, { ...a })).toBe(true)
  })

  it('disjoint windows do not overlap', () => {
    expect(
      windowsOverlap(w('2026-07-06T08:00:00Z', '2026-07-06T09:00:00Z'), w('2026-07-07T08:00:00Z', '2026-07-07T09:00:00Z')),
    ).toBe(false)
  })

  it('accepts Date objects and ISO strings interchangeably', () => {
    expect(
      windowsOverlap(
        { startsAt: new Date('2026-07-06T08:00:00Z'), endsAt: new Date('2026-07-06T12:00:00Z') },
        w('2026-07-06T11:00:00Z', '2026-07-06T13:00:00Z'),
      ),
    ).toBe(true)
  })
})

describe('findOverlaps', () => {
  it('returns only the conflicting windows', () => {
    const candidate = w('2026-07-06T10:00:00Z', '2026-07-06T12:00:00Z')
    const existing = [
      { ...w('2026-07-06T08:00:00Z', '2026-07-06T10:00:00Z'), id: 'before-touching' },
      { ...w('2026-07-06T11:00:00Z', '2026-07-06T13:00:00Z'), id: 'overlapping' },
      { ...w('2026-07-06T14:00:00Z', '2026-07-06T16:00:00Z'), id: 'after' },
    ]
    expect(findOverlaps(candidate, existing).map((x) => x.id)).toEqual(['overlapping'])
  })

  it('returns an empty list when nothing conflicts', () => {
    expect(findOverlaps(w('2026-07-06T10:00:00Z', '2026-07-06T12:00:00Z'), [])).toEqual([])
  })
})
