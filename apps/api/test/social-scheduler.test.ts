import type { SocialPlatform, SocialPostStatus } from '@print-shop/types'
import { describe, expect, it } from 'vitest'
import type {
  SocialPostSchedulerDelegate,
  SchedulerPost,
} from '../src/services/social/scheduler.js'
import { processDueSocialPosts, toAbsoluteMediaUrl } from '../src/services/social/scheduler.js'
import type { SocialMediaPublisher, SocialPublishInput } from '../src/services/social/publisher.js'
import { SocialPublishError } from '../src/services/social/publisher.js'

interface FakePost extends SchedulerPost {
  status: SocialPostStatus
  scheduledAt: Date | null
  publishedAt: Date | null
  errorMessage: string | null
  externalPostId: string | null
  provider: string
  attempts: number
  lastAttemptAt: Date | null
  lockUntil: Date | null
  publishRequestId: string | null
}

function makePost(overrides: Partial<FakePost> = {}): FakePost {
  return {
    id: `post-${Math.random().toString(36).slice(2, 8)}`,
    platform: 'instagram' as SocialPlatform,
    status: 'scheduled',
    caption: 'Test post',
    mediaUrls: ['/images/products/spiral-vase.svg'],
    scheduledAt: new Date(Date.now() - 60_000),
    publishedAt: null,
    errorMessage: null,
    externalPostId: null,
    provider: 'mock',
    attempts: 0,
    lastAttemptAt: null,
    lockUntil: null,
    publishRequestId: null,
    ...overrides,
  }
}

/**
 * In-memory fake with real compare-and-swap semantics for the exact where
 * shapes the scheduler uses — verifies the idempotency logic itself.
 */
function fakeDelegate(posts: FakePost[]): SocialPostSchedulerDelegate & { posts: FakePost[] } {
  function matches(post: FakePost, where: Record<string, unknown>): boolean {
    if ('id' in where && post.id !== where.id) return false
    if ('status' in where && typeof where.status === 'string' && post.status !== where.status) {
      return false
    }
    if ('publishRequestId' in where && post.publishRequestId !== where.publishRequestId) {
      return false
    }
    const scheduledAt = where.scheduledAt as { lte: Date } | undefined
    if (scheduledAt && (!post.scheduledAt || post.scheduledAt > scheduledAt.lte)) return false
    const lockUntil = where.lockUntil as { lt: Date } | undefined
    if (lockUntil && (!post.lockUntil || post.lockUntil >= lockUntil.lt)) return false
    return true
  }

  return {
    posts,
    async findMany(args) {
      return posts
        .filter((post) => matches(post, args.where))
        .sort((a, b) => (a.scheduledAt?.getTime() ?? 0) - (b.scheduledAt?.getTime() ?? 0))
        .slice(0, args.take)
    },
    async updateMany(args) {
      let count = 0
      for (const post of posts) {
        if (!matches(post, args.where)) continue
        count += 1
        for (const [key, value] of Object.entries(args.data)) {
          if (key === 'attempts' && typeof value === 'object' && value !== null) {
            post.attempts += (value as { increment: number }).increment
          } else {
            ;(post as unknown as Record<string, unknown>)[key] = value
          }
        }
      }
      return { count }
    },
  }
}

function successPublisher(): SocialMediaPublisher & { calls: SocialPublishInput[] } {
  const calls: SocialPublishInput[] = []
  return {
    name: 'mock',
    calls,
    async publish(input) {
      calls.push(input)
      return { externalPostId: `ext_${input.publishRequestId}` }
    },
  }
}

describe('processDueSocialPosts', () => {
  it('publishes a due scheduled post', async () => {
    const post = makePost()
    const db = fakeDelegate([post])
    const publisher = successPublisher()

    const result = await processDueSocialPosts({ posts: db, publisher })

    expect(result).toMatchObject({ claimed: 1, published: 1, failed: 0 })
    expect(post.status).toBe('published')
    expect(post.publishedAt).toBeInstanceOf(Date)
    expect(post.externalPostId).toMatch(/^ext_/)
    expect(post.errorMessage).toBeNull()
    expect(post.attempts).toBe(1)
    expect(post.lastAttemptAt).toBeInstanceOf(Date)
    expect(post.lockUntil).toBeNull()
  })

  it('marks a post failed when the publisher throws, keeping the error code', async () => {
    const post = makePost()
    const db = fakeDelegate([post])
    const publisher: SocialMediaPublisher = {
      name: 'mock',
      async publish() {
        throw new SocialPublishError('rate limited', 'meta_rate_limited', true)
      },
    }

    const result = await processDueSocialPosts({ posts: db, publisher })

    expect(result).toMatchObject({ claimed: 1, published: 0, failed: 1 })
    expect(post.status).toBe('failed')
    expect(post.errorMessage).toContain('[meta_rate_limited]')
    expect(post.attempts).toBe(1)
  })

  it('ignores drafts and future posts', async () => {
    const draft = makePost({ status: 'draft', scheduledAt: null })
    const future = makePost({ scheduledAt: new Date(Date.now() + 60 * 60 * 1000) })
    const db = fakeDelegate([draft, future])
    const publisher = successPublisher()

    const result = await processDueSocialPosts({ posts: db, publisher })

    expect(result.claimed).toBe(0)
    expect(publisher.calls).toHaveLength(0)
    expect(draft.status).toBe('draft')
    expect(future.status).toBe('scheduled')
  })

  it('never publishes the same post twice with concurrent workers (CAS claim)', async () => {
    const post = makePost()
    const db = fakeDelegate([post])
    const publisher = successPublisher()

    const [a, b] = await Promise.all([
      processDueSocialPosts({ posts: db, publisher }),
      processDueSocialPosts({ posts: db, publisher }),
    ])

    expect(publisher.calls).toHaveLength(1)
    expect(a.claimed + b.claimed).toBe(1)
    expect(post.status).toBe('published')
    expect(post.attempts).toBe(1)
  })

  it('a second run after success does not re-publish (idempotent)', async () => {
    const post = makePost()
    const db = fakeDelegate([post])
    const publisher = successPublisher()

    await processDueSocialPosts({ posts: db, publisher })
    await processDueSocialPosts({ posts: db, publisher })

    expect(publisher.calls).toHaveLength(1)
    expect(post.attempts).toBe(1)
  })

  it('recovers expired publishing locks as failed without re-publishing', async () => {
    const stuck = makePost({
      status: 'publishing',
      lockUntil: new Date(Date.now() - 1000),
      publishRequestId: 'old-attempt',
      attempts: 1,
    })
    const db = fakeDelegate([stuck])
    const publisher = successPublisher()

    const result = await processDueSocialPosts({ posts: db, publisher })

    expect(result.recovered).toBe(1)
    expect(stuck.status).toBe('failed')
    expect(stuck.errorMessage).toContain('lock expired')
    expect(publisher.calls).toHaveLength(0)
  })

  it('leaves an active publishing lock alone', async () => {
    const active = makePost({
      status: 'publishing',
      lockUntil: new Date(Date.now() + 60_000),
      publishRequestId: 'running-attempt',
    })
    const db = fakeDelegate([active])
    const publisher = successPublisher()

    const result = await processDueSocialPosts({ posts: db, publisher })

    expect(result.recovered).toBe(0)
    expect(active.status).toBe('publishing')
    expect(publisher.calls).toHaveLength(0)
  })

  it('a retried failed post gets a fresh publish attempt', async () => {
    const post = makePost({ status: 'failed', errorMessage: 'earlier failure', attempts: 1 })
    const db = fakeDelegate([post])
    const publisher = successPublisher()

    // Admin retry: failed → scheduled (route does this); then the worker runs
    post.status = 'scheduled'
    post.scheduledAt = new Date(Date.now() - 1000)
    const result = await processDueSocialPosts({ posts: db, publisher })

    expect(result.published).toBe(1)
    expect(post.status).toBe('published')
    expect(post.errorMessage).toBeNull()
    expect(post.attempts).toBe(2)
  })
})

describe('toAbsoluteMediaUrl', () => {
  it('keeps absolute urls untouched', () => {
    expect(toAbsoluteMediaUrl('https://cdn.example.com/a.jpg', 'http://web', 'http://api')).toBe(
      'https://cdn.example.com/a.jpg',
    )
  })

  it('resolves api-served media against the api origin', () => {
    expect(toAbsoluteMediaUrl('/api/social-media/x.jpg', 'http://web', 'http://api/')).toBe(
      'http://api/api/social-media/x.jpg',
    )
  })

  it('resolves web assets against the shop origin', () => {
    expect(toAbsoluteMediaUrl('/images/products/vase.svg', 'http://web/', 'http://api')).toBe(
      'http://web/images/products/vase.svg',
    )
  })
})
