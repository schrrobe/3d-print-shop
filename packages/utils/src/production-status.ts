import type { ProductionStatus } from '@print-shop/types'
import { InvalidStatusTransitionError } from './order-status.js'

/** Allowed print-job (production) status transitions. */
export const PRODUCTION_STATUS_TRANSITIONS: Record<ProductionStatus, ProductionStatus[]> = {
  waiting: ['assigned', 'failed'],
  assigned: ['printing', 'waiting', 'failed'],
  printing: ['printed', 'failed'],
  printed: ['quality_check'],
  quality_check: ['ready_to_ship', 'reprint_needed'],
  ready_to_ship: ['shipped'],
  shipped: [],
  failed: ['reprint_needed'],
  reprint_needed: ['waiting', 'assigned'],
}

export function canTransitionProduction(from: ProductionStatus, to: ProductionStatus): boolean {
  return PRODUCTION_STATUS_TRANSITIONS[from]?.includes(to) ?? false
}

export function assertProductionTransition(from: ProductionStatus, to: ProductionStatus): void {
  if (!canTransitionProduction(from, to)) throw new InvalidStatusTransitionError(from, to)
}

/** ETA in ms from queue of jobs with known print durations (sequential per printer). */
export function calcPrinterEtaMs(jobs: { printDurationMinutes: number }[]): number {
  return jobs.reduce((sum, job) => sum + Math.max(0, job.printDurationMinutes) * 60_000, 0)
}
