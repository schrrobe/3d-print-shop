import { mkdirSync } from 'node:fs'
import path from 'node:path'
import type { Prisma } from '@prisma/client'
import type { SocialPlatform, SocialPostStatus } from '@print-shop/types'
import { SOCIAL_PLATFORMS, SOCIAL_POST_STATUSES } from '@print-shop/types'
import {
  assertSocialPostTransition,
  canDeleteSocialPost,
  canEditSocialPost,
  getFileExtension,
} from '@print-shop/utils'
import {
  socialPostCreateSchema,
  socialPostScheduleSchema,
  socialPostUpdateSchema,
  validateSocialPostReadyToSchedule,
} from '@print-shop/validators'
import { Router } from 'express'
import multer from 'multer'
import { env } from '../../env.js'
import { audit } from '../../lib/audit.js'
import { prisma } from '../../lib/prisma.js'
import { randomToken } from '../../lib/tokens.js'
import { requirePermission } from '../../middleware/auth.js'
import { badRequest, conflict, notFound } from '../../middleware/error.js'
import { runSocialPublishingTick } from '../../services/social/index.js'

export const adminSocialPostsRouter = Router()

const include = {
  product: {
    include: {
      translations: true,
      assets: { where: { type: 'image' as const }, orderBy: { sortOrder: 'asc' as const } },
    },
  },
  createdBy: { select: { id: true, name: true } },
} satisfies Prisma.SocialMediaPostInclude

// ---------- Media upload (neue Bilder für Posts) ----------

const socialMediaDir = path.resolve(env.UPLOAD_DIR, 'social')
mkdirSync(socialMediaDir, { recursive: true })

const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp']

const mediaUpload = multer({
  storage: multer.diskStorage({
    destination: socialMediaDir,
    filename: (_req, file, cb) => {
      cb(null, `${Date.now()}_${randomToken(6)}${getFileExtension(file.originalname)}`)
    },
  }),
  limits: { fileSize: env.UPLOAD_MAX_BYTES, files: 1 },
  fileFilter: (_req, file, cb) => {
    const extension = getFileExtension(file.originalname)
    if (!IMAGE_EXTENSIONS.includes(extension)) {
      cb(badRequest(`File type not allowed: ${extension || '(none)'} — only ${IMAGE_EXTENSIONS.join(', ')}`))
      return
    }
    cb(null, true)
  },
})

// ---------- Routes ----------

adminSocialPostsRouter.get('/', requirePermission('social-posts:read'), async (req, res, next) => {
  try {
    const { status, platform, q } = req.query as { status?: string; platform?: string; q?: string }
    const where: Prisma.SocialMediaPostWhereInput = {}
    if (status && (SOCIAL_POST_STATUSES as readonly string[]).includes(status)) {
      where.status = status as SocialPostStatus
    }
    if (platform && (SOCIAL_PLATFORMS as readonly string[]).includes(platform)) {
      where.platform = platform as SocialPlatform
    }
    if (q && q.trim()) {
      const term = q.trim()
      where.OR = [
        { id: term },
        { externalPostId: term },
        { caption: { contains: term, mode: 'insensitive' } },
        { product: { slug: { contains: term, mode: 'insensitive' } } },
        { product: { translations: { some: { name: { contains: term, mode: 'insensitive' } } } } },
      ]
    }
    const posts = await prisma.socialMediaPost.findMany({
      where,
      include,
      orderBy: [{ scheduledAt: { sort: 'asc', nulls: 'last' } }, { createdAt: 'desc' }],
    })
    res.json({ posts })
  } catch (err) {
    next(err)
  }
})

/** Produktdaten zum Vorbefüllen des Editors (Name, Beschreibung, Preis, Link, Bilder). */
adminSocialPostsRouter.get(
  '/prefill/:productId',
  requirePermission('social-posts:read'),
  async (req, res, next) => {
    try {
      const product = await prisma.product.findUnique({
        where: { id: String(req.params.productId) },
        include: {
          translations: true,
          assets: { where: { type: 'image' }, orderBy: { sortOrder: 'asc' } },
        },
      })
      if (!product) throw notFound('Product not found')
      const translation =
        product.translations.find((t) => t.locale === 'de') ?? product.translations[0]
      res.json({
        prefill: {
          productId: product.id,
          slug: product.slug,
          name: translation?.name ?? product.slug,
          description: translation?.description ?? '',
          priceCents: product.priceCents,
          productUrl: `${env.WEB_URL}/products/${product.slug}`,
          images: product.assets.map((a) => ({ url: a.url, alt: a.alt })),
        },
      })
    } catch (err) {
      next(err)
    }
  },
)

adminSocialPostsRouter.get('/:id', requirePermission('social-posts:read'), async (req, res, next) => {
  try {
    const post = await prisma.socialMediaPost.findUnique({
      where: { id: String(req.params.id) },
      include,
    })
    if (!post) throw notFound('Social post not found')
    res.json({ post })
  } catch (err) {
    next(err)
  }
})

/** Ein Editor-Submit mit 1–2 Plattformen erzeugt eine Post-Zeile pro Plattform. */
adminSocialPostsRouter.post('/', requirePermission('social-posts:write'), async (req, res, next) => {
  try {
    const input = socialPostCreateSchema.parse(req.body)
    if (input.productId) {
      const product = await prisma.product.findUnique({ where: { id: input.productId } })
      if (!product) throw badRequest('Unknown productId')
    }
    if (input.schedule) {
      if (!input.scheduledAt) throw badRequest('scheduledAt is required to schedule a post')
      for (const platform of input.platforms) {
        const ready = validateSocialPostReadyToSchedule({ platform, mediaUrls: input.mediaUrls })
        if (!ready.ok) throw badRequest(ready.error)
      }
    }
    const posts = await prisma.$transaction(
      input.platforms.map((platform) =>
        prisma.socialMediaPost.create({
          data: {
            platform,
            status: input.schedule ? 'scheduled' : 'draft',
            caption: input.caption,
            mediaUrls: input.mediaUrls,
            productId: input.productId ?? null,
            scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : null,
            provider: env.SOCIAL_PUBLISHING_PROVIDER,
            createdById: req.user?.id ?? null,
          },
          include,
        }),
      ),
    )
    for (const post of posts) {
      await audit(
        req,
        input.schedule ? 'social_post.schedule' : 'social_post.create',
        { type: 'social_post', id: post.id },
        { platform: post.platform, scheduledAt: post.scheduledAt },
      )
    }
    res.status(201).json({ posts })
  } catch (err) {
    next(err)
  }
})

adminSocialPostsRouter.patch('/:id', requirePermission('social-posts:write'), async (req, res, next) => {
  try {
    const input = socialPostUpdateSchema.parse(req.body)
    const existing = await prisma.socialMediaPost.findUnique({ where: { id: String(req.params.id) } })
    if (!existing) throw notFound('Social post not found')
    if (!canEditSocialPost(existing.status)) {
      throw conflict(`Post in status "${existing.status}" cannot be edited`)
    }
    if (input.productId) {
      const product = await prisma.product.findUnique({ where: { id: input.productId } })
      if (!product) throw badRequest('Unknown productId')
    }
    const post = await prisma.socialMediaPost.update({
      where: { id: existing.id },
      data: {
        caption: input.caption,
        mediaUrls: input.mediaUrls,
        productId: input.productId === undefined ? undefined : input.productId,
        scheduledAt:
          input.scheduledAt === undefined
            ? undefined
            : input.scheduledAt
              ? new Date(input.scheduledAt)
              : null,
      },
      include,
    })
    await audit(req, 'social_post.update', { type: 'social_post', id: post.id }, input)
    res.json({ post })
  } catch (err) {
    next(err)
  }
})

/** Planen (draft/failed → scheduled) oder Umplanen (scheduled → neuer Zeitpunkt). */
adminSocialPostsRouter.post(
  '/:id/schedule',
  requirePermission('social-posts:write'),
  async (req, res, next) => {
    try {
      const input = socialPostScheduleSchema.parse(req.body)
      const existing = await prisma.socialMediaPost.findUnique({ where: { id: String(req.params.id) } })
      if (!existing) throw notFound('Social post not found')
      if (existing.status !== 'scheduled') assertSocialPostTransition(existing.status, 'scheduled')
      const ready = validateSocialPostReadyToSchedule({
        platform: existing.platform,
        mediaUrls: existing.mediaUrls,
      })
      if (!ready.ok) throw badRequest(ready.error)
      const post = await prisma.socialMediaPost.update({
        where: { id: existing.id },
        data: { status: 'scheduled', scheduledAt: new Date(input.scheduledAt) },
        include,
      })
      await audit(
        req,
        'social_post.schedule',
        { type: 'social_post', id: post.id },
        { from: existing.status, scheduledAt: input.scheduledAt },
      )
      res.json({ post })
    } catch (err) {
      next(err)
    }
  },
)

/** Sofort-Retry für fehlgeschlagene Posts: plant auf jetzt, nächster Tick veröffentlicht. */
adminSocialPostsRouter.post(
  '/:id/retry',
  requirePermission('social-posts:write'),
  async (req, res, next) => {
    try {
      const existing = await prisma.socialMediaPost.findUnique({ where: { id: String(req.params.id) } })
      if (!existing) throw notFound('Social post not found')
      assertSocialPostTransition(existing.status, 'scheduled')
      const ready = validateSocialPostReadyToSchedule({
        platform: existing.platform,
        mediaUrls: existing.mediaUrls,
      })
      if (!ready.ok) throw badRequest(ready.error)
      const post = await prisma.socialMediaPost.update({
        where: { id: existing.id },
        data: { status: 'scheduled', scheduledAt: new Date() },
        include,
      })
      await audit(req, 'social_post.retry', { type: 'social_post', id: post.id }, { attempts: existing.attempts })
      res.json({ post })
    } catch (err) {
      next(err)
    }
  },
)

adminSocialPostsRouter.post(
  '/:id/cancel',
  requirePermission('social-posts:write'),
  async (req, res, next) => {
    try {
      const existing = await prisma.socialMediaPost.findUnique({ where: { id: String(req.params.id) } })
      if (!existing) throw notFound('Social post not found')
      assertSocialPostTransition(existing.status, 'cancelled')
      const post = await prisma.socialMediaPost.update({
        where: { id: existing.id },
        data: { status: 'cancelled' },
        include,
      })
      await audit(req, 'social_post.cancel', { type: 'social_post', id: post.id }, { from: existing.status })
      res.json({ post })
    } catch (err) {
      next(err)
    }
  },
)

adminSocialPostsRouter.delete('/:id', requirePermission('social-posts:write'), async (req, res, next) => {
  try {
    const existing = await prisma.socialMediaPost.findUnique({ where: { id: String(req.params.id) } })
    if (!existing) throw notFound('Social post not found')
    if (!canDeleteSocialPost(existing.status)) {
      throw conflict('Published posts cannot be deleted')
    }
    await prisma.socialMediaPost.delete({ where: { id: existing.id } })
    await audit(
      req,
      'social_post.delete',
      { type: 'social_post', id: existing.id },
      { platform: existing.platform, status: existing.status },
    )
    res.json({ ok: true })
  } catch (err) {
    next(err)
  }
})

/** Manueller Scheduler-Lauf (dev-freundlich; produktiv läuft der Cron). */
adminSocialPostsRouter.post(
  '/run-scheduler',
  requirePermission('social-posts:write'),
  async (req, res, next) => {
    try {
      const result = await runSocialPublishingTick()
      await audit(req, 'social_post.run_scheduler', undefined, result)
      res.json({ result })
    } catch (err) {
      next(err)
    }
  },
)

adminSocialPostsRouter.post(
  '/media',
  requirePermission('social-posts:write'),
  mediaUpload.single('file'),
  async (req, res, next) => {
    try {
      const file = req.file
      if (!file) throw badRequest('An image file is required (field "file")')
      const url = `/api/social-media/${file.filename}`
      await audit(req, 'social_post.media.upload', undefined, {
        filename: file.filename,
        sizeBytes: file.size,
      })
      res.status(201).json({ media: { url } })
    } catch (err) {
      next(err)
    }
  },
)
