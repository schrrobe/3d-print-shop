import { expect, test } from '@playwright/test'
import { ShopPage } from '../pages/shop.js'
import { gotoHydrated } from '../helpers/hydration.js'

test.describe('cart', () => {
  test('empty cart shows hint', async ({ page }) => {
    await gotoHydrated(page, '/cart')
    await expect(page.getByTestId('cart-empty')).toBeVisible()
  })

  test('add, change quantity, remove', async ({ page }) => {
    const shop = new ShopPage(page)
    await shop.addProductToCart('patronenbox-9mm-luger-50')
    await expect(shop.cartCount()).toHaveText('1')

    await gotoHydrated(page, '/cart')
    await expect(page.getByTestId('cart-item')).toHaveCount(1)
    // 14,90 + 6,99 shipping
    await expect(page.getByTestId('cart-total')).toContainText('21,89')

    await page.getByTestId('cart-quantity').fill('3')
    await page.getByTestId('cart-quantity').dispatchEvent('change')
    await expect(page.getByTestId('cart-total')).toContainText('51,69')

    await page.getByTestId('cart-remove').click()
    await expect(page.getByTestId('cart-empty')).toBeVisible()
  })

  test('shipping is 6,99 € below 80 € and free above (DE)', async ({ page }) => {
    const shop = new ShopPage(page)
    await shop.addProductToCart('patronenbox-308-win-100') // 27,90
    await gotoHydrated(page, '/cart')
    await expect(page.getByTestId('cart-shipping')).toContainText('6,99')
    await expect(page.getByTestId('free-shipping-hint')).toBeVisible()
    await expect(page.getByTestId('free-box-hint')).toBeVisible()

    // 3 × 27,90 = 83,70 → free shipping within Germany, free box still missing
    await page.getByTestId('cart-quantity').fill('3')
    await page.getByTestId('cart-quantity').dispatchEvent('change')
    await expect(page.getByTestId('cart-shipping')).not.toContainText('6,99')
    await expect(page.getByTestId('cart-total')).toContainText('83,70')
    await expect(page.getByTestId('free-shipping-hint')).toBeHidden()
    await expect(page.getByTestId('free-box-hint')).toBeVisible()

    // 4 × 27,90 = 111,60 → free 50 box unlocked
    await page.getByTestId('cart-quantity').fill('4')
    await page.getByTestId('cart-quantity').dispatchEvent('change')
    await expect(page.getByTestId('free-box-hint')).toBeHidden()
  })

  test('cart persists across reloads (localStorage)', async ({ page }) => {
    const shop = new ShopPage(page)
    await shop.addProductToCart('patronenbox-9mm-luger-50')
    await page.reload()
    await expect(shop.cartCount()).toHaveText('1')
  })
})
