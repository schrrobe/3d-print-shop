import { expect, test } from '@playwright/test'
import { gotoHydrated } from '../helpers/hydration.js'
import { ShopPage } from '../pages/shop.js'

test.describe('theme system', () => {
  test('shop follows the operating system theme by default', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' })
    await gotoHydrated(page, '/')
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
    await page.emulateMedia({ colorScheme: 'light' })
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
  })

  test('manual toggle switches to light and persists via localStorage', async ({ page }) => {
    await gotoHydrated(page, '/')
    await new ShopPage(page).acceptConsent()
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
    await new ShopPage(page).acceptConsent()
    await page.locator('[data-theme-option="system"]').first().click()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')

    await page.emulateMedia({ colorScheme: 'dark' })
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  })

  test('surface color changes with the theme', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' })
    await gotoHydrated(page, '/')
    await new ShopPage(page).acceptConsent()
    const darkBg = await page.evaluate(
      () => getComputedStyle(document.documentElement).backgroundColor,
    )
    await page.locator('[data-theme-option="light"]').first().click()
    const lightBg = await page.evaluate(
      () => getComputedStyle(document.documentElement).backgroundColor,
    )
    expect(darkBg).not.toBe(lightBg)
  })
})
