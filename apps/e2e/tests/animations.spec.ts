import { expect, test } from '@playwright/test'
import { gotoHydrated } from '../helpers/hydration.js'

test.describe('animations', () => {
  test('landing page renders the caliber target hero', async ({ page }) => {
    await gotoHydrated(page, '/')
    await expect(page.getByTestId('hero')).toBeVisible()
    await expect(page.getByTestId('animated-headline')).toBeVisible()
    await expect(page.getByTestId('caliber-picker')).toBeVisible()
  })

  test('choosing a caliber retargets the hero call to action', async ({ page }) => {
    await gotoHydrated(page, '/')
    await page.locator('[data-caliber="308-win"]').click()
    const cta = page.getByTestId('hero-cta-products')
    await expect(cta).toContainText('.308 Win')
    await cta.click()
    await page.waitForURL(/\/products\?caliber=308-win/)
    await expect(page.getByTestId('product-patronenbox-308-win-50')).toBeVisible()
    await expect(page.getByTestId('product-patronenbox-9mm-luger-50')).toBeHidden()
  })

  test('prefers-reduced-motion: content is fully visible without animation', async ({
    browser,
  }) => {
    const context = await browser.newContext({ reducedMotion: 'reduce' })
    const page = await context.newPage()
    await gotoHydrated(page, '/')
    await expect(page.getByTestId('animated-headline')).toBeVisible()
    await expect(page.getByTestId('hero-cta-products')).toBeVisible()
    await context.close()
  })

  test('checkout stays animation-free', async ({ page }) => {
    await gotoHydrated(page, '/checkout')
    // No GSAP scroll-triggered elements on checkout route
    expect(await page.locator('[data-animate]').count()).toBe(0)
  })
})
