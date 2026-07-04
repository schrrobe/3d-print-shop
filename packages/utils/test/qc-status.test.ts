import { QC_STATUSES } from '@print-shop/types'
import { describe, expect, it } from 'vitest'
import { InvalidStatusTransitionError } from '../src/order-status.js'
import {
  assertQcTransition,
  canTransitionQc,
  isQcCleared,
  QC_STATUS_TRANSITIONS,
} from '../src/qc-status.js'

describe('QC status transitions', () => {
  it('covers every status in the transition map', () => {
    for (const status of QC_STATUSES) {
      expect(QC_STATUS_TRANSITIONS[status]).toBeDefined()
    }
  })

  it('open can pass, fail or be overridden', () => {
    expect(canTransitionQc('open', 'passed')).toBe(true)
    expect(canTransitionQc('open', 'failed')).toBe(true)
    expect(canTransitionQc('open', 'overridden')).toBe(true)
    expect(canTransitionQc('open', 'reprint_required')).toBe(false)
  })

  it('failed can require a reprint or be overridden', () => {
    expect(canTransitionQc('failed', 'reprint_required')).toBe(true)
    expect(canTransitionQc('failed', 'overridden')).toBe(true)
    expect(canTransitionQc('failed', 'passed')).toBe(false)
  })

  it('passed, reprint_required and overridden are terminal (history via new records)', () => {
    for (const terminal of ['passed', 'reprint_required', 'overridden'] as const) {
      for (const status of QC_STATUSES) {
        expect(canTransitionQc(terminal, status)).toBe(false)
      }
    }
  })

  it('isQcCleared: only passed and overridden clear the shipping gate', () => {
    expect(isQcCleared('passed')).toBe(true)
    expect(isQcCleared('overridden')).toBe(true)
    expect(isQcCleared('open')).toBe(false)
    expect(isQcCleared('failed')).toBe(false)
    expect(isQcCleared('reprint_required')).toBe(false)
  })

  it('throws a typed error on invalid transitions', () => {
    expect(() => assertQcTransition('passed', 'failed')).toThrow(InvalidStatusTransitionError)
    expect(() => assertQcTransition('open', 'passed')).not.toThrow()
  })
})
