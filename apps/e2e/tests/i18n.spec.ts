import { expect, test } from '@playwright/test'

test.describe('i18n (de, en, pl, fr, nl, cs)', () => {
  test('german is the default without url prefix', async ({ page }) => {
    await page.goto('/products')
    await expect(page.getByRole('heading', { level: 2, name: 'Produkte' })).toBeVisible()
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
      await page.goto(`/${locale}/products`)
      await expect(page.getByRole('heading', { level: 2, name: heading })).toBeVisible()
    }
  })

  test('language switcher navigates to the locale-prefixed route', async ({ page }) => {
    await page.goto('/products')
    await page.getByTestId('language-switcher').click()
    await page.locator('[data-locale="en"]').click()
    await page.waitForURL(/\/en\/products/)
    await expect(page.getByRole('heading', { level: 2, name: 'Products' })).toBeVisible()
  })

  test('product translations follow the locale', async ({ page }) => {
    await page.goto('/products/spiral-vase')
    await expect(page.getByTestId('product-name')).toHaveText('Spiralvase')
    await page.goto('/en/products/spiral-vase')
    await expect(page.getByTestId('product-name')).toHaveText('Spiral Vase')
  })

  test('html lang attribute matches the locale', async ({ page }) => {
    await page.goto('/en')
    await expect(page.locator('html')).toHaveAttribute('lang', 'en')
    await page.goto('/fr')
    await expect(page.locator('html')).toHaveAttribute('lang', 'fr')
  })
})
