import { SHIPMENT_STATUSES } from '@print-shop/types'
import { describe, expect, it } from 'vitest'
import { InvalidStatusTransitionError } from '../src/order-status.js'
import {
  assertShipmentTransition,
  canTransitionShipment,
  SHIPMENT_STATUS_TRANSITIONS,
} from '../src/shipment-status.js'

describe('shipment status transitions', () => {
  it('covers every status in the transition map', () => {
    for (const status of SHIPMENT_STATUSES) {
      expect(SHIPMENT_STATUS_TRANSITIONS[status]).toBeDefined()
    }
  })

  it('allows the happy path: waiting_for_qc → ready_for_shipping → packed → shipped → delivered', () => {
    expect(canTransitionShipment('waiting_for_qc', 'ready_for_shipping')).toBe(true)
    expect(canTransitionShipment('ready_for_shipping', 'packed')).toBe(true)
    expect(canTransitionShipment('packed', 'shipped')).toBe(true)
    expect(canTransitionShipment('shipped', 'delivered')).toBe(true)
  })

  it('allows unpacking (packed → ready_for_shipping) but no other backwards moves', () => {
    expect(canTransitionShipment('packed', 'ready_for_shipping')).toBe(true)
    expect(canTransitionShipment('shipped', 'packed')).toBe(false)
    expect(canTransitionShipment('ready_for_shipping', 'waiting_for_qc')).toBe(false)
  })

  it('rejects skipping steps', () => {
    expect(canTransitionShipment('waiting_for_qc', 'packed')).toBe(false)
    expect(canTransitionShipment('waiting_for_qc', 'shipped')).toBe(false)
    expect(canTransitionShipment('ready_for_shipping', 'shipped')).toBe(false)
  })

  it('problem is reachable from every non-terminal status and recoverable', () => {
    for (const status of ['waiting_for_qc', 'ready_for_shipping', 'packed', 'shipped'] as const) {
      expect(canTransitionShipment(status, 'problem')).toBe(true)
      expect(canTransitionShipment('problem', status)).toBe(true)
    }
    expect(canTransitionShipment('delivered', 'problem')).toBe(false)
    expect(canTransitionShipment('problem', 'delivered')).toBe(false)
  })

  it('delivered is terminal', () => {
    for (const status of SHIPMENT_STATUSES) {
      expect(canTransitionShipment('delivered', status)).toBe(false)
    }
  })

  it('throws a typed error on invalid transitions', () => {
    expect(() => assertShipmentTransition('waiting_for_qc', 'shipped')).toThrow(
      InvalidStatusTransitionError,
    )
    expect(() => assertShipmentTransition('packed', 'shipped')).not.toThrow()
  })
})
