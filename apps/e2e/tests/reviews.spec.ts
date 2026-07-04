import { expect, test, type APIRequestContext } from '@playwright/test'
import { adminApiContext, apiContext } from '../helpers/api.js'
import { gotoHydrated } from '../helpers/hydration.js'

const ORDER = 'PS-2026-00000004'
const ORDER_TOKEN = 'seed-token-order-4'

async function organizerItemId(ctx: APIRequestContext): Promise<string> {
  const order = (await (await ctx.get(`/api/orders/${ORDER}`, { params: { token: ORDER_TOKEN } })).json()) as {
    order: { items: { id: string; name: string }[] }
  }
  // The desk-organizer line is deliberately left unreviewed in the seed
  const item = order.order.items.find((i) => i.name.includes('Organizer'))
  return item!.id
}

test.describe('reviews', () => {
  test('a review can be submitted once per order item', async () => {
    const ctx = await apiContext()
    const orderItemId = await organizerItemId(ctx)

    const form = new FormData()
    form.append('orderNumber', ORDER)
    form.append('token', ORDER_TOKEN)
    form.append('orderItemId', orderItemId)
    form.append('rating', '5')
    form.append('body', 'Sehr gute Qualität, schnelle Lieferung. Absolut empfehlenswert!')
    form.append('displayName', 'Test Tester')
    form.append('locale', 'de')

    const created = await ctx.post('/api/reviews', { multipart: form })
    expect(created.status()).toBe(201)
    const body = (await created.json()) as { status: string }
    expect(body.status).toBe('pending')

    // Duplicate submission for the same item is blocked
    const form2 = new FormData()
    form2.append('orderNumber', ORDER)
    form2.append('token', ORDER_TOKEN)
    form2.append('orderItemId', orderItemId)
    form2.append('rating', '4')
    form2.append('body', 'Noch eine Bewertung für dieselbe Position.')
    form2.append('displayName', 'Test Tester')
    form2.append('locale', 'de')
    const dupe = await ctx.post('/api/reviews', { multipart: form2 })
    expect(dupe.status()).toBe(409)
    await ctx.dispose()
  })

  test('approved reviews are public, no private data leaks', async () => {
    const ctx = await apiContext()
    const res = await ctx.get('/api/products/spiral-vase/reviews')
    const data = (await res.json()) as {
      reviews: Record<string, unknown>[]
      averageRating: number | null
      count: number
    }
    expect(data.count).toBeGreaterThanOrEqual(1)
    // Seeded approved review by "Anna K."
    expect(data.reviews.some((r) => r.displayName === 'Anna K.')).toBe(true)
    // No email / order linkage in the public payload
    for (const review of data.reviews) {
      expect(review.email).toBeUndefined()
      expect(review.orderId).toBeUndefined()
    }
    await ctx.dispose()
  })

  test('rejected reviews never appear publicly', async () => {
    const ctx = await apiContext()
    const res = await ctx.get('/api/products/wall-hook-set/reviews')
    const data = (await res.json()) as { reviews: { rating: number }[] }
    // The seeded 1-star abuse review on the hook set is rejected → hidden
    expect(data.reviews.some((r) => r.rating === 1)).toBe(false)
    await ctx.dispose()
  })

  test('admin approves a pending review', async () => {
    const admin = await adminApiContext()
    const list = (await (await admin.get('/api/admin/reviews?status=pending')).json()) as {
      reviews: { id: string; status: string }[]
    }
    expect(list.reviews.length).toBeGreaterThan(0)
    const target = list.reviews[0]!
    const patched = await admin.patch(`/api/admin/reviews/${target.id}`, { data: { status: 'approved' } })
    expect(patched.ok()).toBe(true)
    const body = (await patched.json()) as { review: { status: string } }
    expect(body.review.status).toBe('approved')
    await admin.dispose()
  })

  test('product page renders the reviews section', async ({ page }) => {
    await gotoHydrated(page, '/products/spiral-vase')
    await expect(page.getByTestId('product-reviews')).toBeVisible()
    await expect(page.getByText('Anna K.')).toBeVisible()
  })
})
