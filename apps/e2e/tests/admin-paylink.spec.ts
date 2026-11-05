import { expect, test, type APIRequestContext, type Page } from '@playwright/test'
import { apiContext } from '../helpers/api.js'
import { AdminPage } from '../pages/admin.js'
import { gotoHydrated } from '../helpers/hydration.js'

/** Emails run in dev-log mode (no SMTP_HOST) — asserted via the EmailLog. */
async function emailsFor(to: string): Promise<string[]> {
  const ctx = await apiContext()
  const response = await ctx.get(`/api/dev/emails?to=${encodeURIComponent(to)}`)
  const data = (await response.json()) as { emails: { template: string }[] }
  await ctx.dispose()
  return data.emails.map((e) => e.template)
}

/** Mock Stripe: "Pay now" on the order page hands out the session to complete. */
async function startStripePayment(request: APIRequestContext, orderPageUrl: string) {
  const url = new URL(orderPageUrl)
  const orderNumber = url.pathname.split('/').pop()!
  const response = await request.post(
    `http://localhost:3001/api/orders/${orderNumber}/stripe-session?token=${url.searchParams.get('token')}`,
  )
  const { redirectUrl } = (await response.json()) as { redirectUrl: string }
  return new URL(redirectUrl).searchParams.get('session')!
}

async function fillPaylink(page: Page, email: string, method: 'online' | 'bank') {
  await gotoHydrated(page, '/admin/orders')
  await page.getByTestId('create-paylink').click()
  await page.waitForURL(/\/admin\/orders\/new/)
  await page.waitForSelector('html[data-hydrated="true"]')

  await page.getByLabel(/^Vorname/).fill('Karl')
  await page.getByLabel(/^Nachname/).fill('Kaliber')
  await page.getByLabel(/^Straße/).fill('Schießstandweg 3')
  await page.getByLabel(/^PLZ/).fill('44263')
  await page.getByLabel(/^Ort/).fill('Dortmund')
  await page.getByTestId('paylink-email').locator('input').fill(email)

  const line = page.getByTestId('paylink-line').first()
  await line.getByLabel(/^Bezeichnung/).fill('Patronenbox .17 HMR, 50 Schuss, schwarz/rot')
  await line.getByLabel(/^Menge/).fill('2')
  await line.getByLabel(/^Stückpreis/).fill('24.50')
  if (method === 'bank') await page.getByLabel('Banküberweisung (Rechnung sofort)').check()

  // 2 × 24,50 € + 6,99 € default domestic shipping
  await expect(page.getByTestId('paylink-total')).toContainText('55,99')
  await page.getByTestId('paylink-submit').click()
  await page.waitForURL(/\/admin\/orders\/(?!new)[^/]+$/)
}

test.describe('Admin-Bestellung with Zahlungslink', () => {
  test('online: order page link mailed, paid there, invoice sent', async ({ page, request }) => {
    const email = `paylink-stripe-${Date.now()}@example.com`
    await new AdminPage(page).login()
    await fillPaylink(page, email, 'online')

    const link = page.getByTestId('payment-link')
    await expect(link).toBeVisible()
    const href = await link.locator('a').getAttribute('href')
    expect(href).toMatch(/\/order\/[^/?]+\?token=/)
    expect(await emailsFor(email)).toContain('payment_link')
    expect(await emailsFor(email)).not.toContain('order_confirmation')

    const sessionId = await startStripePayment(request, href!)
    await request.post(`http://localhost:3001/api/dev/stripe/complete/${sessionId}`)
    await page.reload()
    await expect(page.getByTestId('admin-order-status')).toContainText('paid')
    await expect(page.getByTestId('payment-link')).toBeHidden()
    await expect
      .poll(async () => emailsFor(email), { timeout: 10_000 })
      .toEqual(expect.arrayContaining(['payment_received', 'invoice']))
  })

  test('Banküberweisung: invoice issued immediately, no link', async ({ page }) => {
    const email = `paylink-bank-${Date.now()}@example.com`
    await new AdminPage(page).login()
    await fillPaylink(page, email, 'bank')

    await expect(page.getByTestId('admin-order-status')).toContainText('awaiting_bank_transfer')
    await expect(page.getByTestId('payment-link')).toBeHidden()
    await expect(page.getByTestId('invoice-status')).toBeVisible()
    const mails = await emailsFor(email)
    expect(mails).toContain('invoice')
    expect(mails).not.toContain('payment_link')
  })

  test('shop product can be added as a prefilled line', async ({ page }) => {
    await new AdminPage(page).login()
    await gotoHydrated(page, '/admin/orders/new')

    await page.getByRole('combobox', { name: 'Aus dem Shop' }).click()
    await page.getByRole('option').first().click()

    const lines = page.getByTestId('paylink-line')
    await expect(lines).toHaveCount(2)
    await expect(lines.nth(1).getByLabel(/^Bezeichnung/)).not.toHaveValue('')
    await expect(lines.nth(1).getByLabel(/^Stückpreis/)).not.toHaveValue('')
  })

  test('cancelling an online order removes the open link', async ({ page }) => {
    await new AdminPage(page).login()
    await fillPaylink(page, `paylink-cancel-${Date.now()}@example.com`, 'online')
    await expect(page.getByTestId('payment-link')).toBeVisible()

    await page.getByTestId('status-cancelled').click()
    await expect(page.getByTestId('admin-order-status')).toContainText('cancelled')
    await expect(page.getByTestId('payment-link')).toBeHidden()

    await gotoHydrated(page, '/admin/orders')
    await page.getByTestId('order-source-filter').selectOption('admin')
    await expect(
      page.locator('td').getByText('Admin-Bestellung', { exact: true }).first(),
    ).toBeVisible()
  })
})
