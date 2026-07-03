import type { SocialPlatform, SocialPostStatus } from '@print-shop/types'
import { env } from '../../env.js'
import { prisma } from '../../lib/prisma.js'
import { randomToken } from '../../lib/tokens.js'
import { socialMediaPublisher } from './index.js'
import type { SocialMediaPublisher } from './publisher.js'
import { SocialPublishError } from './publisher.js'

/**
 * Publishes due social posts (status=scheduled, scheduledAt <= now).
 *
 * Idempotency / double-publish protection:
 * 1. Claim via compare-and-swap: updateMany({ where: { id, status: 'scheduled' } })
 *    — with parallel workers exactly one gets count=1, everyone else skips.
 * 2. Each claim sets a fresh publishRequestId and a lockUntil horizon; all
 *    follow-up writes are guarded by { id, status: 'publishing', publishRequestId }.
 * 3. Crash recovery: posts stuck in 'publishing' past lockUntil are marked
 *    failed instead of re-published — the external call may have gone through,
 *    so an admin decides about the retry (no automatic double post).
 */

const CLAIM_LOCK_MINUTES = 5
const BATCH_SIZE = 20

/** Subset of SocialMediaPost the scheduler reads. */
export interface SchedulerPost {
  id: string
  platform: SocialPlatform
  caption: string
  mediaUrls: string[]
}

/**
 * The exact prisma call shapes the scheduler uses — narrow on purpose so unit
 * tests can supply an in-memory fake with real CAS semantics.
 */
export interface SocialPostSchedulerDelegate {
  findMany(args: {
    where: { status: SocialPostStatus; scheduledAt: { lte: Date } }
    orderBy: { scheduledAt: 'asc' }
    take: number
  }): Promise<SchedulerPost[]>
  updateMany(args: {
    where: Record<string, unknown>
    data: Record<string, unknown>
  }): Promise<{ count: number }>
}

export interface SocialSchedulerDeps {
  posts: SocialPostSchedulerDelegate
  publisher: SocialMediaPublisher
  now?: () => Date
  lockMinutes?: number
}

export interface SocialSchedulerResult {
  recovered: number
  claimed: number
  published: number
  failed: number
}

/** Media URLs stored app-relative become absolute so Meta can fetch them. */
export function toAbsoluteMediaUrl(url: string, webUrl = env.WEB_URL, apiUrl = env.API_URL): string {
  if (/^https?:\/\//.test(url)) return url
  if (url.startsWith('/api/')) return `${apiUrl.replace(/\/$/, '')}${url}`
  return `${webUrl.replace(/\/$/, '')}${url}`
}

export async function processDueSocialPosts(deps: SocialSchedulerDeps): Promise<SocialSchedulerResult> {
  const now = deps.now ?? (() => new Date())
  const lockMinutes = deps.lockMinutes ?? CLAIM_LOCK_MINUTES
  const result: SocialSchedulerResult = { recovered: 0, claimed: 0, published: 0, failed: 0 }

  // Crash recovery: expired publishing locks → failed (never auto-republish)
  const recovered = await deps.posts.updateMany({
    where: { status: 'publishing', lockUntil: { lt: now() } },
    data: {
      status: 'failed',
      errorMessage: 'Publish attempt interrupted (worker lock expired) — please retry manually',
      lockUntil: null,
    },
  })
  result.recovered = recovered.count

  const due = await deps.posts.findMany({
    where: { status: 'scheduled', scheduledAt: { lte: now() } },
    orderBy: { scheduledAt: 'asc' },
    take: BATCH_SIZE,
  })

  for (const post of due) {
    const publishRequestId = randomToken(24)
    const claimedAt = now()
    // CAS claim: only one worker wins this row
    const claim = await deps.posts.updateMany({
      where: { id: post.id, status: 'scheduled' },
      data: {
        status: 'publishing',
        publishRequestId,
        lockUntil: new Date(claimedAt.getTime() + lockMinutes * 60_000),
        lastAttemptAt: claimedAt,
        attempts: { increment: 1 },
      },
    })
    if (claim.count !== 1) continue
    result.claimed += 1

    try {
      const { externalPostId } = await deps.publisher.publish({
        postId: post.id,
        platform: post.platform,
        type: 'feed',
        caption: post.caption,
        mediaUrls: post.mediaUrls.map((url) => toAbsoluteMediaUrl(url)),
        publishRequestId,
      })
      await deps.posts.updateMany({
        where: { id: post.id, status: 'publishing', publishRequestId },
        data: {
          status: 'published',
          publishedAt: now(),
          externalPostId,
          provider: deps.publisher.name,
          errorMessage: null,
          lockUntil: null,
        },
      })
      result.published += 1
    } catch (err) {
      const message =
        err instanceof SocialPublishError ? `[${err.code}] ${err.message}` : String(err)
      await deps.posts.updateMany({
        where: { id: post.id, status: 'publishing', publishRequestId },
        data: { status: 'failed', errorMessage: message.slice(0, 2000), lockUntil: null },
      })
      result.failed += 1
    }
  }

  return result
}

let tickRunning = false

/** One scheduler pass against the real DB + configured publisher (also the manual-trigger path). */
export async function runSocialPublishingTick(): Promise<SocialSchedulerResult> {
  if (tickRunning) return { recovered: 0, claimed: 0, published: 0, failed: 0 }
  tickRunning = true
  try {
    return await processDueSocialPosts({
      // Cast: PrismaClient's generated arg types are narrower than the
      // structural delegate above, but every call shape used is valid.
      posts: prisma.socialMediaPost as unknown as SocialPostSchedulerDelegate,
      publisher: socialMediaPublisher,
    })
  } finally {
    tickRunning = false
  }
}

/** Interval-based worker, opt-in via SOCIAL_PUBLISHING_CRON_ENABLED=true. */
export function startSocialPublishingCron(): NodeJS.Timeout | null {
  if (!env.SOCIAL_PUBLISHING_CRON_ENABLED) return null
  const intervalMs = env.SOCIAL_PUBLISHING_CRON_INTERVAL_SECONDS * 1000
  const timer = setInterval(() => {
    runSocialPublishingTick()
      .then((r) => {
        if (r.claimed > 0 || r.recovered > 0) {
          console.info(
            `[social] tick: recovered=${r.recovered} claimed=${r.claimed} published=${r.published} failed=${r.failed}`,
          )
        }
      })
      .catch((err) => console.error('[social] scheduler tick failed:', err))
  }, intervalMs)
  timer.unref()
  console.info(`[social] publishing cron enabled (every ${env.SOCIAL_PUBLISHING_CRON_INTERVAL_SECONDS}s)`)
  return timer
}
