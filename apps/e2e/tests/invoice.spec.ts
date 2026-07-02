import { expect, test } from '@playwright/test'
import { adminApiContext } from '../helpers/api.js'
import { AdminPage } from '../pages/admin.js'
import { ShopPage } from '../pages/shop.js'
import { gotoHydrated } from '../helpers/hydration.js'

test.describe('invoices', () => {
  test('paid order generates a sequential invoice, downloadable as pdf', async ({ page }) => {
    // Pay an order via mock stripe
    const shop = new ShopPage(page)
    await shop.addProductToCart('spiral-vase')
    await gotoHydrated(page, '/checkout')
    await shop.fillCheckoutAddress('invoice-e2e@example.com')
    await page.getByTestId('payment-stripe').click()
    await page.getByTestId('submit-order').click()
    await page.waitForURL(/\/checkout\/success/)
    await page.getByTestId('simulate-payment').click()

    // Invoice appears in admin with RE-<year>-<seq> number
    const admin = new AdminPage(page)
    await admin.login()
    await gotoHydrated(page, '/admin/invoices')
    await expect(page.getByTestId('admin-invoices')).toBeVisible()
    const firstNumber = page.locator('tbody tr').first().locator('td').first()
    await expect(firstNumber).toContainText(/RE-\d{4}-\d{5}/)

    // PDF download works
    const ctx = await adminApiContext()
    const invoices = (await (await ctx.get('/api/admin/invoices')).json()) as {
      invoices: { id: string; number: string }[]
    }
    expect(invoices.invoices.length).toBeGreaterThan(0)
    const pdf = await ctx.get(`/api/admin/invoices/${invoices.invoices[0]!.id}/pdf`)
    expect(pdf.ok()).toBe(true)
    expect((await pdf.body()).subarray(0, 4).toString()).toBe('%PDF')
    await ctx.dispose()
  })

  test('invoice numbers are strictly sequential', async () => {
    const ctx = await adminApiContext()
    const invoices = (await (await ctx.get('/api/admin/invoices')).json()) as {
      invoices: { year: number; sequence: number }[]
    }
    const sequences = invoices.invoices
      .filter((i) => i.year === new Date().getFullYear())
      .map((i) => i.sequence)
      .sort((a, b) => a - b)
    for (let i = 1; i < sequences.length; i++) {
      expect(sequences[i]).toBe(sequences[i - 1]! + 1)
    }
    await ctx.dispose()
  })
})
