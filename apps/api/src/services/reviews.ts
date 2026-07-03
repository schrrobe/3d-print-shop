import { renderReviewRequest } from '@print-shop/emails'
import type { Order, OrderItem, Review } from '@prisma/client'
import { prisma } from '../lib/prisma.js'
import { orderUrl } from './order-flow.js'
import { sendEmail } from './email.js'

/** Reviews are open once the order left the house; cancelled/refunded never qualify. */
export const REVIEWABLE_ORDER_STATUSES = ['shipped', 'completed'] as const

export function isOrderReviewable(status: Order['status']): boolean {
  return (REVIEWABLE_ORDER_STATUSES as readonly string[]).includes(status)
}

export interface ReviewEligibilityItem {
  orderItemId: string
  productId: string | null
  name: string
  quantity: number
  alreadyReviewed: boolean
}

/**
 * Reviewable items of an order: catalog products only (quote items without a
 * productId are not reviewable), one review per order item (unique constraint
 * is the hard backstop — this is the soft report for the UI).
 */
export async function reviewEligibility(
  order: Order & { items: OrderItem[] },
): Promise<{ eligible: boolean; items: ReviewEligibilityItem[] }> {
  const eligible = isOrderReviewable(order.status)
  const reviews = await prisma.review.findMany({
    where: { orderId: order.id },
    select: { orderItemId: true },
  })
  const reviewed = new Set(reviews.map((r) => r.orderItemId))
  return {
    eligible,
    items: order.items
      .filter((item) => item.productId != null)
      .map((item) => ({
        orderItemId: item.id,
        productId: item.productId,
        name: item.name,
        quantity: item.quantity,
        alreadyReviewed: reviewed.has(item.id),
      })),
  }
}

/** Public review DTO — displayName is the only customer-identifying field. */
export function reviewPublicDto(review: Review) {
  return {
    id: review.id,
    rating: review.rating,
    title: review.title,
    body: review.body,
    displayName: review.displayName,
    photoUrl: review.photoPath
      ? `/api/reviews/photos/${encodeURIComponent(review.photoPath.split('/').pop() ?? '')}`
      : null,
    createdAt: review.createdAt,
  }
}

/**
 * Review request email. Dedupe via EmailLog (template + order number in the
 * subject) so the automatic trigger (order → completed) and the manual admin
 * button never double-send.
 */
export async function sendReviewRequestEmail(orderId: string): Promise<{ sent: boolean; reason?: string }> {
  const order = await prisma.order.findUniqueOrThrow({
    where: { id: orderId },
    include: { items: true },
  })
  if (!isOrderReviewable(order.status)) {
    return { sent: false, reason: 'Order is not in a reviewable status' }
  }
  const { items } = await reviewEligibility(order)
  const openItems = items.filter((i) => !i.alreadyReviewed)
  if (openItems.length === 0) return { sent: false, reason: 'All items are already reviewed' }

  const rendered = renderReviewRequest(
    {
      orderNumber: order.orderNumber,
      firstName: order.firstName,
      items: openItems.map((i) => ({ name: i.name })),
      reviewUrl: `${orderUrl(order)}#review`,
    },
    order.locale,
  )
  const alreadySent = await prisma.emailLog.findFirst({
    where: { to: order.email, template: 'review_request', subject: rendered.subject },
  })
  if (alreadySent) return { sent: false, reason: 'Review request already sent' }

  await sendEmail(order.email, 'review_request', rendered)
  return { sent: true }
}
