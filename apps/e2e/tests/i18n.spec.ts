import { expect, test } from '@playwright/test'
import { gotoHydrated } from '../helpers/hydration.js'

test.describe('i18n (de, en, pl, fr, nl, cs)', () => {
  test('german is the default without url prefix', async ({ page }) => {
    await gotoHydrated(page, '/products')
    await expect(page.getByRole('heading', { level: 1, name: 'Patronenboxen' })).toBeVisible()
  })

  test('all five other locales render translated content', async ({ page }) => {
    const expectations: Record<string, string> = {
      en: 'Cartridge boxes',
      pl: 'Pudełka na naboje',
      fr: 'Boîtes à cartouches',
      nl: 'Patroonboxen',
      cs: 'Krabičky na náboje',
    }
    for (const [locale, heading] of Object.entries(expectations)) {
      await gotoHydrated(page, `/${locale}/products`)
      await expect(page.getByRole('heading', { level: 1, name: heading })).toBeVisible()
    }
  })

  test('language switcher navigates to the locale-prefixed route', async ({ page }) => {
    await gotoHydrated(page, '/products')
    await page.getByTestId('language-switcher').click()
    await page.locator('[data-locale="en"]').click()
    await page.waitForURL(/\/en\/products/)
    await expect(page.getByRole('heading', { level: 1, name: 'Cartridge boxes' })).toBeVisible()
  })

  test('product translations follow the locale', async ({ page }) => {
    await gotoHydrated(page, '/products/patronenbox-9mm-luger-50')
    await expect(page.getByTestId('product-name')).toHaveText('Patronenbox 9 mm Luger – 50 Schuss')
    await gotoHydrated(page, '/en/products/patronenbox-9mm-luger-50')
    await expect(page.getByTestId('product-name')).toHaveText(
      'Cartridge box 9 mm Luger – 50 rounds',
    )
  })

  test('html lang attribute matches the locale', async ({ page }) => {
    await gotoHydrated(page, '/en')
    await expect(page.locator('html')).toHaveAttribute('lang', 'en')
    await gotoHydrated(page, '/fr')
    await expect(page.locator('html')).toHaveAttribute('lang', 'fr')
  })
})
