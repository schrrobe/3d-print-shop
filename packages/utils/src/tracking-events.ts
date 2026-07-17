/**
 * Conversion-tracking event taxonomy, shared by the browser tracker, the
 * ingest API validator and the server-side emitters.
 *
 * The client/server split is a security boundary, not just documentation:
 * CLIENT_EVENT_NAMES is the zod enum for `POST /api/t/events`, so a browser can
 * never assert a `purchase` (or any revenue-bearing event) — those exist only
 * as deterministic server emissions keyed by order id.
 */

/** Behavioural events the browser is allowed to report. */
export const CLIENT_EVENT_NAMES = [
  'page_view',
  'view_item',
  'view_cart',
  'add_to_cart',
  'remove_from_cart',
  'begin_checkout',
  'add_shipping_info',
  'add_payment_info',
  'add_to_wishlist',
  'voucher_applied',
] as const
export type ClientEventName = (typeof CLIENT_EVENT_NAMES)[number]

/** Commerce events emitted only server-side (never trusted from the browser). */
export const SERVER_EVENT_NAMES = [
  'order_created',
  'purchase',
  'refund',
  'order_cancelled',
  'quote_requested',
] as const
export type ServerEventName = (typeof SERVER_EVENT_NAMES)[number]

export const ALL_EVENT_NAMES = [...CLIENT_EVENT_NAMES, ...SERVER_EVENT_NAMES] as const
export type TrackingEventName = ClientEventName | ServerEventName

const CLIENT_SET: ReadonlySet<string> = new Set(CLIENT_EVENT_NAMES)
const SERVER_SET: ReadonlySet<string> = new Set(SERVER_EVENT_NAMES)

export const isClientEventName = (name: string): name is ClientEventName => CLIENT_SET.has(name)
export const isServerEventName = (name: string): name is ServerEventName => SERVER_SET.has(name)

/**
 * Deterministic id for a per-order server event. Retries (Stripe webhook
 * redelivery, bitcoin sync re-run, admin double-click) collapse to a no-op via
 * the primary key, and the same string is handed to the browser pixel as the
 * platform `eventID` so Meta/TikTok can dedupe browser vs. server hits.
 */
export function orderEventId(name: ServerEventName, orderId: string): string {
  return `${name}:${orderId}`
}

/** Ordered funnel stages the dashboard reports (drop-off between adjacent stages). */
export const FUNNEL_STAGES = [
  'page_view',
  'view_item',
  'add_to_cart',
  'begin_checkout',
  'purchase',
] as const
export type FunnelStage = (typeof FUNNEL_STAGES)[number]
