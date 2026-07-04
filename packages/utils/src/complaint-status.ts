import type { ComplaintStatus } from '@print-shop/types'
import { InvalidStatusTransitionError } from './order-status.js'

/** Allowed complaint (Reklamation) status transitions. */
export const COMPLAINT_STATUS_TRANSITIONS: Record<ComplaintStatus, ComplaintStatus[]> = {
  submitted: ['in_review'],
  in_review: ['info_needed', 'approved', 'rejected'],
  info_needed: ['in_review'],
  approved: ['replacement_planned', 'refund_planned', 'closed'],
  rejected: ['closed'],
  replacement_planned: ['closed'],
  refund_planned: ['closed'],
  closed: [],
}

export function canTransitionComplaint(from: ComplaintStatus, to: ComplaintStatus): boolean {
  return COMPLAINT_STATUS_TRANSITIONS[from]?.includes(to) ?? false
}

export function assertComplaintTransition(from: ComplaintStatus, to: ComplaintStatus): void {
  if (!canTransitionComplaint(from, to)) throw new InvalidStatusTransitionError(from, to)
}

export function isTerminalComplaintStatus(status: ComplaintStatus): boolean {
  return COMPLAINT_STATUS_TRANSITIONS[status]?.length === 0
}
