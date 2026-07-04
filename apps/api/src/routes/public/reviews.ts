import path from 'node:path'
import { renderReviewSubmitted } from '@print-shop/emails'
import { reviewCreateSchema } from '@print-shop/validators'
import { Router } from 'express'
import {
  cleanupUploadedFiles,
  createImageUpload,
  validateUploadedImages,
} from '../../lib/image-upload.js'
import { prisma } from '../../lib/prisma.js'
import { badRequest, conflict, notFound, unauthorized } from '../../middleware/error.js'
import { sensitiveLimiter } from '../../middleware/rate-limit.js'
import { hashPortalToken } from '../../middleware/portal-auth.js'
import { sendEmail } from '../../services/email.js'
import { isOrderReviewable, reviewEligibility } from '../../services/reviews.js'

export const reviewsRouter = Router()

const photoUpload = createImageUpload('reviews', { maxFiles: 1, maxBytes: 5 * 1024 * 1024 })

/**
 * Auth for review actions: either the order access token (?token= / body.token)
 * or a portal magic-link token (Authorization: Bearer) whose email must match
 * the order — reviews are only possible with a real order reference.
 */
async function orderForReview(
  req: {
    headers: Record<string, unknown>
    query: Record<string, unknown>
    body?: Record<string, unknown>
  },
  orderNumber: string,
) {
  const order = await prisma.order.findUnique({
    where: { orderNumber },
    include: { items: true },
  })
  if (!order) throw notFound('Order not found')

  const token = String(
    (req.body as Record<string, string> | undefined)?.token ?? req.query.token ?? '',
  )
  if (token && token === order.accessToken) return order

  const header = String(req.headers.authorization ?? '')
  const bearer = header.startsWith('Bearer ') ? header.slice('Bearer '.length).trim() : ''
  if (bearer) {
    const magic = await prisma.magicLinkToken.findUnique({
      where: { tokenHash: hashPortalToken(bearer) },
    })
    if (
      magic &&
      !magic.revokedAt &&
      magic.expiresAt > new Date() &&
      magic.email.toLowerCase() === order.email.toLowerCase()
    ) {
      return order
    }
  }
  throw unauthorized('Invalid order token')
}

/** Which items of this order can (still) be reviewed. */
reviewsRouter.get('/eligibility', sensitiveLimiter, async (req, res, next) => {
  try {
    const orderNumber = String(req.query.orderNumber ?? '')
    if (!orderNumber) throw badRequest('orderNumber is required')
    const order = await orderForReview(req, orderNumber)
    const eligibility = await reviewEligibility(order)
    res.json(eligibility)
  } catch (err) {
    next(err)
  }
})

/** Submit a review (multipart, optional photo). Default status: pending moderation. */
reviewsRouter.post('/', sensitiveLimiter, photoUpload.single('photo'), async (req, res, next) => {
  try {
    const body = req.body as Record<string, string>
    const input = reviewCreateSchema.parse({
      orderNumber: body.orderNumber,
      orderItemId: body.orderItemId,
      rating: body.rating,
      title: body.title || undefined,
      body: body.body,
      displayName: body.displayName,
      locale: body.locale || undefined,
    })
    const order = await orderForReview(req, input.orderNumber)
    if (!isOrderReviewable(order.status)) {
      throw conflict('Reviews are possible once the order has shipped')
    }
    const orderItem = order.items.find((i) => i.id === input.orderItemId)
    if (!orderItem) throw badRequest('Order item does not belong to this order')
    if (!orderItem.productId) throw badRequest('Only catalog products can be reviewed')
    await validateUploadedImages(req.file)

    const existing = await prisma.review.findUnique({ where: { orderItemId: orderItem.id } })
    if (existing) throw conflict('This item has already been reviewed')

    const review = await prisma.review.create({
      data: {
        orderItemId: orderItem.id,
        orderId: order.id,
        productId: orderItem.productId,
        rating: input.rating,
        title: input.title ?? null,
        body: input.body,
        displayName: input.displayName,
        locale: input.locale,
        photoPath: req.file ? path.resolve(req.file.path) : null,
      },
    })

    await sendEmail(
      order.email,
      'review_submitted',
      renderReviewSubmitted(
        { firstName: order.firstName, productName: orderItem.name },
        order.locale,
      ),
    )

    res.status(201).json({ ok: true, reviewId: review.id, status: review.status })
  } catch (err) {
    await cleanupUploadedFiles(req.file)
    next(err)
  }
})

/**
 * Review photos are public ONLY while the review is approved. Filename comes
 * from the DB lookup — the path parameter is only used as a lookup key.
 */
reviewsRouter.get('/photos/:filename', async (req, res, next) => {
  try {
    const filename = String(req.params.filename)
    if (filename.includes('/') || filename.includes('\\') || filename.includes('..')) {
      throw notFound('Photo not found')
    }
    const review = await prisma.review.findFirst({
      where: { status: 'approved', photoPath: { endsWith: `/${filename}` } },
    })
    if (!review?.photoPath) throw notFound('Photo not found')
    res.setHeader('X-Content-Type-Options', 'nosniff')
    res.sendFile(review.photoPath)
  } catch (err) {
    next(err)
  }
})
