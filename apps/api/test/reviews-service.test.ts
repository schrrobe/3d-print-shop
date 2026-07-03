import type { Review } from '@prisma/client'
import { describe, expect, it } from 'vitest'
import { isOrderReviewable, reviewPublicDto } from '../src/services/reviews.js'

describe('isOrderReviewable', () => {
  it('allows reviews once the order left the house', () => {
    expect(isOrderReviewable('shipped')).toBe(true)
    expect(isOrderReviewable('completed')).toBe(true)
  })

  it('rejects everything before shipping and all terminal failure states', () => {
    for (const status of [
      'pending',
      'awaiting_payment',
      'awaiting_bank_transfer',
      'paid',
      'in_production',
      'quality_check',
      'ready_to_ship',
      'cancelled',
      'refunded',
    ] as const) {
      expect(isOrderReviewable(status)).toBe(false)
    }
  })
})

describe('reviewPublicDto', () => {
  const review = {
    id: 'rev1',
    orderItemId: 'oi1',
    orderId: 'o1',
    productId: 'p1',
    rating: 5,
    title: 'Top',
    body: 'Sehr sauber gedruckt.',
    photoPath: '/var/uploads/reviews/1751500000_abc123_photo.jpg',
    displayName: 'Anna K.',
    locale: 'de',
    status: 'approved',
    internalNote: 'internal only',
    flaggedAbuse: false,
    moderatedById: 'user1',
    moderatedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  } as Review

  it('exposes only public fields — no email, order linkage, stored path or moderation data', () => {
    const dto = reviewPublicDto(review)
    expect(Object.keys(dto).sort()).toEqual(
      ['body', 'createdAt', 'displayName', 'id', 'photoUrl', 'rating', 'title'].sort(),
    )
  })

  it('maps the photo path to the public route using only the basename', () => {
    const dto = reviewPublicDto(review)
    expect(dto.photoUrl).toBe('/api/reviews/photos/1751500000_abc123_photo.jpg')
    expect(dto.photoUrl).not.toContain('/var/uploads')
  })

  it('returns null photoUrl without a photo', () => {
    expect(reviewPublicDto({ ...review, photoPath: null }).photoUrl).toBeNull()
  })
})
