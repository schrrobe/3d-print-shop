import { expect, test, type Page } from '@playwright/test'
import { ShopPage } from '../pages/shop.js'
import { gotoHydrated } from '../helpers/hydration.js'

/** markOrderPaid (invoice pdf + emails) may still be running in CI — poll with reload. */
async function expectPaid(page: Page) {
  await expect(async () => {
    await page.reload()
    await expect(page.getByTestId('order-status')).toContainText('Bezahlt', { timeout: 2000 })
  }).toPass({ timeout: 30_000 })
}

test.describe('checkout with paypal (mock)', () => {
  test('paypal checkout captures on return and lands on the success page', async ({ page }) => {
    const shop = new ShopPage(page)
    await shop.addProductToCart('patronenbox-9mm-luger-50')
    await gotoHydrated(page, '/checkout')
    await shop.fillCheckoutAddress('paypal-e2e@example.com')
    await page.getByTestId('payment-paypal').click()
    await page.getByTestId('submit-order').click()

    // Mock approve URL is our return endpoint: capture, then 303 to the success page
    await page.waitForURL(/\/checkout\/success/)
    await expect(page.getByTestId('checkout-success')).toBeVisible()
    await expect(page.getByTestId('simulate-payment')).toBeHidden()
    await page.waitForSelector('html[data-hydrated="true"]')
    await page.getByTestId('view-order').click()
    await page.waitForURL(/\/order\//)
    await expectPaid(page)
  })

  test('abandoned paypal payment can be paid with stripe from the order page', async ({ page }) => {
    const shop = new ShopPage(page)
    await shop.addProductToCart('patronenbox-9mm-luger-50')
    await gotoHydrated(page, '/checkout')
    await shop.fillCheckoutAddress('paypal-abandon-e2e@example.com')
    await page.getByTestId('payment-paypal').click()

    // Customer never comes back from PayPal
    await page.route('**/api/payments/paypal/return**', (route) => route.abort())
    const checkout = page.waitForResponse(
      (res) => res.url().endsWith('/api/checkout') && res.request().method() === 'POST',
    )
    await page.getByTestId('submit-order').click()
    const { orderNumber, accessToken } = (await (await checkout).json()) as {
      orderNumber: string
      accessToken: string
    }
    await page.unroute('**/api/payments/paypal/return**')

    await gotoHydrated(page, `/order/${orderNumber}?token=${accessToken}`)
    await expect(page.getByTestId('paypal-pay-now')).toBeVisible()
    await page.getByTestId('stripe-pay-now').click()

    // Mock Stripe reopens the payment via the success page
    await page.waitForURL(/\/checkout\/success.*mock=1/)
    await page.waitForSelector('html[data-hydrated="true"]')
    await page.getByTestId('simulate-payment').click()
    await expect(page.getByTestId('simulate-payment')).toBeHidden()
    await page.getByTestId('view-order').click()
    await page.waitForURL(/\/order\//)
    await expectPaid(page)
    await expect(page.getByTestId('stripe-pay')).toBeHidden()
  })
})
