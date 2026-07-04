import type { QcStatus } from '@print-shop/types'
import { InvalidStatusTransitionError } from './order-status.js'

/**
 * Allowed QC status transitions. passed/reprint_required/overridden are terminal:
 * after a reprint a NEW QcRecord is created — records are the QC history.
 */
export const QC_STATUS_TRANSITIONS: Record<QcStatus, QcStatus[]> = {
  open: ['passed', 'failed', 'overridden'],
  failed: ['reprint_required', 'overridden'],
  passed: [],
  reprint_required: [],
  overridden: [],
}

export function canTransitionQc(from: QcStatus, to: QcStatus): boolean {
  return QC_STATUS_TRANSITIONS[from]?.includes(to) ?? false
}

export function assertQcTransition(from: QcStatus, to: QcStatus): void {
  if (!canTransitionQc(from, to)) throw new InvalidStatusTransitionError(from, to)
}

/** A QC record counts as shippable clearance when passed or consciously overridden. */
export function isQcCleared(status: QcStatus): boolean {
  return status === 'passed' || status === 'overridden'
}
