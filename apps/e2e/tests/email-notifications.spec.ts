import { expect, test } from '@playwright/test'
import { UPLOAD_TERMS_VERSION } from '@print-shop/utils'
import { apiContext, createQuoteViaApi } from '../helpers/api.js'
import { ShopPage } from '../pages/shop.js'
import { gotoHydrated } from '../helpers/hydration.js'

/** Emails run in dev-log mode (no RESEND_API_KEY) — asserted via the EmailLog. */
async function emailsFor(to: string): Promise<string[]> {
  const ctx = await apiContext()
  const response = await ctx.get(`/api/dev/emails?to=${encodeURIComponent(to)}`)
  const data = (await response.json()) as { emails: { template: string }[] }
  await ctx.dispose()
  return data.emails.map((e) => e.template)
}

test.describe('email notifications (dev mode log)', () => {
  test('checkout + payment sends confirmation, payment_received and invoice', async ({ page }) => {
    const email = `mail-e2e-${Date.now()}@example.com`
    const shop = new ShopPage(page)
    await shop.addProductToCart('spiral-vase')
    await gotoHydrated(page, '/checkout')
    await shop.fillCheckoutAddress(email)
    await page.getByTestId('payment-stripe').click()
    await page.getByTestId('submit-order').click()
    await page.waitForURL(/\/checkout\/success/)

    expect(await emailsFor(email)).toContain('order_confirmation')

    await page.waitForSelector('html[data-hydrated="true"]')
    await page.getByTestId('simulate-payment').click()
    // button hides once the mock-complete request finished — next action must not cancel it
    await expect(page.getByTestId('simulate-payment')).toBeHidden()
    await expect
      .poll(async () => emailsFor(email), { timeout: 10_000 })
      .toEqual(expect.arrayContaining(['payment_received', 'invoice']))
  })

  test('upload request sends upload_received + admin notification', async ({ request }) => {
    const email = `upload-mail-${Date.now()}@example.com`
    await request.post('http://localhost:3001/api/upload-requests', {
      multipart: {
        files: {
          name: 'mail.stl',
          mimeType: 'application/octet-stream',
          buffer: Buffer.from('solid m\nendsolid m'),
        },
        name: 'Mail Tester',
        email,
        description: 'E-Mail-Benachrichtigungstest für Uploads.',
        acceptsUploadTerms: 'true',
        uploadTermsVersion: UPLOAD_TERMS_VERSION,
      },
    })
    expect(await emailsFor(email)).toContain('upload_received')
    expect(await emailsFor('admin@example.com')).toContain('admin_notification')
  })

  test('quote flow sends quote_available and quote_accepted', async ({ request }) => {
    const email = `quote-mail-${Date.now()}@example.com`
    const { token } = await createQuoteViaApi(email)
    expect(await emailsFor(email)).toContain('quote_available')

    await request.post(`http://localhost:3001/api/quotes/${token}/accept`, {
      data: {
        address: {
          firstName: 'Q',
          lastName: 'M',
          street: 'Weg 1',
          zip: '10115',
          city: 'Berlin',
          country: 'DE',
          email,
        },
      },
    })
    expect(await emailsFor(email)).toContain('quote_accepted')
  })
})
