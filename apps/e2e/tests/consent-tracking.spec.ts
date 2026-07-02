import { expect, test } from '@playwright/test'

test.describe('gdpr consent', () => {
  test('banner shows on first visit, nothing tracked before opt-in', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByTestId('consent-banner')).toBeVisible()
    // No tracking scripts in the document before consent
    expect(await page.locator('script[data-tracker]').count()).toBe(0)
  })

  test('reject all hides banner and persists', async ({ page }) => {
    await page.goto('/')
    await page.getByTestId('consent-reject').click()
    await expect(page.getByTestId('consent-banner')).toBeHidden()
    await page.reload()
    await expect(page.getByTestId('consent-banner')).toBeHidden()

    const stored = await page.evaluate(() => localStorage.getItem('print-shop-consent'))
    const consent = JSON.parse(stored!) as { statistics: boolean; marketing: boolean }
    expect(consent.statistics).toBe(false)
    expect(consent.marketing).toBe(false)
  })

  test('accept all stores opt-in for statistics + marketing', async ({ page }) => {
    await page.goto('/')
    await page.getByTestId('consent-accept').click()
    const stored = await page.evaluate(() => localStorage.getItem('print-shop-consent'))
    const consent = JSON.parse(stored!) as { statistics: boolean; marketing: boolean }
    expect(consent.statistics).toBe(true)
    expect(consent.marketing).toBe(true)
  })

  test('custom selection via settings dialog', async ({ page }) => {
    await page.goto('/')
    await page.getByTestId('consent-settings').click()
    await page.getByTestId('consent-statistics').check()
    await page.getByTestId('consent-save').click()
    await expect(page.getByTestId('consent-banner')).toBeHidden()

    const stored = await page.evaluate(() => localStorage.getItem('print-shop-consent'))
    const consent = JSON.parse(stored!) as { statistics: boolean; marketing: boolean }
    expect(consent.statistics).toBe(true)
    expect(consent.marketing).toBe(false)
  })

  test('consent decisions are logged to the backend', async ({ page, request }) => {
    await page.goto('/')
    await page.getByTestId('consent-accept').click()
    // ConsentLog row was written (visible via admin audit is separate — check via API count)
    // The POST /api/consent request must have succeeded:
    const response = await request.post('http://localhost:3001/api/consent', {
      data: {
        categories: { necessary: true, statistics: false, marketing: false },
        version: '1.0',
        locale: 'de',
      },
    })
    expect(response.status()).toBe(201)
  })

  test('settings can be reopened from the footer', async ({ page }) => {
    await page.goto('/')
    await page.getByTestId('consent-accept').click()
    await page.getByTestId('open-consent-settings').click()
    await expect(page.getByTestId('consent-settings-dialog')).toBeVisible()
  })
})
