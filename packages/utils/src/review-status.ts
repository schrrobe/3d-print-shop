import type { ReviewStatus } from '@print-shop/types'
import { InvalidStatusTransitionError } from './order-status.js'

/**
 * Allowed review moderation transitions. `rejected → approved` allows moderator
 * corrections; `hidden` is a post-approval takedown that can be reverted.
 */
export const REVIEW_STATUS_TRANSITIONS: Record<ReviewStatus, ReviewStatus[]> = {
  pending: ['approved', 'rejected'],
  approved: ['hidden'],
  hidden: ['approved'],
  rejected: ['approved'],
}

export function canTransitionReview(from: ReviewStatus, to: ReviewStatus): boolean {
  return REVIEW_STATUS_TRANSITIONS[from]?.includes(to) ?? false
}

export function assertReviewTransition(from: ReviewStatus, to: ReviewStatus): void {
  if (!canTransitionReview(from, to)) throw new InvalidStatusTransitionError(from, to)
}
