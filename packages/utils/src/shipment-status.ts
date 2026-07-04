import type { ShipmentStatus } from '@print-shop/types'
import { InvalidStatusTransitionError } from './order-status.js'

/** Allowed shipment status transitions. `problem` can recover to any pre-delivery state. */
export const SHIPMENT_STATUS_TRANSITIONS: Record<ShipmentStatus, ShipmentStatus[]> = {
  waiting_for_qc: ['ready_for_shipping', 'problem'],
  ready_for_shipping: ['packed', 'problem'],
  packed: ['shipped', 'ready_for_shipping', 'problem'],
  shipped: ['delivered', 'problem'],
  delivered: [],
  problem: ['waiting_for_qc', 'ready_for_shipping', 'packed', 'shipped'],
}

export function canTransitionShipment(from: ShipmentStatus, to: ShipmentStatus): boolean {
  return SHIPMENT_STATUS_TRANSITIONS[from]?.includes(to) ?? false
}

export function assertShipmentTransition(from: ShipmentStatus, to: ShipmentStatus): void {
  if (!canTransitionShipment(from, to)) throw new InvalidStatusTransitionError(from, to)
}

export function isTerminalShipmentStatus(status: ShipmentStatus): boolean {
  return SHIPMENT_STATUS_TRANSITIONS[status]?.length === 0
}
