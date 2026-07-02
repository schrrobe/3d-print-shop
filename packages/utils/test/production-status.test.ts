import { PRODUCTION_STATUSES } from '@print-shop/types'
import { describe, expect, it } from 'vitest'
import {
  calcPrinterEtaMs,
  canTransitionProduction,
  PRODUCTION_STATUS_TRANSITIONS,
} from '../src/production-status.js'

describe('production status transitions', () => {
  it('covers every status', () => {
    for (const status of PRODUCTION_STATUSES) {
      expect(PRODUCTION_STATUS_TRANSITIONS[status]).toBeDefined()
    }
  })

  it('allows the happy path', () => {
    expect(canTransitionProduction('waiting', 'assigned')).toBe(true)
    expect(canTransitionProduction('assigned', 'printing')).toBe(true)
    expect(canTransitionProduction('printing', 'printed')).toBe(true)
    expect(canTransitionProduction('printed', 'quality_check')).toBe(true)
    expect(canTransitionProduction('quality_check', 'ready_to_ship')).toBe(true)
    expect(canTransitionProduction('ready_to_ship', 'shipped')).toBe(true)
  })

  it('supports reprint loop', () => {
    expect(canTransitionProduction('quality_check', 'reprint_needed')).toBe(true)
    expect(canTransitionProduction('failed', 'reprint_needed')).toBe(true)
    expect(canTransitionProduction('reprint_needed', 'waiting')).toBe(true)
  })

  it('rejects invalid jumps', () => {
    expect(canTransitionProduction('waiting', 'shipped')).toBe(false)
    expect(canTransitionProduction('shipped', 'waiting')).toBe(false)
  })

  it('calculates printer ETA from queued job durations', () => {
    expect(calcPrinterEtaMs([])).toBe(0)
    expect(
      calcPrinterEtaMs([{ printDurationMinutes: 90 }, { printDurationMinutes: 30 }]),
    ).toBe(120 * 60_000)
    expect(calcPrinterEtaMs([{ printDurationMinutes: -5 }])).toBe(0)
  })
})
