import { expect, test } from '@playwright/test'
import { createQuoteViaApi } from '../helpers/api.js'
import { ShopPage } from '../pages/shop.js'
import { gotoHydrated } from '../helpers/hydration.js'

test.describe('quote acceptance via payment link', () => {
  test('customer accepts a quote and receives a payment link', async ({ page }) => {
    const { token } = await createQuoteViaApi('accept-e2e@example.com')

    await gotoHydrated(page, `/quote/${token}`)
    await new ShopPage(page).acceptConsent()
    await expect(page.getByTestId('quote-page')).toBeVisible()
    await expect(page.getByTestId('quote-price')).toContainText('129,00')

    await page.getByTestId('quote-accept').click()
    await expect(page.getByTestId('quote-address-form')).toBeVisible()
    await page.locator('input').nth(0).fill('Andrea')
    await page.locator('input').nth(1).fill('Annahme')
    await page.locator('input').nth(2).fill('Angebotsweg 1')
    await page.locator('input').nth(3).fill('10115')
    await page.locator('input').nth(4).fill('Berlin')
    await page.locator('input').nth(5).fill('DE')
    await page.locator('input[type="email"]').fill('accept-e2e@example.com')
    await page.getByTestId('quote-accept-submit').click()

    await expect(page.getByTestId('quote-accepted')).toBeVisible()
    const payLink = page.getByTestId('quote-pay-link')
    await expect(payLink).toBeVisible()
    const href = await payLink.getAttribute('href')
    expect(href).toContain('/checkout/success')
  })

  test('customer can decline a quote', async ({ page }) => {
    const { token } = await createQuoteViaApi('decline-e2e@example.com')
    await gotoHydrated(page, `/quote/${token}`)
    await new ShopPage(page).acceptConsent()
    await page.getByTestId('quote-decline').click()
    await expect(page.getByTestId('quote-declined')).toBeVisible()
  })

  test('accepted quote payment link completes to a paid order', async ({ page, request }) => {
    const { token } = await createQuoteViaApi('paylink-e2e@example.com')
    const accept = await request.post(`http://localhost:3001/api/quotes/${token}/accept`, {
      data: {
        address: {
          firstName: 'Link',
          lastName: 'Zahler',
          street: 'Linkweg 2',
          zip: '10115',
          city: 'Berlin',
          country: 'DE',
          email: 'paylink-e2e@example.com',
        },
      },
    })
    expect(accept.ok()).toBe(true)
    const { paymentUrl, orderNumber, accessToken } = (await accept.json()) as {
      paymentUrl: string
      orderNumber: string
      accessToken: string
    }
    const sessionId = new URL(paymentUrl).searchParams.get('session')!
    await request.post(`http://localhost:3001/api/dev/stripe/complete/${sessionId}`)

    await gotoHydrated(page, `/order/${orderNumber}?token=${accessToken}`)
    await expect(page.getByTestId('order-status')).toContainText('Bezahlt')
  })

  test('invalid quote token shows 404', async ({ page }) => {
    const response = await page.goto('/quote/not-a-real-token')
    expect(response?.status()).toBe(404)
  })
})
