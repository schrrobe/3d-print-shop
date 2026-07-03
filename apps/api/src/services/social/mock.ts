import type { SocialMediaPublisher, SocialPublishInput, SocialPublishResult } from './publisher.js'
import { SocialPublishError } from './publisher.js'

/**
 * Dev/e2e publisher — no external calls. Captions containing the marker
 * "[e2e-fail]" fail deterministically so tests and local dev can exercise the
 * failed → retry flow without real Meta credentials.
 */
export const MOCK_FAILURE_MARKER = '[e2e-fail]'

export class MockSocialMediaPublisher implements SocialMediaPublisher {
  readonly name = 'mock'

  async publish(input: SocialPublishInput): Promise<SocialPublishResult> {
    if (input.caption.includes(MOCK_FAILURE_MARKER)) {
      throw new SocialPublishError(
        `Mock publish failed (caption contains ${MOCK_FAILURE_MARKER})`,
        'mock_simulated_failure',
        true,
      )
    }
    // Deterministic per publish attempt — a retried attempt gets a new id
    return { externalPostId: `mock_${input.platform}_${input.publishRequestId}` }
  }
}
