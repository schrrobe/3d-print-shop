import { expect, test } from '@playwright/test'
import { gotoHydrated } from '../helpers/hydration.js'

test.describe('i18n (de, en, pl, fr, nl, cs)', () => {
  test('german is the default without url prefix', async ({ page }) => {
    await gotoHydrated(page, '/products')
    await expect(page.getByRole('heading', { level: 1, name: 'Produkte' })).toBeVisible()
  })

  test('all five other locales render translated content', async ({ page }) => {
    const expectations: Record<string, string> = {
      en: 'Products',
      pl: 'Produkty',
      fr: 'Produits',
      nl: 'Producten',
      cs: 'Produkty',
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
    await expect(page.getByRole('heading', { level: 1, name: 'Products' })).toBeVisible()
  })

  test('product translations follow the locale', async ({ page }) => {
    await gotoHydrated(page, '/products/spiral-vase')
    await expect(page.getByTestId('product-name')).toHaveText('Spiralvase')
    await gotoHydrated(page, '/en/products/spiral-vase')
    await expect(page.getByTestId('product-name')).toHaveText('Spiral Vase')
  })

  test('html lang attribute matches the locale', async ({ page }) => {
    await gotoHydrated(page, '/en')
    await expect(page.locator('html')).toHaveAttribute('lang', 'en')
    await gotoHydrated(page, '/fr')
    await expect(page.locator('html')).toHaveAttribute('lang', 'fr')
  })
})
