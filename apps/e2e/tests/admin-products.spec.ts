import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { expect, test, type Page } from '@playwright/test'
import { AdminPage } from '../pages/admin.js'
import { gotoHydrated } from '../helpers/hydration.js'

const fixtures = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'fixtures')

/** Creates a product via the list dialog and opens its detail page. */
async function createAndOpenProduct(page: Page, name: string, slug: string): Promise<void> {
  await gotoHydrated(page, '/admin/products')
  await page.getByTestId('new-product').click()
  const form = page.getByTestId('product-form')
  await form.locator('input').nth(0).fill(name)
  await form.locator('input').nth(1).fill(slug)
  await form.locator('input').nth(2).fill('9,99')
  await form.locator('textarea').fill('Vom Playwright-Test angelegt.')
  await page.getByTestId('save-product').click()
  const row = page.locator('tr', { hasText: slug })
  await row.getByTestId('open-product').click()
  await expect(page.getByTestId('admin-product-detail')).toBeVisible()
}

test.describe('admin products', () => {
  test('lists products and toggles visibility', async ({ page }) => {
    const admin = new AdminPage(page)
    await admin.login()
    await gotoHydrated(page, '/admin/products')
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
    await gotoHydrated(page, '/admin/products')
    await page.getByTestId('new-product').click()

    const form = page.getByTestId('product-form')
    await form.locator('input').nth(0).fill('E2E Testprodukt')
    await form.locator('input').nth(1).fill('e2e-testprodukt')
    await form.locator('input').nth(2).fill('9,99')
    await form.locator('textarea').fill('Vom Playwright-Test angelegt.')
    await page.getByTestId('save-product').click()

    await expect(page.getByText('e2e-testprodukt')).toBeVisible()
    // appears in the public shop
    await gotoHydrated(page, '/products/e2e-testprodukt')
    await expect(page.getByTestId('product-name')).toHaveText('E2E Testprodukt')
  })

  test('rejects duplicate slugs', async ({ page }) => {
    const admin = new AdminPage(page)
    await admin.login()
    await gotoHydrated(page, '/admin/products')
    await page.getByTestId('new-product').click()
    const form = page.getByTestId('product-form')
    await form.locator('input').nth(0).fill('Duplikat')
    await form.locator('input').nth(1).fill('spiral-vase')
    await form.locator('input').nth(2).fill('1,00')
    await form.locator('textarea').fill('Duplikatstest')
    await page.getByTestId('save-product').click()
    await expect(page.getByTestId('toast')).toContainText('fehlgeschlagen')
  })

  test('edits price and english translation on the detail page', async ({ page }) => {
    const admin = new AdminPage(page)
    await admin.login()
    await createAndOpenProduct(page, 'E2E Edit Produkt', 'e2e-edit-produkt')

    await page.locator('input[name="priceEuros"]').fill('12,50')
    await page.getByRole('tab', { name: /^EN/ }).click()
    await page.locator('input[name="name-en"]').fill('E2E Edited EN')
    await page.getByTestId('save-product-detail').click()
    await expect(page.getByTestId('toast').filter({ hasText: 'Gespeichert' })).toBeVisible()

    // persisted after reload
    await page.reload()
    await expect(page.getByTestId('admin-product-detail')).toBeVisible()
    await expect(page.locator('input[name="priceEuros"]')).toHaveValue('12,50')
    await page.getByRole('tab', { name: /^EN/ }).click()
    await expect(page.locator('input[name="name-en"]')).toHaveValue('E2E Edited EN')

    // public shop shows the english translation on the en route and the new price
    await gotoHydrated(page, '/en/products/e2e-edit-produkt')
    await expect(page.getByTestId('product-name')).toHaveText('E2E Edited EN')
    await expect(page.getByTestId('product-detail')).toContainText('12,50')
  })

  test('configures a second color zone that shows up in the public configurator', async ({ page }) => {
    const admin = new AdminPage(page)
    await admin.login()
    await createAndOpenProduct(page, 'E2E Zonen Produkt', 'e2e-zonen-produkt')

    await page.getByTestId('slot-enable-zone_2_accent').check()
    await expect(page.locator('input[name="slot-label-zone_2_accent"]')).toHaveValue('Akzentfarbe')
    await page.locator('input[name="slot-label-zone_2_accent"]').fill('Akzent')
    await page.getByTestId('save-product-detail').click()
    await expect(page.getByTestId('toast').filter({ hasText: 'Gespeichert' })).toBeVisible()

    await gotoHydrated(page, '/products/e2e-zonen-produkt')
    const picker = page.getByTestId('color-picker')
    await expect(picker.locator('[data-zone="zone_1_main"]')).toBeVisible()
    await expect(picker.locator('[data-zone="zone_2_accent"]')).toBeVisible()
    await expect(picker).toContainText('Akzent')
  })

  test('uploads a glb model that is served by the api', async ({ page }) => {
    const admin = new AdminPage(page)
    await admin.login()
    await createAndOpenProduct(page, 'E2E GLB Produkt', 'e2e-glb-produkt')

    await expect(page.getByTestId('model-asset-missing')).toBeVisible()
    await page
      .getByTestId('model-upload')
      .locator('input[type="file"]')
      .setInputFiles(path.join(fixtures, 'test-model.glb'))
    await expect(page.getByTestId('toast').filter({ hasText: '3D-Modell hochgeladen' })).toBeVisible()
    await expect(page.getByTestId('model-asset-url')).toContainText('/api/models/')

    const url = (await page.getByTestId('model-asset-url').locator('code').textContent()) ?? ''
    const response = await page.request.get(url)
    expect(response.status()).toBe(200)
    expect(response.headers()['content-type']).toContain('model/gltf-binary')
  })

  test('deletes a product after confirmation', async ({ page }) => {
    const admin = new AdminPage(page)
    await admin.login()
    await createAndOpenProduct(page, 'E2E Lösch Produkt', 'e2e-loesch-produkt')

    await page.getByTestId('delete-product').click()
    await page.getByTestId('confirm-delete-product').click()
    await page.waitForURL(/\/admin\/products$/)
    await expect(page.getByTestId('admin-products')).toBeVisible()
    await expect(page.getByText('e2e-loesch-produkt')).toBeHidden()
  })
})
