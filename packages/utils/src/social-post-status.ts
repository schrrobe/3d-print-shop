import type { SocialPostStatus } from '@print-shop/types'
import { InvalidStatusTransitionError } from './order-status.js'

/**
 * Allowed social post status transitions. Keys not listed are terminal.
 *
 * draft      → scheduled (planen) | cancelled
 * scheduled  → publishing (worker claim) | draft (Planung aufheben) | cancelled
 * publishing → published | failed  (only the worker moves out of publishing)
 * failed     → scheduled (erneut planen / retry) | cancelled
 */
export const SOCIAL_POST_STATUS_TRANSITIONS: Record<SocialPostStatus, SocialPostStatus[]> = {
  draft: ['scheduled', 'cancelled'],
  scheduled: ['publishing', 'draft', 'cancelled'],
  publishing: ['published', 'failed'],
  published: [],
  failed: ['scheduled', 'cancelled'],
  cancelled: [],
}

export function canTransitionSocialPost(from: SocialPostStatus, to: SocialPostStatus): boolean {
  return SOCIAL_POST_STATUS_TRANSITIONS[from]?.includes(to) ?? false
}

export function assertSocialPostTransition(from: SocialPostStatus, to: SocialPostStatus): void {
  if (!canTransitionSocialPost(from, to)) throw new InvalidStatusTransitionError(from, to)
}

export function isTerminalSocialPostStatus(status: SocialPostStatus): boolean {
  return SOCIAL_POST_STATUS_TRANSITIONS[status].length === 0
}

/** Posts dürfen bearbeitet werden, solange sie nicht (gerade) veröffentlicht sind. */
export function canEditSocialPost(status: SocialPostStatus): boolean {
  return status === 'draft' || status === 'scheduled' || status === 'failed'
}

/** Löschen ist erlaubt, solange der Post nicht veröffentlicht ist/wird. */
export function canDeleteSocialPost(status: SocialPostStatus): boolean {
  return status !== 'published' && status !== 'publishing'
}
