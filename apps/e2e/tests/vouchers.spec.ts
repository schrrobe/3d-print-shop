import { expect, test } from '@playwright/test'
import { adminApiContext } from '../helpers/api.js'
import { gotoHydrated } from '../helpers/hydration.js'
import { AdminPage } from '../pages/admin.js'
import { ShopPage } from '../pages/shop.js'

/**
 * Vouchers e2e. Seed provides TEST10 (10 % on everything) and WELCOME5
 * (5 € fixed, min. 25 € order). Admin-created vouchers are unique per test.
 */
test.describe('vouchers — shop', () => {
  test('redeems a percentage voucher and reduces the total', async ({ page }) => {
    const shop = new ShopPage(page)
    await shop.addAndGotoCart('spiral-vase') // 24,99
    await shop.applyVoucher('TEST10')

    // 10 % of 24,99 = 2,50 → total 24,99 − 2,50 + 6,99 shipping = 29,48
    await expect(page.getByTestId('voucher-row')).toBeVisible()
    await expect(page.getByTestId('cart-discount')).toContainText('2,50')
    await expect(page.getByTestId('cart-total')).toContainText('29,48')
  })

  test('accepts lowercase input (case-insensitive)', async ({ page }) => {
    const shop = new ShopPage(page)
    await shop.addAndGotoCart('spiral-vase')

    await shop.applyVoucher('test10')
    await expect(page.getByTestId('voucher-row')).toContainText('TEST10')
    await expect(page.getByTestId('cart-discount')).toContainText('2,50')
  })

  test('removing a voucher restores the full total', async ({ page }) => {
    const shop = new ShopPage(page)
    await shop.addAndGotoCart('spiral-vase')

    await shop.applyVoucher('TEST10')
    await expect(page.getByTestId('cart-discount')).toBeVisible()

    await page.getByTestId('voucher-remove').click()
    await expect(page.getByTestId('voucher-row')).toBeHidden()
    await expect(page.getByTestId('cart-total')).toContainText('31,98') // 24,99 + 6,99
    await expect(page.getByTestId('voucher-input')).toBeVisible()
  })

  test('rejects an unknown code', async ({ page }) => {
    const shop = new ShopPage(page)
    await shop.addAndGotoCart('spiral-vase')

    await shop.applyVoucher('DOESNOTEXIST')
    await expect(page.getByTestId('voucher-error')).toBeVisible()
    await expect(page.getByTestId('voucher-row')).toBeHidden()
  })

  test('enforces the minimum order value', async ({ page }) => {
    const shop = new ShopPage(page)
    // One vase (24,99) is below the 25 € threshold of WELCOME5.
    await shop.addAndGotoCart('spiral-vase')

    await shop.applyVoucher('WELCOME5')
    await expect(page.getByTestId('voucher-error')).toContainText('25,00')
    await expect(page.getByTestId('voucher-row')).toBeHidden()

    // Two vases (49,98) clear the threshold → fixed 5 € discount applies.
    await page.getByTestId('cart-quantity').fill('2')
    await page.getByTestId('cart-quantity').dispatchEvent('change')
    await shop.applyVoucher('WELCOME5')
    await expect(page.getByTestId('cart-discount')).toContainText('5,00')
  })

  test('surfaces an inactive voucher on cart and checkout when the cart drops below the minimum', async ({
    page,
  }) => {
    const shop = new ShopPage(page)
    // Two vases (49,98) clear the 25 € threshold → WELCOME5 applies.
    await shop.addAndGotoCart('spiral-vase')
    await page.getByTestId('cart-quantity').fill('2')
    await page.getByTestId('cart-quantity').dispatchEvent('change')
    await shop.applyVoucher('WELCOME5')
    await expect(page.getByTestId('cart-discount')).toContainText('5,00')

    // Dropping back to one vase (24,99) falls below the minimum: the voucher is
    // kept but contributes nothing, so the cart surfaces a min-order hint.
    await page.getByTestId('cart-quantity').fill('1')
    await page.getByTestId('cart-quantity').dispatchEvent('change')
    await expect(page.getByTestId('voucher-row')).toBeHidden()
    await expect(page.getByTestId('voucher-inactive-hint')).toContainText('25,00')

    // The same state is surfaced consistently on the checkout page.
    await shop.gotoCheckout()
    await expect(page.getByTestId('checkout-discount')).toBeHidden()
    await expect(page.getByTestId('checkout-voucher-inactive-hint')).toContainText('25,00')
  })

  test('voucher survives a reload (localStorage)', async ({ page }) => {
    const shop = new ShopPage(page)
    await shop.addAndGotoCart('spiral-vase')
    await shop.applyVoucher('TEST10')
    await expect(page.getByTestId('cart-discount')).toBeVisible()

    await page.reload()
    await page.waitForSelector('html[data-hydrated="true"]')
    await expect(page.getByTestId('voucher-row')).toBeVisible()
    await expect(page.getByTestId('cart-discount')).toContainText('2,50')
  })

  test('carries the discount through checkout onto the order', async ({ page }) => {
    const shop = new ShopPage(page)
    await shop.addAndGotoCart('spiral-vase')
    await shop.applyVoucher('TEST10')
    await expect(page.getByTestId('cart-discount')).toBeVisible()

    await shop.gotoCheckout()
    // Checkout summary reflects the voucher.
    await expect(page.getByTestId('checkout-discount')).toContainText('2,50')

    await shop.fillCheckoutAddress('voucher-e2e@example.com')
    await page.getByTestId('payment-bank_transfer').click()
    await page.getByTestId('submit-order').click()

    await page.waitForURL(/\/order\//)
    await expect(page.getByTestId('order-page')).toBeVisible()
    await expect(page.getByTestId('order-discount')).toContainText('2,50')
  })
})

test.describe('vouchers — admin', () => {
  test('lists the seeded vouchers', async ({ page }) => {
    await new AdminPage(page).login()
    await gotoHydrated(page, '/admin/vouchers')
    await expect(page.getByTestId('admin-vouchers')).toBeVisible()
    await expect(page.getByText('TEST10')).toBeVisible()
    await expect(page.getByText('WELCOME5')).toBeVisible()
  })

  test('creates a percentage voucher that is redeemable in the shop', async ({ page }) => {
    await new AdminPage(page).login()
    await gotoHydrated(page, '/admin/vouchers/new')
    await page.getByTestId('voucher-code').locator('input').fill('E2E20')
    await page.getByTestId('type-percent').check()
    await page.getByTestId('voucher-value').locator('input').fill('20')
    await page.getByTestId('save-voucher').click()

    await page.waitForURL(/\/admin\/vouchers$/)
    await expect(page.getByText('E2E20')).toBeVisible()

    // Redeem it on the shop: 20 % of 24,99 = 5,00 → total 24,99 − 5,00 + 6,99 = 26,98
    const shop = new ShopPage(page)
    await shop.addAndGotoCart('spiral-vase')
    await shop.applyVoucher('E2E20')
    await expect(page.getByTestId('cart-discount')).toContainText('5,00')
    await expect(page.getByTestId('cart-total')).toContainText('26,98')
  })

  test('normalizes the code to uppercase on create', async ({ page }) => {
    await new AdminPage(page).login()
    await gotoHydrated(page, '/admin/vouchers/new')
    await page.getByTestId('voucher-code').locator('input').fill('lower15')
    await page.getByTestId('type-percent').check()
    await page.getByTestId('voucher-value').locator('input').fill('15')
    await page.getByTestId('save-voucher').click()

    await page.waitForURL(/\/admin\/vouchers$/)
    await expect(page.getByText('LOWER15')).toBeVisible()
  })

  test('rejects a duplicate code', async ({ page }) => {
    await new AdminPage(page).login()
    await gotoHydrated(page, '/admin/vouchers/new')
    await page.getByTestId('voucher-code').locator('input').fill('TEST10') // already seeded
    await page.getByTestId('type-percent').check()
    await page.getByTestId('voucher-value').locator('input').fill('5')
    await page.getByTestId('save-voucher').click()
    await expect(page.getByTestId('toast')).toContainText('bereits vergeben')
  })

  test('deactivating a voucher blocks redemption', async ({ page }) => {
    await new AdminPage(page).login()
    await gotoHydrated(page, '/admin/vouchers/new')
    await page.getByTestId('voucher-code').locator('input').fill('OFF10')
    await page.getByTestId('type-percent').check()
    await page.getByTestId('voucher-value').locator('input').fill('10')
    await page.getByTestId('save-voucher').click()
    await page.waitForURL(/\/admin\/vouchers$/)

    // Open detail, deactivate.
    await page.locator('tr', { hasText: 'OFF10' }).getByTestId('voucher-link').click()
    await page.waitForSelector('html[data-hydrated="true"]')
    await expect(page.getByTestId('admin-voucher-detail')).toBeVisible()
    await page.getByTestId('toggle-voucher').click()
    await expect(page.getByText('inaktiv')).toBeVisible()

    // Shop refuses the inactive code.
    const shop = new ShopPage(page)
    await shop.addAndGotoCart('spiral-vase')
    await shop.applyVoucher('OFF10')
    await expect(page.getByTestId('voucher-error')).toBeVisible()
    await expect(page.getByTestId('voucher-row')).toBeHidden()
  })

  test('a single-use voucher cannot be redeemed twice', async ({ page }) => {
    // Create a maxRedemptions=1 voucher via the admin API.
    const admin = await adminApiContext()
    const created = await admin.post('/api/admin/vouchers', {
      data: { code: 'ONCE1', type: 'percent', value: 10, active: true, maxRedemptions: 1 },
    })
    expect(created.ok()).toBe(true)
    await admin.dispose()

    // First redemption goes all the way through checkout.
    const shop = new ShopPage(page)
    await shop.addAndGotoCart('spiral-vase')
    await shop.applyVoucher('ONCE1')
    await expect(page.getByTestId('cart-discount')).toBeVisible()

    await shop.gotoCheckout()
    await shop.fillCheckoutAddress('once-e2e@example.com')
    await page.getByTestId('payment-bank_transfer').click()
    await page.getByTestId('submit-order').click()
    await page.waitForURL(/\/order\//)

    // Second attempt: the voucher is now exhausted.
    await shop.addAndGotoCart('spiral-vase')
    await shop.applyVoucher('ONCE1')
    await expect(page.getByTestId('voucher-error')).toBeVisible()
    await expect(page.getByTestId('voucher-row')).toBeHidden()
  })
})
