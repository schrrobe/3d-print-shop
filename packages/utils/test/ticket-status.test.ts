import { TICKET_STATUSES } from '@print-shop/types'
import { describe, expect, it } from 'vitest'
import { InvalidStatusTransitionError } from '../src/order-status.js'
import {
  assertTicketTransition,
  canTransitionTicket,
  isTerminalTicketStatus,
  statusAfterCustomerReply,
  statusAfterStaffReply,
  TICKET_STATUS_TRANSITIONS,
} from '../src/ticket-status.js'

describe('ticket status transitions', () => {
  it('covers every status in the transition map', () => {
    for (const status of TICKET_STATUSES) {
      expect(TICKET_STATUS_TRANSITIONS[status]).toBeDefined()
    }
  })

  it('allows the happy path support flow', () => {
    expect(canTransitionTicket('open', 'in_progress')).toBe(true)
    expect(canTransitionTicket('in_progress', 'waiting_customer')).toBe(true)
    expect(canTransitionTicket('waiting_customer', 'in_progress')).toBe(true)
    expect(canTransitionTicket('in_progress', 'resolved')).toBe(true)
    expect(canTransitionTicket('resolved', 'closed')).toBe(true)
  })

  it('allows staff to reopen a resolved ticket', () => {
    expect(canTransitionTicket('resolved', 'in_progress')).toBe(true)
  })

  it('treats closed as terminal', () => {
    expect(isTerminalTicketStatus('closed')).toBe(true)
    for (const to of TICKET_STATUSES) {
      expect(canTransitionTicket('closed', to)).toBe(false)
    }
  })

  it('rejects invalid transitions with a typed error', () => {
    expect(() => assertTicketTransition('closed', 'open')).toThrow(InvalidStatusTransitionError)
    expect(() => assertTicketTransition('open', 'open')).toThrow(InvalidStatusTransitionError)
    expect(() => assertTicketTransition('open', 'in_progress')).not.toThrow()
  })

  it('customer reply reopens waiting/resolved tickets and is rejected on closed', () => {
    expect(statusAfterCustomerReply('waiting_customer')).toBe('in_progress')
    expect(statusAfterCustomerReply('resolved')).toBe('in_progress')
    expect(statusAfterCustomerReply('open')).toBe('open')
    expect(statusAfterCustomerReply('in_progress')).toBe('in_progress')
    expect(statusAfterCustomerReply('closed')).toBeNull()
  })

  it('staff reply moves fresh tickets into in_progress and keeps others unchanged', () => {
    expect(statusAfterStaffReply('open')).toBe('in_progress')
    expect(statusAfterStaffReply('waiting_customer')).toBe('waiting_customer')
    expect(statusAfterStaffReply('resolved')).toBe('resolved')
  })
})
