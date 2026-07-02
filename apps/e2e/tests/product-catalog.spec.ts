import { expect, test } from '@playwright/test'
import { adminApiContext } from '../helpers/api.js'
import { gotoHydrated } from '../helpers/hydration.js'

test.describe('product catalog', () => {
  test('lists the seeded products', async ({ page }) => {
    await gotoHydrated(page, '/products')
    const grid = page.getByTestId('product-grid')
    await expect(grid).toBeVisible()
    // all four seed products are present (other tests may add more)
    for (const slug of ['spiral-vase', 'desk-organizer', 'planetary-gear-toy', 'wall-hook-set']) {
      await expect(page.getByTestId(`product-${slug}`)).toBeVisible()
    }
    expect(await grid.getByTestId('product-card').count()).toBeGreaterThanOrEqual(4)
  })

  test('shows product details with name and price', async ({ page }) => {
    await gotoHydrated(page, '/products/spiral-vase')
    await expect(page.getByTestId('product-name')).toHaveText('Spiralvase')
    await expect(page.getByTestId('product-detail').getByTestId('price').first()).toContainText('24,99')
  })

  test('unknown product returns 404', async ({ page }) => {
    const response = await page.goto('/products/does-not-exist')
    expect(response?.status()).toBe(404)
  })

  test('inactive products are not listed publicly', async ({ page }) => {
    // deactivate a seed product via the admin api, verify it disappears, restore it
    const admin = await adminApiContext()
    const products = (await (await admin.get('/api/admin/products')).json()) as {
      products: { id: string; slug: string }[]
    }
    const hookSet = products.products.find((p) => p.slug === 'wall-hook-set')!
    await admin.patch(`/api/admin/products/${hookSet.id}`, { data: { active: false } })

    try {
      await gotoHydrated(page, '/products')
      await expect(page.getByTestId('product-wall-hook-set')).toBeHidden()
      await expect(page.getByTestId('product-spiral-vase')).toBeVisible()
    } finally {
      await admin.patch(`/api/admin/products/${hookSet.id}`, { data: { active: true } })
      await admin.dispose()
    }
  })
})
