import { CONVERSION_EVENTS, type ConversionEventName } from '@print-shop/utils'
import { z } from 'zod'

/**
 * Marketing-destination abstraction for the tracking outbox (Phase 3).
 *
 * The MVP ships a MockTrackingSender (no credentials needed). The real
 * Meta Conversions API / TikTok Events API senders activate via
 * TRACKING_DESTINATIONS_PROVIDER=live once their env credential pairs are
 * configured. Carries server-side purchases plus the browser's conversion
 * events (CONVERSION_EVENTS); the version marker keeps stored rows readable.
 */

export const TRACKING_DESTINATIONS = ['meta_capi', 'tiktok_events'] as const
export type TrackingDestination = (typeof TRACKING_DESTINATIONS)[number]

/**
 * The frozen TrackingOutbox.payload shape. Frozen at enqueue time on purpose:
 * session anonymization (TRACKING_SESSION_ANON_DAYS) strips click ids later,
 * and the worker stays trivial — parse, wrap, POST. The worker re-parses
 * stored Json defensively; an unparsable row fails permanently.
 */
export const outboxPayloadSchema = z
  .object({
    v: z.literal(1),
    eventName: z.enum(
      Object.keys(CONVERSION_EVENTS) as [ConversionEventName, ...ConversionEventName[]],
    ),
    /**
     * Meta/TikTok dedup key shared with the browser pixel, makes re-sends safe:
     * deterministic `purchase:<orderId>`, or the client event's UUIDv7.
     */
    eventId: z.string().min(1),
    orderId: z.string().min(1).nullable(),
    /** Unix seconds (paidAt / client occurredAt). */
    eventTime: z.number().int().positive(),
    valueCents: z.number().int().nullable(),
    currency: z.string().min(3),
    eventSourceUrl: z.string().nullable(),
    clientUserAgent: z.string().nullable(),
    /** Meta click cookie `_fbc` (or `fb.1.<ms>.<fbclid>` from the session) — meta_capi rows only. */
    fbc: z.string().nullable(),
    /** TikTok click id — tiktok_events rows only. */
    ttclid: z.string().nullable(),
    /** SHA-256 of the trimmed, lower-cased order email (purchase only). */
    emailHash: z.string().nullable().optional(),
    clientIp: z.string().nullable().optional(),
    /** Browser cookies `_fbp` (Meta) / `_ttp` (TikTok). */
    fbp: z.string().nullable().optional(),
    ttp: z.string().nullable().optional(),
    contentId: z.string().nullable().optional(),
    numItems: z.number().int().nullable().optional(),
  })
  .strict()
export type OutboxPayload = z.infer<typeof outboxPayloadSchema>

export interface TrackingSendResult {
  responseCode: number
}

export interface TrackingEventSender {
  readonly destination: TrackingDestination
  send(payload: OutboxPayload): Promise<TrackingSendResult>
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

/** Drop null/undefined fields — platform APIs want unset optionals omitted, never null. */
export function compact(obj: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v != null))
}
