import { expect, test } from '@playwright/test'
import { AdminPage } from '../pages/admin.js'

test.describe('admin products', () => {
  test('lists products and toggles visibility', async ({ page }) => {
    const admin = new AdminPage(page)
    await admin.login()
    await page.goto('/admin/products')
    await expect(page.getByTestId('admin-products')).toBeVisible()
    await expect(page.getByText('spiral-vase')).toBeVisible()

    // Deactivate + reactivate the wall hook set
    const row = page.locator('tr', { hasText: 'wall-hook-set' })
    await row.getByTestId('toggle-product').click()
    await expect(row.getByText('inaktiv')).toBeVisible()
    await row.getByTestId('toggle-product').click()
    await expect(row.getByText('aktiv', { exact: true })).toBeVisible()
  })

  test('creates a new product', async ({ page }) => {
    const admin = new AdminPage(page)
    await admin.login()
    await page.goto('/admin/products')
    await page.getByTestId('new-product').click()

    const form = page.getByTestId('product-form')
    await form.locator('input').nth(0).fill('E2E Testprodukt')
    await form.locator('input').nth(1).fill('e2e-testprodukt')
    await form.locator('input').nth(2).fill('9,99')
    await form.locator('textarea').fill('Vom Playwright-Test angelegt.')
    await page.getByTestId('save-product').click()

    await expect(page.getByText('e2e-testprodukt')).toBeVisible()
    // appears in the public shop
    await page.goto('/products/e2e-testprodukt')
    await expect(page.getByTestId('product-name')).toHaveText('E2E Testprodukt')
  })

  test('rejects duplicate slugs', async ({ page }) => {
    const admin = new AdminPage(page)
    await admin.login()
    await page.goto('/admin/products')
    await page.getByTestId('new-product').click()
    const form = page.getByTestId('product-form')
    await form.locator('input').nth(0).fill('Duplikat')
    await form.locator('input').nth(1).fill('spiral-vase')
    await form.locator('input').nth(2).fill('1,00')
    await form.locator('textarea').fill('Duplikatstest')
    await page.getByTestId('save-product').click()
    await expect(page.getByTestId('toast')).toContainText('fehlgeschlagen')
  })
})
