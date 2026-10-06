/** Public review client: eligibility + submission for a real order. */
export interface ReviewEligibilityItem {
  orderItemId: string
  productId: string | null
  name: string
  quantity: number
  alreadyReviewed: boolean
}

export interface PublicReview {
  id: string
  rating: number
  title: string | null
  body: string
  displayName: string
  photoUrl: string | null
  createdAt: string
}

export function useReviews() {
  async function eligibility(orderNumber: string, token: string) {
    return $fetch<{ eligible: boolean; items: ReviewEligibilityItem[] }>('/api/reviews/eligibility', {
      query: { orderNumber, token },
    })
  }

  async function submit(input: {
    orderNumber: string
    token: string
    orderItemId: string
    rating: number
    title?: string
    body: string
    displayName: string
    locale: string
    photo?: File | null
  }) {
    const form = new FormData()
    form.append('orderNumber', input.orderNumber)
    form.append('token', input.token)
    form.append('orderItemId', input.orderItemId)
    form.append('rating', String(input.rating))
    if (input.title) form.append('title', input.title)
    form.append('body', input.body)
    form.append('displayName', input.displayName)
    form.append('locale', input.locale)
    if (input.photo) form.append('photo', input.photo)
    return $fetch<{ ok: boolean; reviewId: string; status: string }>('/api/reviews', {
      method: 'POST',
      body: form,
    })
  }

  async function forProduct(slug: string) {
    return $fetch<{ reviews: PublicReview[]; averageRating: number | null; count: number }>(
      `/api/products/${slug}/reviews`,
    )
  }

  return { eligibility, submit, forProduct }
}
