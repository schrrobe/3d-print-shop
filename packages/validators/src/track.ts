import { CLIENT_EVENT_NAMES } from '@print-shop/utils'
import { z } from 'zod'

/**
 * Ingest schemas for POST /api/t/events.
 *
 * Only CLIENT_EVENT_NAMES are accepted here: 'purchase'/'refund'/etc. are
 * server-only, so a spoofed client commerce event fails validation outright.
 * `.strict()` everywhere rejects unknown keys (no silently-absorbed PII).
 */

export const uuidSchema = z.string().uuid()

/**
 * Event properties are an allowlist, not an arbitrary string bag. The ingest
 * endpoint is public, so length limits alone would still let callers persist
 * email addresses, names or other free-form PII.
 */
const propsSchema = z
  .object({
    productId: z.string().max(64).optional(),
    slug: z.string().max(120).optional(),
    priceCents: z.number().int().min(0).max(100_000_000).optional(),
    unitPriceCents: z.number().int().min(0).max(100_000_000).optional(),
    subtotalCents: z.number().int().min(0).max(100_000_000).optional(),
    discountCents: z.number().int().min(0).max(100_000_000).optional(),
    quantity: z.number().int().min(1).max(10_000).optional(),
    itemCount: z.number().int().min(0).max(10_000).optional(),
    voucherCode: z.string().max(40).optional(),
    paymentMethod: z.enum(['stripe', 'bank_transfer', 'bitcoin']).optional(),
  })
  .strict()

export const trackEventSchema = z
  .object({
    eventId: uuidSchema,
    name: z.enum(CLIENT_EVENT_NAMES),
    occurredAt: z.coerce.date(),
    path: z.string().max(512).optional(),
    props: propsSchema.optional(),
  })
  .strict()

const clickIdSchema = z.string().max(512).nullable().optional()

/** Sent only on the first batch of a session (touchpoint capture). */
export const trackSessionMetaSchema = z
  .object({
    landingPath: z.string().max(512),
    referrer: z.string().max(512).nullable().optional(),
    utm: z
      .object({
        source: z.string().max(128).nullable().optional(),
        medium: z.string().max(128).nullable().optional(),
        campaign: z.string().max(200).nullable().optional(),
        term: z.string().max(200).nullable().optional(),
        content: z.string().max(200).nullable().optional(),
      })
      .strict()
      .optional(),
    clickIds: z
      .object({ fbclid: clickIdSchema, ttclid: clickIdSchema, gclid: clickIdSchema })
      .strict()
      .optional(),
  })
  .strict()

export const trackBatchSchema = z
  .object({
    v: z.literal(1),
    sessionId: uuidSchema,
    visitorId: uuidSchema.nullable(),
    // A client that says statistics consent is absent must never be ingested.
    consent: z.object({ statistics: z.literal(true), marketing: z.boolean() }).strict(),
    session: trackSessionMetaSchema.optional(),
    events: z.array(trackEventSchema).min(1).max(20),
  })
  .strict()

/**
 * Envelope only: the trusted batch-level fields, with events left unvalidated so
 * each one can be checked individually. A malformed envelope (bad session id,
 * missing consent) is still a hard rejection.
 */
const trackBatchEnvelopeSchema = z
  .object({
    v: z.literal(1),
    sessionId: uuidSchema,
    visitorId: uuidSchema.nullable(),
    consent: z.object({ statistics: z.literal(true), marketing: z.boolean() }).strict(),
    session: trackSessionMetaSchema.optional(),
    events: z.array(z.unknown()).min(1).max(20),
  })
  .strict()

export interface ParsedTrackBatch {
  batch: TrackBatchInput
  /** Count of individually-dropped malformed events (envelope was still valid). */
  droppedInvalid: number
}

/**
 * Parse a batch envelope strictly, then validate each event on its own. One
 * malformed event is dropped, not fatal, so it can never discard its valid
 * co-batched siblings (a single 400 previously lost the whole batch client-side).
 * Throws only when the envelope itself is untrustworthy.
 */
export function parseTrackBatch(raw: unknown): ParsedTrackBatch {
  const envelope = trackBatchEnvelopeSchema.parse(raw)
  const events: TrackEventInput[] = []
  let droppedInvalid = 0
  for (const candidate of envelope.events) {
    const parsed = trackEventSchema.safeParse(candidate)
    if (parsed.success) events.push(parsed.data)
    else droppedInvalid += 1
  }
  return { batch: { ...envelope, events }, droppedInvalid }
}

export type TrackBatchInput = z.infer<typeof trackBatchSchema>
export type TrackEventInput = z.infer<typeof trackEventSchema>
export type TrackSessionMetaInput = z.infer<typeof trackSessionMetaSchema>
