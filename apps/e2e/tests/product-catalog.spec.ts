import { expect, test } from '@playwright/test'
import { adminApiContext } from '../helpers/api.js'
import { gotoHydrated } from '../helpers/hydration.js'

// The list shows one row per caliber family (50 + 100 round box), linked to the 50 round box
const SEED_SLUGS = ['9mm-luger', '45-acp', '22-lr', '223-rem', '308-win', '762x39'].map(
  (caliber) => `patronenbox-${caliber}-50`,
)

test.describe('product catalog', () => {
  test('lists the seeded products', async ({ page }) => {
    await gotoHydrated(page, '/products')
    const grid = page.getByTestId('product-grid')
    await expect(grid).toBeVisible()
    // all six seeded caliber families are present (other tests may add more)
    for (const slug of SEED_SLUGS) {
      await expect(page.getByTestId(`product-${slug}`)).toBeVisible()
    }
    expect(await grid.getByTestId('product-card').count()).toBeGreaterThanOrEqual(6)
  })

  test('filters the catalog via the search field', async ({ page }) => {
    await gotoHydrated(page, '/products')
    await expect(page.getByTestId('product-grid')).toBeVisible()

    const search = page.getByTestId('product-search').getByRole('searchbox')
    await search.fill('Luger')
    await expect(page.getByTestId('product-patronenbox-9mm-luger-50')).toBeVisible()
    await expect(page.getByTestId('product-patronenbox-308-win-50')).toBeHidden()

    await search.fill('zzzzzz-no-match')
    await expect(page.getByTestId('product-search-empty')).toBeVisible()

    await search.fill('')
    for (const slug of SEED_SLUGS) {
      await expect(page.getByTestId(`product-${slug}`)).toBeVisible()
    }
  })

  test('shows product details with name and price', async ({ page }) => {
    await gotoHydrated(page, '/products/patronenbox-9mm-luger-50')
    await expect(page.getByTestId('product-name')).toHaveText('Patronenbox 9 mm Luger – 50 Schuss')
    await expect(page.getByTestId('product-detail').getByTestId('price').first()).toContainText(
      '14,90',
    )
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
    const hookSet = products.products.find((p) => p.slug === 'patronenbox-762x39-50')!
    await admin.patch(`/api/admin/products/${hookSet.id}`, { data: { active: false } })

    try {
      await gotoHydrated(page, '/products')
      await expect(page.getByTestId('product-patronenbox-762x39-50')).toBeHidden()
      await expect(page.getByTestId('product-patronenbox-9mm-luger-50')).toBeVisible()
    } finally {
      await admin.patch(`/api/admin/products/${hookSet.id}`, { data: { active: true } })
      await admin.dispose()
    }
  })
})
