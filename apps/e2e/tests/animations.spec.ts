import { expect, test } from '@playwright/test'

test.describe('animations', () => {
  test('landing page renders hero headline and marquee', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByTestId('hero')).toBeVisible()
    await expect(page.getByTestId('animated-headline')).toBeVisible()
    // Marquee duplicates its content for the infinite loop
    await expect(page.locator('text=Bambu Lab X1C').first()).toBeVisible()
  })

  test('stat counters end at their target values', async ({ page }) => {
    await page.goto('/')
    const counter = page.getByTestId('stat-counter').first()
    await counter.scrollIntoViewIfNeeded()
    // GSAP counts up to 12500 (locale-formatted)
    await expect(counter).toContainText(/12[.,]?500/, { timeout: 10_000 })
  })

  test('prefers-reduced-motion: content is fully visible without animation', async ({ browser }) => {
    const context = await browser.newContext({ reducedMotion: 'reduce' })
    const page = await context.newPage()
    await page.goto('/')
    // Headline words render immediately (no opacity-0 leftovers)
    await expect(page.getByTestId('animated-headline')).toBeVisible()
    const counter = page.getByTestId('stat-counter').first()
    await counter.scrollIntoViewIfNeeded()
    await expect(counter).toContainText(/12[.,]?500/)
    await context.close()
  })

  test('checkout stays animation-free', async ({ page }) => {
    await page.goto('/checkout')
    // No GSAP scroll-triggered elements on the checkout route
    expect(await page.locator('[data-animate]').count()).toBe(0)
  })
})
