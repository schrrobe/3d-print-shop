import { ORDER_STATUSES } from '@print-shop/types'
import { describe, expect, it } from 'vitest'
import {
  assertOrderTransition,
  canTransitionOrder,
  InvalidStatusTransitionError,
  isTerminalOrderStatus,
  ORDER_STATUS_TRANSITIONS,
} from '../src/order-status.js'

describe('order status transitions', () => {
  it('covers every status in the transition map', () => {
    for (const status of ORDER_STATUSES) {
      expect(ORDER_STATUS_TRANSITIONS[status]).toBeDefined()
    }
  })

  it('allows the happy path checkout flow', () => {
    expect(canTransitionOrder('pending', 'awaiting_payment')).toBe(true)
    expect(canTransitionOrder('awaiting_payment', 'paid')).toBe(true)
    expect(canTransitionOrder('paid', 'in_production')).toBe(true)
    expect(canTransitionOrder('in_production', 'quality_check')).toBe(true)
    expect(canTransitionOrder('quality_check', 'ready_to_ship')).toBe(true)
    expect(canTransitionOrder('ready_to_ship', 'shipped')).toBe(true)
    expect(canTransitionOrder('shipped', 'completed')).toBe(true)
  })

  it('allows the bank transfer flow', () => {
    expect(canTransitionOrder('pending', 'awaiting_bank_transfer')).toBe(true)
    expect(canTransitionOrder('awaiting_bank_transfer', 'paid')).toBe(true)
  })

  it('rejects skipping payment', () => {
    expect(canTransitionOrder('pending', 'paid')).toBe(false)
    expect(canTransitionOrder('pending', 'shipped')).toBe(false)
    expect(canTransitionOrder('awaiting_payment', 'in_production')).toBe(false)
  })

  it('rejects transitions out of terminal states', () => {
    expect(canTransitionOrder('cancelled', 'paid')).toBe(false)
    expect(canTransitionOrder('refunded', 'pending')).toBe(false)
    expect(isTerminalOrderStatus('cancelled')).toBe(true)
    expect(isTerminalOrderStatus('refunded')).toBe(true)
    expect(isTerminalOrderStatus('paid')).toBe(false)
  })

  it('throws a typed error on invalid transitions', () => {
    expect(() => assertOrderTransition('pending', 'shipped')).toThrow(InvalidStatusTransitionError)
    expect(() => assertOrderTransition('pending', 'awaiting_payment')).not.toThrow()
  })
})
