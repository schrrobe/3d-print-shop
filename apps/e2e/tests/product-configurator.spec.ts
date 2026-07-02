import { expect, test } from '@playwright/test'
import { ShopPage } from '../pages/shop.js'

test.describe('3d configurator', () => {
  test('renders the 3d viewer', async ({ page }) => {
    await page.goto('/products/desk-organizer')
    const viewer = page.getByTestId('model-viewer')
    await expect(viewer).toBeVisible()
    // GLB asset does not exist in the repo → fallback zone model renders
    await expect(viewer).toHaveAttribute('data-fallback', 'true', { timeout: 15_000 })
    await expect(viewer.locator('canvas')).toBeVisible()
  })

  test('shows color zones with global colors', async ({ page }) => {
    await page.goto('/products/desk-organizer')
    const picker = page.getByTestId('color-picker')
    await expect(picker).toBeVisible()
    // desk organizer has all 4 zones
    for (const zone of ['zone_1_main', 'zone_2_accent', 'zone_3_detail', 'zone_4_text']) {
      await expect(picker.locator(`[data-zone="${zone}"]`)).toBeVisible()
    }
    // active seed colors: 7 swatches per zone
    await expect(
      picker.locator('[data-zone="zone_1_main"]').getByTestId('color-swatch'),
    ).toHaveCount(7)
  })

  test('selecting a color updates the selection state', async ({ page }) => {
    await page.goto('/products/spiral-vase')
    const zone = page.getByTestId('color-picker').locator('[data-zone="zone_1_main"]')
    const swatch = zone.getByTestId('color-swatch').nth(3)
    await swatch.click()
    await expect(swatch).toHaveAttribute('aria-pressed', 'true')
  })

  test('configured colors end up in the cart line', async ({ page }) => {
    const shop = new ShopPage(page)
    await page.goto('/products/spiral-vase')
    await shop.acceptConsent()
    await page
      .getByTestId('color-picker')
      .locator('[data-zone="zone_1_main"]')
      .getByTestId('color-swatch')
      .first()
      .click()
    await page.getByTestId('add-to-cart').click()
    await page.goto('/cart')
    await expect(page.getByTestId('cart-item')).toHaveCount(1)
  })
})
