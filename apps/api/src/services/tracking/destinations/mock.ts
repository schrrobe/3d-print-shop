import type {
  PurchaseOutboxPayload,
  TrackingDestination,
  TrackingEventSender,
  TrackingSendResult,
} from './sender.js'
import { TrackingSendError } from './sender.js'

/**
 * Dev/e2e sender — no external calls. Order ids containing the marker
 * "outbox-fail" fail deterministically (retryable) so tests and local dev can
 * exercise the pending → backoff → retry flow without real credentials.
 */
export const MOCK_OUTBOX_FAILURE_MARKER = 'outbox-fail'

export class MockTrackingSender implements TrackingEventSender {
  constructor(readonly destination: TrackingDestination) {}

  async send(payload: PurchaseOutboxPayload): Promise<TrackingSendResult> {
    if (payload.orderId.includes(MOCK_OUTBOX_FAILURE_MARKER)) {
      throw new TrackingSendError(
        `Mock send failed (orderId contains ${MOCK_OUTBOX_FAILURE_MARKER})`,
        'mock_simulated_failure',
        true,
      )
    }
    return { responseCode: 200 }
  }
}
