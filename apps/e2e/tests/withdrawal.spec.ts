import { expect, test } from '@playwright/test'
import { apiContext } from '../helpers/api.js'
import { gotoHydrated } from '../helpers/hydration.js'
import { ShopPage } from '../pages/shop.js'

async function emailsFor(to: string): Promise<string[]> {
  const ctx = await apiContext()
  const response = await ctx.get(`/api/dev/emails?to=${encodeURIComponent(to)}`)
  const data = (await response.json()) as { emails: { template: string }[] }
  await ctx.dispose()
  return data.emails.map((e) => e.template)
}

test.describe('electronic withdrawal function (§ 356a BGB)', () => {
  test('footer button → form → "Widerruf bestätigen" → receipt confirmation by email', async ({
    page,
  }) => {
    const email = `widerruf-${Date.now()}@example.com`
    const shop = new ShopPage(page)
    await gotoHydrated(page, '/')
    await shop.acceptConsent()

    await page.getByTestId('footer-withdraw').click()
    await page.waitForURL(/\/withdraw/)
    await expect(page.getByTestId('withdraw-form')).toBeVisible()

    await page.locator('input[name="name"]').fill('Wanda Widerruf')
    await page.locator('input[name="email"]').fill(email)
    await page.locator('input[name="orderNumber"]').fill('PS-2026-00000001')
    await page.getByTestId('withdraw-next').click()

    await expect(page.getByTestId('withdraw-review')).toContainText('PS-2026-00000001')
    await expect(page.getByTestId('withdraw-confirm')).toHaveText('Widerruf bestätigen')
    await page.getByTestId('withdraw-confirm').click()

    await expect(page.getByTestId('withdraw-success')).toContainText(email)
    expect(await emailsFor(email)).toContain('withdrawal_received')
  })
})
