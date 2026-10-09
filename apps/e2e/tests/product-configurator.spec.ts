import { expect, test } from '@playwright/test'
import { ShopPage } from '../pages/shop.js'
import { gotoHydrated } from '../helpers/hydration.js'

test.describe('box configurator', () => {
  test('renders the live box drawing instead of a placeholder 3d model', async ({ page }) => {
    await gotoHydrated(page, '/products/patronenbox-308-win-100')
    const drawing = page.getByTestId('product-detail').getByTestId('box-drawing')
    await expect(drawing).toBeVisible()
    await expect(drawing).toHaveAttribute('data-capacity', '100')
    // no GLB uploaded for seeded boxes → no 3d viewer
    await expect(page.getByTestId('model-viewer')).toHaveCount(0)
  })

  test('size switch moves between the 50 and 100 round box and keeps the colours', async ({
    page,
  }) => {
    await gotoHydrated(page, '/products/patronenbox-9mm-luger-50')
    await new ShopPage(page).acceptConsent()
    const swatch = page
      .getByTestId('color-picker')
      .locator('[data-zone="zone_1_main"]')
      .getByTestId('color-swatch')
      .nth(2)
    await swatch.click()
    const chosen = await swatch.getAttribute('aria-label')
    await page.getByTestId('size-switch').getByRole('link', { name: /100/ }).click()
    await page.waitForURL(/patronenbox-9mm-luger-100/)
    await expect(page.getByTestId('box-drawing').first()).toHaveAttribute('data-capacity', '100')
    await expect(
      page
        .getByTestId('color-picker')
        .locator('[data-zone="zone_1_main"]')
        .getByLabel(chosen!, { exact: true }),
    ).toHaveAttribute('aria-pressed', 'true')
  })

  test('shows color zones with global colors', async ({ page }) => {
    await gotoHydrated(page, '/products/patronenbox-308-win-100')
    const picker = page.getByTestId('color-picker')
    await expect(picker).toBeVisible()
    // cartridge boxes have two zones: Box + Beschriftung
    for (const zone of ['zone_1_main', 'zone_4_text']) {
      await expect(picker.locator(`[data-zone="${zone}"]`)).toBeVisible()
    }
    // one swatch per active global color (count via public api — other tests may add colors)
    const response = await page.request.get('http://localhost:3001/api/colors')
    const { colors } = (await response.json()) as { colors: unknown[] }
    await expect(
      picker.locator('[data-zone="zone_1_main"]').getByTestId('color-swatch'),
    ).toHaveCount(colors.length)
  })

  test('selecting a color updates the selection state', async ({ page }) => {
    await gotoHydrated(page, '/products/patronenbox-9mm-luger-50')
    await new ShopPage(page).acceptConsent()
    const zone = page.getByTestId('color-picker').locator('[data-zone="zone_1_main"]')
    const swatch = zone.getByTestId('color-swatch').nth(3)
    await swatch.click()
    await expect(swatch).toHaveAttribute('aria-pressed', 'true')
  })

  test('configured colors end up in the cart line', async ({ page }) => {
    const shop = new ShopPage(page)
    await gotoHydrated(page, '/products/patronenbox-9mm-luger-50')
    await shop.acceptConsent()
    await page
      .getByTestId('color-picker')
      .locator('[data-zone="zone_1_main"]')
      .getByTestId('color-swatch')
      .first()
      .click()
    await page.getByTestId('add-to-cart').click()
    await gotoHydrated(page, '/cart')
    await expect(page.getByTestId('cart-item')).toHaveCount(1)
  })
})
