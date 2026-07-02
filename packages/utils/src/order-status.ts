import type { OrderStatus } from '@print-shop/types'

/** Allowed order status transitions. Keys not listed are terminal. */
export const ORDER_STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ['awaiting_payment', 'awaiting_bank_transfer', 'cancelled'],
  awaiting_payment: ['paid', 'cancelled'],
  awaiting_bank_transfer: ['paid', 'cancelled'],
  paid: ['in_production', 'refunded', 'cancelled'],
  in_production: ['quality_check', 'ready_to_ship'],
  quality_check: ['ready_to_ship', 'in_production'],
  ready_to_ship: ['shipped'],
  shipped: ['completed', 'refunded'],
  completed: ['refunded'],
  cancelled: [],
  refunded: [],
}

export function canTransitionOrder(from: OrderStatus, to: OrderStatus): boolean {
  return ORDER_STATUS_TRANSITIONS[from]?.includes(to) ?? false
}

export class InvalidStatusTransitionError extends Error {
  constructor(
    public readonly from: string,
    public readonly to: string,
  ) {
    super(`Invalid status transition: ${from} -> ${to}`)
    this.name = 'InvalidStatusTransitionError'
  }
}

export function assertOrderTransition(from: OrderStatus, to: OrderStatus): void {
  if (!canTransitionOrder(from, to)) throw new InvalidStatusTransitionError(from, to)
}

export function isTerminalOrderStatus(status: OrderStatus): boolean {
  return ORDER_STATUS_TRANSITIONS[status].length === 0
}
