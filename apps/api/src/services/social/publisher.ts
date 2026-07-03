import type { SocialPlatform } from '@print-shop/types'

/**
 * Social media publisher abstraction.
 *
 * The MVP ships a MockSocialMediaPublisher (no credentials needed). The real
 * MetaPublishingService talks to the official Meta Graph API / Instagram
 * Graph API — activate it via SOCIAL_PUBLISHING_PROVIDER=meta once the META_*
 * env vars are configured. See docs/social-media-planner.md.
 *
 * Feed posts only for now; the input carries the post type so Reels, Stories
 * and carousels can be added without breaking the interface.
 */

/** Later: 'reel' | 'story' | 'carousel' */
export type SocialPostType = 'feed'

export interface SocialPublishInput {
  postId: string
  platform: SocialPlatform
  type: SocialPostType
  caption: string
  /** Publicly reachable absolute URLs — Meta fetches media from these. */
  mediaUrls: string[]
  /** Unique id of this publish attempt (idempotency marker, audit trail). */
  publishRequestId: string
}

export interface SocialPublishResult {
  externalPostId: string
}

export interface SocialMediaPublisher {
  readonly name: string
  publish(input: SocialPublishInput): Promise<SocialPublishResult>
}

/** Publish failure with a stable machine-readable code (mapped per provider). */
export class SocialPublishError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    /** true = ein späterer Retry kann funktionieren (Rate limit, Netzwerk) */
    public readonly retryable: boolean = false,
  ) {
    super(message)
    this.name = 'SocialPublishError'
  }
}
