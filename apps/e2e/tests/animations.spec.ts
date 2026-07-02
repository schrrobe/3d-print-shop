import { expect, test } from '@playwright/test'
import { gotoHydrated } from '../helpers/hydration.js'

test.describe('animations', () => {
  test('landing page renders hero headline and marquee', async ({ page }) => {
    await gotoHydrated(page, '/')
    await expect(page.getByTestId('hero')).toBeVisible()
    await expect(page.getByTestId('animated-headline')).toBeVisible()
    // Marquee duplicates its content for the infinite loop
    await expect(page.locator('text=Bambu Lab X1C').first()).toBeVisible()
  })

  test('stat counters end at their target values', async ({ page }) => {
    await gotoHydrated(page, '/')
    const counter = page.getByTestId('stat-counter').first()
    await counter.scrollIntoViewIfNeeded()
    // GSAP counts up to 12500 (locale-formatted)
    await expect(counter).toContainText(/12[.,]?500/, { timeout: 10_000 })
  })

  test('prefers-reduced-motion: content is fully visible without animation', async ({ browser }) => {
    const context = await browser.newContext({ reducedMotion: 'reduce' })
    const page = await context.newPage()
    await gotoHydrated(page, '/')
    // Headline words render immediately (no opacity-0 leftovers)
    await expect(page.getByTestId('animated-headline')).toBeVisible()
    const counter = page.getByTestId('stat-counter').first()
    await counter.scrollIntoViewIfNeeded()
    await expect(counter).toContainText(/12[.,]?500/)
    await context.close()
  })

  test('checkout stays animation-free', async ({ page }) => {
    await gotoHydrated(page, '/checkout')
    // No GSAP scroll-triggered elements on the checkout route
    expect(await page.locator('[data-animate]').count()).toBe(0)
  })
})
