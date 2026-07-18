import { env } from '../../../env.js'
import type { PurchaseOutboxPayload, TrackingEventSender, TrackingSendResult } from './sender.js'
import { TrackingSendError } from './sender.js'

/**
 * TikTok Events API v1.3 (server-side web events).
 *
 * POST /event/track/ with the pixel code as event_source_id and the token in
 * the Access-Token header. "CompletePayment" is TikTok's standard web purchase
 * event. TikTok deduplicates via event_id, so outbox re-sends are safe.
 *
 * Pitfall: TikTok answers HTTP 200 with a non-zero body.code on request-level
 * errors — success is res.ok AND body.code === 0.
 */

const TIKTOK_EVENTS_URL = 'https://business-api.tiktok.com/open_api/v1.3/event/track/'
const TIKTOK_TIMEOUT_MS = 10_000

interface TikTokResponseBody {
  code?: number
  message?: string
}

/** Maps TikTok Events API errors to stable codes + a hint whether a retry makes sense. */
export function mapTikTokError(httpStatus: number, body: unknown): TrackingSendError {
  const parsed = body as TikTokResponseBody | null
  const apiCode = parsed?.code
  const message =
    parsed?.message ?? `TikTok Events API request failed (HTTP ${httpStatus})`

  if (httpStatus === 429) {
    return new TrackingSendError(`Rate limit reached: ${message}`, 'tiktok_rate_limited', true, httpStatus)
  }
  if (httpStatus >= 500) {
    return new TrackingSendError(`TikTok server error: ${message}`, 'tiktok_server_error', true, httpStatus)
  }
  return new TrackingSendError(
    `${message} (api code ${apiCode ?? 'unknown'})`,
    'tiktok_invalid_request',
    false,
    httpStatus,
  )
}

/** Pure request-body builder (exported for tests). Unset optionals are omitted, never null. */
export function toTikTokBody(
  payload: PurchaseOutboxPayload,
  cfg: { pixelCode: string; testEventCode?: string },
): Record<string, unknown> {
  return {
    event_source: 'web',
    event_source_id: cfg.pixelCode,
    data: [
      {
        event: 'CompletePayment',
        event_time: payload.eventTime,
        event_id: payload.eventId,
        user: {
          ...(payload.ttclid ? { ttclid: payload.ttclid } : {}),
          ...(payload.clientUserAgent ? { user_agent: payload.clientUserAgent } : {}),
        },
        ...(payload.eventSourceUrl ? { page: { url: payload.eventSourceUrl } } : {}),
        properties: { currency: payload.currency, value: payload.valueCents / 100 },
      },
    ],
    ...(cfg.testEventCode ? { test_event_code: cfg.testEventCode } : {}),
  }
}

export class TikTokEventsSender implements TrackingEventSender {
  readonly destination = 'tiktok_events' as const

  constructor(
    private readonly pixelCode = env.TIKTOK_PIXEL_CODE,
    private readonly accessToken = env.TIKTOK_EVENTS_ACCESS_TOKEN,
    private readonly testEventCode = env.TIKTOK_TEST_EVENT_CODE,
  ) {
    if (!this.pixelCode || !this.accessToken) {
      throw new Error('TikTok Events requires TIKTOK_EVENTS_ACCESS_TOKEN and TIKTOK_PIXEL_CODE')
    }
  }

  async send(payload: PurchaseOutboxPayload): Promise<TrackingSendResult> {
    let response: Response
    try {
      response = await fetch(TIKTOK_EVENTS_URL, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'access-token': this.accessToken },
        body: JSON.stringify(
          toTikTokBody(payload, {
            pixelCode: this.pixelCode,
            testEventCode: this.testEventCode || undefined,
          }),
        ),
        signal: AbortSignal.timeout(TIKTOK_TIMEOUT_MS),
      })
    } catch (err) {
      throw new TrackingSendError(
        `Network error calling TikTok Events API: ${String(err)}`,
        'tiktok_network_error',
        true,
      )
    }
    const body = (await response.json().catch(() => null)) as TikTokResponseBody | null
    if (!response.ok || body?.code !== 0) throw mapTikTokError(response.status, body)
    return { responseCode: response.status }
  }
}
