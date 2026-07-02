import { expect, test } from '@playwright/test'

test.describe('product catalog', () => {
  test('lists the seeded products', async ({ page }) => {
    await page.goto('/products')
    const grid = page.getByTestId('product-grid')
    await expect(grid).toBeVisible()
    await expect(page.getByTestId('product-spiral-vase')).toBeVisible()
    await expect(page.getByTestId('product-desk-organizer')).toBeVisible()
    await expect(grid.getByTestId('product-card')).toHaveCount(4)
  })

  test('shows product details with name and price', async ({ page }) => {
    await page.goto('/products/spiral-vase')
    await expect(page.getByTestId('product-name')).toHaveText('Spiralvase')
    await expect(page.getByTestId('product-detail').getByTestId('price').first()).toContainText('24,99')
  })

  test('unknown product returns 404', async ({ page }) => {
    const response = await page.goto('/products/does-not-exist')
    expect(response?.status()).toBe(404)
  })

  test('inactive products are not listed publicly', async ({ page }) => {
    await page.goto('/products')
    await expect(page.getByTestId('product-grid')).toBeVisible()
    // Seed contains only 4 active products; an inactive one must not appear
    await expect(page.getByTestId('product-card')).toHaveCount(4)
  })
})
