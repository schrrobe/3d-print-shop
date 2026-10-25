import { CONVERSION_EVENTS } from '@print-shop/utils'
import { env } from '../../../env.js'
import type { OutboxPayload, TrackingEventSender, TrackingSendResult } from './sender.js'
import { compact, TrackingSendError } from './sender.js'

/**
 * Meta Conversions API (server-side events).
 *
 * POST /{pixel-id}/events with a JSON body. Deduplication against the
 * browser pixel works via event_id + event_name; Meta also drops repeats of
 * the same server event, which is what makes outbox re-sends safe.
 *
 * Marketing consent only. user_data: SHA-256 email (purchase), _fbp/_fbc,
 * client IP and user agent — see docs/privacy-consent.md.
 */

const CAPI_BASE = 'https://graph.facebook.com'
const CAPI_TIMEOUT_MS = 10_000

interface MetaErrorBody {
  error?: { message?: string; code?: number; error_subcode?: number }
}

/** Maps Conversions API errors to stable codes + a hint whether a retry makes sense. */
export function mapMetaCapiError(httpStatus: number, body: unknown): TrackingSendError {
  const err = (body as MetaErrorBody | null)?.error
  const message = err?.message ?? `Meta Conversions API request failed (HTTP ${httpStatus})`
  const code = err?.code

  if (code === 190) {
    return new TrackingSendError(
      `Access token invalid or expired: ${message}`,
      'meta_invalid_token',
      false,
      httpStatus,
    )
  }
  if (code === 4 || code === 17 || code === 32 || code === 613 || httpStatus === 429) {
    return new TrackingSendError(
      `Rate limit reached: ${message}`,
      'meta_rate_limited',
      true,
      httpStatus,
    )
  }
  if (httpStatus >= 500) {
    return new TrackingSendError(
      `Meta server error: ${message}`,
      'meta_server_error',
      true,
      httpStatus,
    )
  }
  return new TrackingSendError(message, 'meta_invalid_request', false, httpStatus)
}

/** Pure request-body builder (exported for tests). Unset optionals are omitted, never null. */
export function toMetaEventsBody(
  payload: OutboxPayload,
  cfg: { accessToken: string; testEventCode?: string },
): Record<string, unknown> {
  return {
    data: [
      {
        event_name: CONVERSION_EVENTS[payload.eventName].meta,
        event_time: payload.eventTime,
        event_id: payload.eventId,
        action_source: 'website',
        ...(payload.eventSourceUrl ? { event_source_url: payload.eventSourceUrl } : {}),
        user_data: compact({
          em: payload.emailHash ? [payload.emailHash] : null,
          fbp: payload.fbp,
          fbc: payload.fbc,
          client_ip_address: payload.clientIp,
          client_user_agent: payload.clientUserAgent,
        }),
        custom_data: compact({
          currency: payload.currency,
          value: payload.valueCents == null ? null : payload.valueCents / 100,
          content_ids: payload.contentId ? [payload.contentId] : null,
          content_type: payload.contentId ? 'product' : null,
          order_id: payload.orderId,
          num_items: payload.numItems,
        }),
      },
    ],
    access_token: cfg.accessToken,
    ...(cfg.testEventCode ? { test_event_code: cfg.testEventCode } : {}),
  }
}

export class MetaCapiSender implements TrackingEventSender {
  readonly destination = 'meta_capi' as const

  constructor(
    private readonly pixelId = env.META_CAPI_PIXEL_ID,
    private readonly accessToken = env.META_CAPI_ACCESS_TOKEN,
    private readonly testEventCode = env.META_CAPI_TEST_EVENT_CODE,
  ) {
    if (!this.pixelId || !this.accessToken) {
      throw new Error('Meta CAPI requires META_CAPI_ACCESS_TOKEN and META_CAPI_PIXEL_ID')
    }
  }

  async send(payload: OutboxPayload): Promise<TrackingSendResult> {
    const url = `${CAPI_BASE}/${env.META_GRAPH_API_VERSION}/${this.pixelId}/events`
    let response: Response
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(
          toMetaEventsBody(payload, {
            accessToken: this.accessToken,
            testEventCode: this.testEventCode || undefined,
          }),
        ),
        signal: AbortSignal.timeout(CAPI_TIMEOUT_MS),
      })
    } catch (err) {
      throw new TrackingSendError(
        `Network error calling Meta Conversions API: ${String(err)}`,
        'meta_network_error',
        true,
      )
    }
    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as MetaErrorBody | null
      throw mapMetaCapiError(response.status, body)
    }
    return { responseCode: response.status }
  }
}
