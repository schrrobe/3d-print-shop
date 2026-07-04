import { renderReviewApproved } from '@print-shop/emails'
import { assertReviewTransition } from '@print-shop/utils'
import { reviewModerateSchema } from '@print-shop/validators'
import { Router } from 'express'
import { env } from '../../env.js'
import { audit } from '../../lib/audit.js'
import { prisma } from '../../lib/prisma.js'
import { requirePermission } from '../../middleware/auth.js'
import { notFound } from '../../middleware/error.js'
import { sendEmail } from '../../services/email.js'

export const adminReviewsRouter = Router()

const reviewInclude = {
  order: {
    select: {
      id: true,
      orderNumber: true,
      email: true,
      firstName: true,
      lastName: true,
      locale: true,
    },
  },
  orderItem: { select: { id: true, name: true, quantity: true } },
  product: { select: { id: true, slug: true } },
  moderatedBy: { select: { name: true, email: true } },
} satisfies NonNullable<Parameters<typeof prisma.review.findUnique>[0]>['include']

adminReviewsRouter.get('/', requirePermission('reviews:read'), async (req, res, next) => {
  try {
    const status = req.query.status ? String(req.query.status) : undefined
    const flagged = req.query.flagged === 'true'
    const reviews = await prisma.review.findMany({
      where: {
        ...(status ? { status: status as never } : {}),
        ...(flagged ? { flaggedAbuse: true } : {}),
      },
      include: reviewInclude,
      orderBy: { createdAt: 'desc' },
      take: 200,
    })
    res.json({ reviews })
  } catch (err) {
    next(err)
  }
})

adminReviewsRouter.get('/:id', requirePermission('reviews:read'), async (req, res, next) => {
  try {
    const review = await prisma.review.findUnique({
      where: { id: String(req.params.id) },
      include: reviewInclude,
    })
    if (!review) throw notFound('Review not found')
    res.json({ review })
  } catch (err) {
    next(err)
  }
})

/**
 * Moderation: approve/reject/hide (review status machine), internal note,
 * abuse flag. Approval notifies the customer once (EmailLog dedupe upstream
 * is not needed — approval is a manual, audited action).
 */
adminReviewsRouter.patch('/:id', requirePermission('reviews:moderate'), async (req, res, next) => {
  try {
    const input = reviewModerateSchema.parse(req.body)
    const review = await prisma.review.findUnique({
      where: { id: String(req.params.id) },
      include: reviewInclude,
    })
    if (!review) throw notFound('Review not found')

    const statusChanges = input.status !== undefined && input.status !== review.status
    if (statusChanges && input.status) assertReviewTransition(review.status, input.status)

    const updated = await prisma.review.update({
      where: { id: review.id },
      data: {
        ...(statusChanges && input.status
          ? { status: input.status, moderatedById: req.user?.id ?? null, moderatedAt: new Date() }
          : {}),
        ...(input.internalNote !== undefined ? { internalNote: input.internalNote } : {}),
        ...(input.flaggedAbuse !== undefined ? { flaggedAbuse: input.flaggedAbuse } : {}),
      },
      include: reviewInclude,
    })

    await audit(
      req,
      'review.moderate',
      { type: 'review', id: review.id },
      { from: review.status, to: input.status ?? review.status, flaggedAbuse: input.flaggedAbuse },
    )

    if (statusChanges && input.status === 'approved') {
      await sendEmail(
        review.order.email,
        'review_approved',
        renderReviewApproved(
          {
            firstName: review.order.firstName,
            productName: review.orderItem.name,
            productUrl: `/products/`,
          },
          review.order.locale,
        ),
      )
    }
    res.json({ review: updated })
  } catch (err) {
    next(err)
  }
})

/** Photo view for moderation — works for every status (unlike the public route). */
adminReviewsRouter.get('/:id/photo', requirePermission('reviews:read'), async (req, res, next) => {
  try {
    const review = await prisma.review.findUnique({ where: { id: String(req.params.id) } })
    if (!review?.photoPath) throw notFound('Photo not found')
    res.setHeader('X-Content-Type-Options', 'nosniff')
    res.sendFile(review.photoPath)
  } catch (err) {
    next(err)
  }
})
