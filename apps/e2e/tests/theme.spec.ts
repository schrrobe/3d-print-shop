import { expect, test } from '@playwright/test'
import { gotoHydrated } from '../helpers/hydration.js'

test.describe('theme system', () => {
  test('dark is the default brand theme', async ({ page }) => {
    await gotoHydrated(page, '/')
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  })

  test('manual toggle switches to light and persists via localStorage', async ({ page }) => {
    await gotoHydrated(page, '/')
    await page.locator('[data-theme-option="light"]').first().click()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')

    const stored = await page.evaluate(() => localStorage.getItem('print-shop-color-mode'))
    expect(stored).toBe('light')

    await page.reload()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
  })

  test('system preference is respected when selected', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' })
    await gotoHydrated(page, '/')
    await page.locator('[data-theme-option="system"]').first().click()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')

    await page.emulateMedia({ colorScheme: 'dark' })
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  })

  test('surface color changes with the theme', async ({ page }) => {
    await gotoHydrated(page, '/')
    const darkBg = await page.evaluate(() => getComputedStyle(document.documentElement).backgroundColor)
    await page.locator('[data-theme-option="light"]').first().click()
    const lightBg = await page.evaluate(() => getComputedStyle(document.documentElement).backgroundColor)
    expect(darkBg).not.toBe(lightBg)
  })
})
