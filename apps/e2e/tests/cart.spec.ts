import { expect, test } from '@playwright/test'
import { ShopPage } from '../pages/shop.js'

test.describe('cart', () => {
  test('empty cart shows hint', async ({ page }) => {
    await page.goto('/cart')
    await expect(page.getByTestId('cart-empty')).toBeVisible()
  })

  test('add, change quantity, remove', async ({ page }) => {
    const shop = new ShopPage(page)
    await shop.addProductToCart('spiral-vase')
    await expect(shop.cartCount()).toHaveText('1')

    await page.goto('/cart')
    await expect(page.getByTestId('cart-item')).toHaveCount(1)
    // 24,99 + 6,99 shipping
    await expect(page.getByTestId('cart-total')).toContainText('31,98')

    await page.getByTestId('cart-quantity').fill('3')
    await page.getByTestId('cart-quantity').dispatchEvent('change')
    await expect(page.getByTestId('cart-total')).toContainText('81,96')

    await page.getByTestId('cart-remove').click()
    await expect(page.getByTestId('cart-empty')).toBeVisible()
  })

  test('shipping is 6,99 € below 150 € and free above', async ({ page }) => {
    const shop = new ShopPage(page)
    await shop.addProductToCart('desk-organizer') // 39,99
    await page.goto('/cart')
    await expect(page.getByTestId('cart-shipping')).toContainText('6,99')
    await expect(page.getByTestId('free-shipping-hint')).toBeVisible()

    // 4 × 39,99 = 159,96 → free shipping
    await page.getByTestId('cart-quantity').fill('4')
    await page.getByTestId('cart-quantity').dispatchEvent('change')
    await expect(page.getByTestId('cart-shipping')).not.toContainText('6,99')
    await expect(page.getByTestId('cart-total')).toContainText('159,96')
    await expect(page.getByTestId('free-shipping-hint')).toBeHidden()
  })

  test('cart persists across reloads (localStorage)', async ({ page }) => {
    const shop = new ShopPage(page)
    await shop.addProductToCart('spiral-vase')
    await page.reload()
    await expect(shop.cartCount()).toHaveText('1')
  })
})
