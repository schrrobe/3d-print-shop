import type { TicketStatus } from '@print-shop/types'
import { InvalidStatusTransitionError } from './order-status.js'

/** Allowed ticket status transitions. `closed` is terminal. */
export const TICKET_STATUS_TRANSITIONS: Record<TicketStatus, TicketStatus[]> = {
  open: ['in_progress', 'waiting_customer', 'resolved', 'closed'],
  in_progress: ['waiting_customer', 'resolved', 'closed'],
  waiting_customer: ['in_progress', 'resolved', 'closed'],
  resolved: ['in_progress', 'closed'],
  closed: [],
}

export function canTransitionTicket(from: TicketStatus, to: TicketStatus): boolean {
  return TICKET_STATUS_TRANSITIONS[from]?.includes(to) ?? false
}

export function assertTicketTransition(from: TicketStatus, to: TicketStatus): void {
  if (!canTransitionTicket(from, to)) throw new InvalidStatusTransitionError(from, to)
}

export function isTerminalTicketStatus(status: TicketStatus): boolean {
  return TICKET_STATUS_TRANSITIONS[status].length === 0
}

/**
 * Status after a customer posted a reply on the public token page.
 * Replies on closed tickets are rejected upstream (returns null).
 * A reply on waiting_customer/resolved reopens the ticket.
 */
export function statusAfterCustomerReply(status: TicketStatus): TicketStatus | null {
  if (status === 'closed') return null
  if (status === 'waiting_customer' || status === 'resolved') return 'in_progress'
  return status
}

/** Status after a staff reply: a fresh ticket moves into in_progress. */
export function statusAfterStaffReply(status: TicketStatus): TicketStatus {
  return status === 'open' ? 'in_progress' : status
}
