import { COMPLAINT_STATUSES } from '@print-shop/types'
import { describe, expect, it } from 'vitest'
import {
  assertComplaintTransition,
  canTransitionComplaint,
  COMPLAINT_STATUS_TRANSITIONS,
  isTerminalComplaintStatus,
} from '../src/complaint-status.js'
import { InvalidStatusTransitionError } from '../src/order-status.js'

describe('complaint status transitions', () => {
  it('covers every status in the transition map', () => {
    for (const status of COMPLAINT_STATUSES) {
      expect(COMPLAINT_STATUS_TRANSITIONS[status]).toBeDefined()
    }
  })

  it('allows the happy path: submitted → in_review → approved → replacement_planned → closed', () => {
    expect(canTransitionComplaint('submitted', 'in_review')).toBe(true)
    expect(canTransitionComplaint('in_review', 'approved')).toBe(true)
    expect(canTransitionComplaint('approved', 'replacement_planned')).toBe(true)
    expect(canTransitionComplaint('replacement_planned', 'closed')).toBe(true)
  })

  it('allows the refund and rejection paths', () => {
    expect(canTransitionComplaint('approved', 'refund_planned')).toBe(true)
    expect(canTransitionComplaint('refund_planned', 'closed')).toBe(true)
    expect(canTransitionComplaint('in_review', 'rejected')).toBe(true)
    expect(canTransitionComplaint('rejected', 'closed')).toBe(true)
  })

  it('allows the info-needed loop back to review', () => {
    expect(canTransitionComplaint('in_review', 'info_needed')).toBe(true)
    expect(canTransitionComplaint('info_needed', 'in_review')).toBe(true)
    expect(canTransitionComplaint('info_needed', 'approved')).toBe(false)
  })

  it('rejects skipping the review step', () => {
    expect(canTransitionComplaint('submitted', 'approved')).toBe(false)
    expect(canTransitionComplaint('submitted', 'closed')).toBe(false)
    expect(canTransitionComplaint('in_review', 'replacement_planned')).toBe(false)
  })

  it('closed is terminal', () => {
    expect(isTerminalComplaintStatus('closed')).toBe(true)
    expect(isTerminalComplaintStatus('in_review')).toBe(false)
    for (const status of COMPLAINT_STATUSES) {
      expect(canTransitionComplaint('closed', status)).toBe(false)
    }
  })

  it('throws a typed error on invalid transitions', () => {
    expect(() => assertComplaintTransition('submitted', 'closed')).toThrow(InvalidStatusTransitionError)
    expect(() => assertComplaintTransition('submitted', 'in_review')).not.toThrow()
  })
})
