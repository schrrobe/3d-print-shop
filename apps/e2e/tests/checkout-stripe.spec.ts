import { expect, test } from '@playwright/test'
import { ShopPage } from '../pages/shop.js'
import { gotoHydrated } from '../helpers/hydration.js'

test.describe('checkout with stripe (mock)', () => {
  test('guest checkout completes and payment can be simulated', async ({ page }) => {
    const shop = new ShopPage(page)
    await shop.addProductToCart('spiral-vase')
    await gotoHydrated(page, '/checkout')
    await shop.fillCheckoutAddress('stripe-e2e@example.com')
    await page.getByTestId('payment-stripe').click()
    await page.getByTestId('submit-order').click()

    // Mock stripe redirects straight to the success page
    await page.waitForURL(/\/checkout\/success/)
    await expect(page.getByTestId('checkout-success')).toBeVisible()
    const orderNumber = await page.getByTestId('order-number').innerText()
    expect(orderNumber).toMatch(/^PS-\d{4}-\d{8}$/)

    // Complete the mock payment, then the order page shows "paid"
    await page.waitForSelector('html[data-hydrated="true"]')
    await page.getByTestId('simulate-payment').click()
    // button hides once the mock-complete request finished — next action must not cancel it
    await expect(page.getByTestId('simulate-payment')).toBeHidden()
    await page.getByTestId('view-order').click()
    await page.waitForURL(/\/order\//)
    await expect(page.getByTestId('order-page')).toBeVisible()
    // markOrderPaid (invoice pdf + emails) may still be running in CI — poll with reload
    await expect(async () => {
      await page.reload()
      await expect(page.getByTestId('order-status')).toContainText('Bezahlt', { timeout: 2000 })
    }).toPass({ timeout: 30_000 })
  })

  test('validation: missing address blocks submit', async ({ page }) => {
    const shop = new ShopPage(page)
    await shop.addProductToCart('spiral-vase')
    await gotoHydrated(page, '/checkout')
    // HTML5 required fields prevent submission — we stay on the checkout page
    await page.getByTestId('submit-order').click()
    await expect(page.getByTestId('checkout-form')).toBeVisible()
    expect(page.url()).toContain('/checkout')
  })

  test('bank transfer checkout shows bank details', async ({ page }) => {
    const shop = new ShopPage(page)
    await shop.addProductToCart('spiral-vase')
    await gotoHydrated(page, '/checkout')
    await shop.fillCheckoutAddress('bank-e2e@example.com')
    await page.getByTestId('payment-bank_transfer').click()
    await page.getByTestId('submit-order').click()
    await page.waitForURL(/\/order\//)
    await expect(page.getByTestId('bank-details')).toBeVisible()
    await expect(page.getByTestId('bank-details')).toContainText('IBAN')
  })

  test('bitcoin checkout: paid only after 2 confirmations', async ({ page, request }) => {
    const shop = new ShopPage(page)
    await shop.addProductToCart('spiral-vase')
    await gotoHydrated(page, '/checkout')
    await shop.fillCheckoutAddress('btc-e2e@example.com')
    await page.getByTestId('payment-bitcoin').click()
    await page.getByTestId('submit-order').click()
    await page.waitForURL(/\/order\//)

    const details = page.getByTestId('bitcoin-details')
    await expect(details).toBeVisible()
    const address = await page.getByTestId('bitcoin-address').innerText()
    expect(address).toContain('bc1q')
    await expect(page.getByTestId('bitcoin-confirmations')).toContainText('0/2')

    // Extract paymentId via the admin-free public payment endpoint on the page URL is not
    // available — advance via dev endpoint using the payment ID from the API
    const orderNumber = page.url().match(/\/order\/([^?]+)/)?.[1] ?? ''
    const token = new URL(page.url()).searchParams.get('token') ?? ''
    const orderData = (await (
      await request.get(`http://localhost:3001/api/orders/${orderNumber}?token=${token}`)
    ).json()) as { order: { payments: { id: string; method: string }[] } }
    const payment = orderData.order.payments.find((p) => p.method === 'bitcoin')!

    // 1 confirmation → still awaiting
    await request.post(`http://localhost:3001/api/dev/bitcoin/${payment.id}/advance`, {
      data: { confirmations: 1 },
    })
    await page.getByTestId('bitcoin-check').click()
    await expect(page.getByTestId('bitcoin-confirmations')).toContainText('1/2')
    await expect(page.getByTestId('order-status')).not.toContainText('Bezahlt')

    // 2 confirmations → paid
    await request.post(`http://localhost:3001/api/dev/bitcoin/${payment.id}/advance`, {
      data: { confirmations: 2 },
    })
    await page.getByTestId('bitcoin-check').click()
    await expect(page.getByTestId('order-status')).toContainText('Bezahlt')
  })
})
