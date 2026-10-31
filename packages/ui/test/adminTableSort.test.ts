import { describe, expect, it } from 'vitest'
import { sortRows } from '../src/components/adminTableSort'

const byV = (r: { v: unknown }) => r.v
const vs = (rows: { v: unknown }[]) => rows.map((r) => r.v)

describe('sortRows', () => {
  it('sorts numbers numerically in both directions', () => {
    const rows = [{ v: 10 }, { v: 2 }, { v: 33 }]
    expect(vs(sortRows(rows, byV, 'asc'))).toEqual([2, 10, 33])
    expect(vs(sortRows(rows, byV, 'desc'))).toEqual([33, 10, 2])
  })

  it('sorts strings case-insensitive and digit-aware', () => {
    const rows = [{ v: 'b' }, { v: 'PS-10' }, { v: 'A' }, { v: 'PS-9' }]
    expect(vs(sortRows(rows, byV, 'asc'))).toEqual(['A', 'b', 'PS-9', 'PS-10'])
  })

  it('keeps empty values last regardless of direction', () => {
    const rows = [{ v: null }, { v: 'b' }, { v: undefined }, { v: 'a' }]
    expect(vs(sortRows(rows, byV, 'asc')).slice(0, 2)).toEqual(['a', 'b'])
    expect(vs(sortRows(rows, byV, 'desc')).slice(0, 2)).toEqual(['b', 'a'])
  })

  it('sorts booleans and does not mutate the input', () => {
    const rows = [{ v: true }, { v: false }]
    expect(vs(sortRows(rows, byV, 'asc'))).toEqual([false, true])
    expect(vs(rows)).toEqual([true, false])
  })
})
