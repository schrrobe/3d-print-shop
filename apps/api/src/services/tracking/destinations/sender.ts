import { z } from 'zod'

/**
 * Marketing-destination abstraction for the tracking outbox (Phase 3).
 *
 * The MVP ships a MockTrackingSender (no credentials needed). The real
 * Meta Conversions API / TikTok Events API senders activate via
 * TRACKING_DESTINATIONS_PROVIDER=live once their env credential pairs are
 * configured. Purchase events only for now; the payload carries a version
 * marker so new event kinds can be added without breaking stored rows.
 */

export const TRACKING_DESTINATIONS = ['meta_capi', 'tiktok_events'] as const
export type TrackingDestination = (typeof TRACKING_DESTINATIONS)[number]

/**
 * The frozen TrackingOutbox.payload shape. Frozen at enqueue time on purpose:
 * session anonymization (TRACKING_SESSION_ANON_DAYS) strips click ids later,
 * and the worker stays trivial — parse, wrap, POST. The worker re-parses
 * stored Json defensively; an unparsable row fails permanently.
 */
export const purchaseOutboxPayloadSchema = z
  .object({
    v: z.literal(1),
    eventName: z.literal('purchase'),
    /** Deterministic `purchase:<orderId>` — Meta/TikTok dedup key, makes re-sends safe. */
    eventId: z.string().min(1),
    orderId: z.string().min(1),
    /** Unix seconds (paidAt). */
    eventTime: z.number().int().positive(),
    valueCents: z.number().int(),
    currency: z.string().min(3),
    eventSourceUrl: z.string().nullable(),
    clientUserAgent: z.string().nullable(),
    /** Meta click id, reconstructed as `fb.1.<ms>.<fbclid>` — meta_capi rows only. */
    fbc: z.string().nullable(),
    /** TikTok click id — tiktok_events rows only. */
    ttclid: z.string().nullable(),
  })
  .strict()
export type PurchaseOutboxPayload = z.infer<typeof purchaseOutboxPayloadSchema>

export interface TrackingSendResult {
  responseCode: number
}

export interface TrackingEventSender {
  readonly destination: TrackingDestination
  send(payload: PurchaseOutboxPayload): Promise<TrackingSendResult>
}

/** Send failure with a stable machine-readable code (mapped per destination). */
export class TrackingSendError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    /** true = ein späterer Retry kann funktionieren (Rate limit, Netzwerk, 5xx) */
    public readonly retryable: boolean = false,
    public readonly responseCode?: number,
  ) {
    super(message)
    this.name = 'TrackingSendError'
  }
}
