import { REVIEW_STATUSES } from '@print-shop/types'
import { describe, expect, it } from 'vitest'
import { InvalidStatusTransitionError } from '../src/order-status.js'
import {
  assertReviewTransition,
  canTransitionReview,
  REVIEW_STATUS_TRANSITIONS,
} from '../src/review-status.js'

describe('review status transitions (moderation)', () => {
  it('covers every status in the transition map', () => {
    for (const status of REVIEW_STATUSES) {
      expect(REVIEW_STATUS_TRANSITIONS[status]).toBeDefined()
    }
  })

  it('pending can be approved or rejected', () => {
    expect(canTransitionReview('pending', 'approved')).toBe(true)
    expect(canTransitionReview('pending', 'rejected')).toBe(true)
    expect(canTransitionReview('pending', 'hidden')).toBe(false)
  })

  it('approved can be hidden and hidden can be re-approved', () => {
    expect(canTransitionReview('approved', 'hidden')).toBe(true)
    expect(canTransitionReview('hidden', 'approved')).toBe(true)
    expect(canTransitionReview('approved', 'rejected')).toBe(false)
  })

  it('rejected reviews can be reconsidered (→ approved) but never merely hidden', () => {
    expect(canTransitionReview('rejected', 'approved')).toBe(true)
    expect(canTransitionReview('rejected', 'hidden')).toBe(false)
    expect(canTransitionReview('rejected', 'pending')).toBe(false)
  })

  it('nothing moves back to pending', () => {
    for (const status of REVIEW_STATUSES) {
      expect(canTransitionReview(status, 'pending')).toBe(false)
    }
  })

  it('throws a typed error on invalid transitions', () => {
    expect(() => assertReviewTransition('pending', 'hidden')).toThrow(InvalidStatusTransitionError)
    expect(() => assertReviewTransition('pending', 'approved')).not.toThrow()
  })
})
