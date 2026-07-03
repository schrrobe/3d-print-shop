import { env } from '../../env.js'
import type { SocialMediaPublisher, SocialPublishInput, SocialPublishResult } from './publisher.js'
import { SocialPublishError } from './publisher.js'

/**
 * Official Meta Graph API integration (Facebook Page feed + Instagram feed
 * for Business/Creator accounts). Tokens live server-side only (env vars).
 *
 * Facebook page feed:   POST /{page-id}/photos  (url + caption)
 *                       POST /{page-id}/feed    (text-only message)
 * Instagram feed:       POST /{ig-user-id}/media          → creation_id
 *                       POST /{ig-user-id}/media_publish  → media id
 *
 * Reels/Stories/Karussells: add new SocialPostType branches here — the
 * container flow (media → media_publish) is the same for all IG types.
 */

const GRAPH_BASE = 'https://graph.facebook.com'

interface MetaErrorBody {
  error?: { message?: string; code?: number; error_subcode?: number; type?: string }
}

/** Maps Meta Graph API errors to stable codes + a hint whether a retry makes sense. */
export function mapMetaError(httpStatus: number, body: unknown): SocialPublishError {
  const err = (body as MetaErrorBody | null)?.error
  const message = err?.message ?? `Meta Graph API request failed (HTTP ${httpStatus})`
  const code = err?.code

  if (code === 190) return new SocialPublishError(`Access token invalid or expired: ${message}`, 'meta_invalid_token', false)
  if (code === 10 || code === 200 || code === 203) {
    return new SocialPublishError(`Missing permission: ${message}`, 'meta_permission_denied', false)
  }
  if (code === 4 || code === 17 || code === 32 || code === 613) {
    return new SocialPublishError(`Rate limit reached: ${message}`, 'meta_rate_limited', true)
  }
  if (code === 100) return new SocialPublishError(`Invalid parameter: ${message}`, 'meta_invalid_parameter', false)
  if (code === 9007 || code === 2207026) {
    return new SocialPublishError(`Media not accepted by Instagram: ${message}`, 'meta_media_error', false)
  }
  if (httpStatus >= 500) return new SocialPublishError(`Meta server error: ${message}`, 'meta_server_error', true)
  return new SocialPublishError(message, 'meta_unknown_error', false)
}

async function graphPost(path: string, params: Record<string, string>): Promise<Record<string, unknown>> {
  const url = `${GRAPH_BASE}/${env.META_GRAPH_API_VERSION}/${path}`
  let response: Response
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(params).toString(),
    })
  } catch (err) {
    throw new SocialPublishError(`Network error calling Meta Graph API: ${String(err)}`, 'meta_network_error', true)
  }
  const body = (await response.json().catch(() => null)) as Record<string, unknown> | null
  if (!response.ok) throw mapMetaError(response.status, body)
  return body ?? {}
}

export class FacebookPagePublisher implements SocialMediaPublisher {
  readonly name = 'meta:facebook'

  constructor(
    private readonly pageId = env.META_FACEBOOK_PAGE_ID,
    private readonly accessToken = env.META_FACEBOOK_PAGE_ACCESS_TOKEN,
  ) {
    if (!this.pageId || !this.accessToken) {
      throw new Error(
        'Facebook publishing requires META_FACEBOOK_PAGE_ID and META_FACEBOOK_PAGE_ACCESS_TOKEN',
      )
    }
  }

  async publish(input: SocialPublishInput): Promise<SocialPublishResult> {
    const imageUrl = input.mediaUrls[0]
    const body = imageUrl
      ? await graphPost(`${this.pageId}/photos`, {
          url: imageUrl,
          caption: input.caption,
          access_token: this.accessToken,
        })
      : await graphPost(`${this.pageId}/feed`, {
          message: input.caption,
          access_token: this.accessToken,
        })
    const externalPostId = String(body.post_id ?? body.id ?? '')
    if (!externalPostId) {
      throw new SocialPublishError('Meta response contained no post id', 'meta_missing_post_id', false)
    }
    return { externalPostId }
  }
}

export class InstagramPublisher implements SocialMediaPublisher {
  readonly name = 'meta:instagram'

  constructor(
    private readonly igUserId = env.META_INSTAGRAM_BUSINESS_ACCOUNT_ID,
    private readonly accessToken = env.META_INSTAGRAM_ACCESS_TOKEN,
  ) {
    if (!this.igUserId || !this.accessToken) {
      throw new Error(
        'Instagram publishing requires META_INSTAGRAM_BUSINESS_ACCOUNT_ID and META_INSTAGRAM_ACCESS_TOKEN',
      )
    }
  }

  async publish(input: SocialPublishInput): Promise<SocialPublishResult> {
    const imageUrl = input.mediaUrls[0]
    if (!imageUrl) {
      throw new SocialPublishError('Instagram feed posts require an image', 'meta_media_required', false)
    }
    const container = await graphPost(`${this.igUserId}/media`, {
      image_url: imageUrl,
      caption: input.caption,
      access_token: this.accessToken,
    })
    const creationId = String(container.id ?? '')
    if (!creationId) {
      throw new SocialPublishError('Instagram media container creation failed', 'meta_container_failed', false)
    }
    const published = await graphPost(`${this.igUserId}/media_publish`, {
      creation_id: creationId,
      access_token: this.accessToken,
    })
    const externalPostId = String(published.id ?? '')
    if (!externalPostId) {
      throw new SocialPublishError('Instagram media_publish returned no id', 'meta_missing_post_id', false)
    }
    return { externalPostId }
  }
}

/** Delegates to the platform-specific Meta publisher. */
export class MetaPublishingService implements SocialMediaPublisher {
  readonly name = 'meta'
  private facebook?: FacebookPagePublisher
  private instagram?: InstagramPublisher

  async publish(input: SocialPublishInput): Promise<SocialPublishResult> {
    // Lazy per-platform init: a missing Instagram config must not block Facebook-only setups
    if (input.platform === 'facebook') {
      this.facebook ??= new FacebookPagePublisher()
      return this.facebook.publish(input)
    }
    this.instagram ??= new InstagramPublisher()
    return this.instagram.publish(input)
  }
}
