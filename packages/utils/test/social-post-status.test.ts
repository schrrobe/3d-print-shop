import { SOCIAL_POST_STATUSES } from '@print-shop/types'
import { describe, expect, it } from 'vitest'
import {
  assertSocialPostTransition,
  canDeleteSocialPost,
  canEditSocialPost,
  canTransitionSocialPost,
  isTerminalSocialPostStatus,
  SOCIAL_POST_STATUS_TRANSITIONS,
} from '../src/social-post-status.js'
import { InvalidStatusTransitionError } from '../src/order-status.js'

describe('social post status transitions', () => {
  it('covers every status', () => {
    for (const status of SOCIAL_POST_STATUSES) {
      expect(SOCIAL_POST_STATUS_TRANSITIONS[status]).toBeDefined()
    }
  })

  it('allows the happy path draft → scheduled → publishing → published', () => {
    expect(canTransitionSocialPost('draft', 'scheduled')).toBe(true)
    expect(canTransitionSocialPost('scheduled', 'publishing')).toBe(true)
    expect(canTransitionSocialPost('publishing', 'published')).toBe(true)
  })

  it('supports the failure/retry loop', () => {
    expect(canTransitionSocialPost('publishing', 'failed')).toBe(true)
    expect(canTransitionSocialPost('failed', 'scheduled')).toBe(true)
  })

  it('allows unscheduling and cancelling', () => {
    expect(canTransitionSocialPost('scheduled', 'draft')).toBe(true)
    expect(canTransitionSocialPost('draft', 'cancelled')).toBe(true)
    expect(canTransitionSocialPost('scheduled', 'cancelled')).toBe(true)
    expect(canTransitionSocialPost('failed', 'cancelled')).toBe(true)
  })

  it('rejects invalid jumps', () => {
    expect(canTransitionSocialPost('draft', 'published')).toBe(false)
    expect(canTransitionSocialPost('published', 'draft')).toBe(false)
    expect(canTransitionSocialPost('published', 'scheduled')).toBe(false)
    expect(canTransitionSocialPost('cancelled', 'scheduled')).toBe(false)
    expect(canTransitionSocialPost('draft', 'publishing')).toBe(false)
  })

  it('published and cancelled are terminal', () => {
    expect(isTerminalSocialPostStatus('published')).toBe(true)
    expect(isTerminalSocialPostStatus('cancelled')).toBe(true)
    expect(isTerminalSocialPostStatus('scheduled')).toBe(false)
  })

  it('assert throws InvalidStatusTransitionError', () => {
    expect(() => assertSocialPostTransition('published', 'scheduled')).toThrow(
      InvalidStatusTransitionError,
    )
    expect(() => assertSocialPostTransition('draft', 'scheduled')).not.toThrow()
  })

  it('editing is allowed before publish only', () => {
    expect(canEditSocialPost('draft')).toBe(true)
    expect(canEditSocialPost('scheduled')).toBe(true)
    expect(canEditSocialPost('failed')).toBe(true)
    expect(canEditSocialPost('publishing')).toBe(false)
    expect(canEditSocialPost('published')).toBe(false)
    expect(canEditSocialPost('cancelled')).toBe(false)
  })

  it('deleting is blocked for published/publishing posts', () => {
    expect(canDeleteSocialPost('draft')).toBe(true)
    expect(canDeleteSocialPost('failed')).toBe(true)
    expect(canDeleteSocialPost('cancelled')).toBe(true)
    expect(canDeleteSocialPost('publishing')).toBe(false)
    expect(canDeleteSocialPost('published')).toBe(false)
  })
})
