import { expect, test } from '@playwright/test'
import { gotoHydrated } from '../helpers/hydration.js'

test.describe('wishlist (guest, localStorage)', () => {
  test('add a configuration, persist across reload, move to cart', async ({ page }) => {
    await gotoHydrated(page, '/products/spiral-vase')
    await page.getByTestId('product-wishlist').click()

    await gotoHydrated(page, '/wishlist')
    await expect(page.getByTestId('wishlist-item').first()).toBeVisible()

    // Persists across a reload (localStorage)
    await page.reload()
    await page.waitForSelector('html[data-hydrated="true"]')
    await expect(page.getByTestId('wishlist-item').first()).toBeVisible()

    // Move to cart
    await page.getByTestId('wishlist-to-cart').first().click()
    await gotoHydrated(page, '/cart')
    await expect(page.getByTestId('cart-item').first()).toBeVisible()
  })

  test('empty wishlist shows an empty state', async ({ page }) => {
    // Fresh context via clearing localStorage
    await gotoHydrated(page, '/wishlist')
    await page.evaluate(() => localStorage.removeItem('print-shop-wishlist'))
    await page.reload()
    await page.waitForSelector('html[data-hydrated="true"]')
    await expect(page.getByTestId('wishlist-empty')).toBeVisible()
  })

  test('wishlist toggle on the product page reflects membership', async ({ page }) => {
    await gotoHydrated(page, '/products/desk-organizer')
    const button = page.getByTestId('product-wishlist')
    await expect(button).toHaveAttribute('aria-pressed', 'false')
    await button.click()
    await expect(button).toHaveAttribute('aria-pressed', 'true')
    await button.click()
    await expect(button).toHaveAttribute('aria-pressed', 'false')
  })
})
