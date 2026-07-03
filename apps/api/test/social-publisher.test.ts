import { describe, expect, it } from 'vitest'
import { mapMetaError } from '../src/services/social/meta.js'
import { MOCK_FAILURE_MARKER, MockSocialMediaPublisher } from '../src/services/social/mock.js'
import { SocialPublishError } from '../src/services/social/publisher.js'

const input = {
  postId: 'post-1',
  platform: 'instagram' as const,
  type: 'feed' as const,
  caption: 'Hello world',
  mediaUrls: ['https://example.com/a.jpg'],
  publishRequestId: 'req-123',
}

describe('MockSocialMediaPublisher', () => {
  it('publishes and returns a deterministic external id', async () => {
    const publisher = new MockSocialMediaPublisher()
    const result = await publisher.publish(input)
    expect(result.externalPostId).toBe('mock_instagram_req-123')
  })

  it('fails deterministically when the caption contains the failure marker', async () => {
    const publisher = new MockSocialMediaPublisher()
    await expect(
      publisher.publish({ ...input, caption: `${MOCK_FAILURE_MARKER} broken post` }),
    ).rejects.toMatchObject({
      name: 'SocialPublishError',
      code: 'mock_simulated_failure',
      retryable: true,
    })
  })
})

describe('mapMetaError', () => {
  const body = (code: number, message = 'boom') => ({ error: { code, message } })

  it('maps invalid token (190) as non-retryable', () => {
    const err = mapMetaError(400, body(190, 'Error validating access token'))
    expect(err).toBeInstanceOf(SocialPublishError)
    expect(err.code).toBe('meta_invalid_token')
    expect(err.retryable).toBe(false)
  })

  it('maps permission errors (10/200/203)', () => {
    expect(mapMetaError(403, body(10)).code).toBe('meta_permission_denied')
    expect(mapMetaError(403, body(200)).code).toBe('meta_permission_denied')
  })

  it('maps rate limits (4/17/32/613) as retryable', () => {
    for (const code of [4, 17, 32, 613]) {
      const err = mapMetaError(400, body(code))
      expect(err.code).toBe('meta_rate_limited')
      expect(err.retryable).toBe(true)
    }
  })

  it('maps invalid parameters (100)', () => {
    expect(mapMetaError(400, body(100)).code).toBe('meta_invalid_parameter')
  })

  it('maps media errors (9007, 2207026)', () => {
    expect(mapMetaError(400, body(9007)).code).toBe('meta_media_error')
    expect(mapMetaError(400, body(2207026)).code).toBe('meta_media_error')
  })

  it('maps 5xx without a body as retryable server error', () => {
    const err = mapMetaError(500, null)
    expect(err.code).toBe('meta_server_error')
    expect(err.retryable).toBe(true)
  })

  it('falls back to unknown error and keeps the Meta message', () => {
    const err = mapMetaError(400, body(999_999, 'Something odd'))
    expect(err.code).toBe('meta_unknown_error')
    expect(err.message).toContain('Something odd')
  })
})
