import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { expect, test, type Page } from '@playwright/test'
import { AdminPage } from '../pages/admin.js'
import { gotoHydrated } from '../helpers/hydration.js'

const fixtures = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'fixtures')
const photo = path.join(fixtures, 'test-photo.png')

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

test.describe('product photos', () => {
  test('admin uploads photos that are served by the api and shown in the public gallery', async ({
    page,
  }) => {
    const admin = new AdminPage(page)
    await admin.login()
    await createAndOpenProduct(page, 'E2E Foto Produkt', 'e2e-foto-produkt')

    await expect(page.getByTestId('product-images-empty')).toBeVisible()
    await page
      .getByTestId('image-upload')
      .locator('input[type="file"]')
      .setInputFiles([photo, photo])
    await expect(page.getByTestId('toast').filter({ hasText: 'Fotos hochgeladen' })).toBeVisible()
    await expect(page.getByTestId('product-image')).toHaveCount(2)

    // uploaded file is publicly served
    const src = await page.getByTestId('product-image').first().locator('img').getAttribute('src')
    expect(src).toContain('/api/product-images/')
    const response = await page.request.get(src ?? '')
    expect(response.status()).toBe(200)
    expect(response.headers()['content-type']).toContain('image/png')

    // public detail page: gallery hero with thumbnails, no 3D viewer in the hero
    await gotoHydrated(page, '/products/e2e-foto-produkt')
    const gallery = page.getByTestId('product-gallery')
    await expect(gallery.getByTestId('gallery-main-image')).toBeVisible()
    await expect(gallery.getByTestId('gallery-thumb')).toHaveCount(2)
    await expect(page.getByTestId('gallery-placeholder')).toBeHidden()
    // the configurator (3D viewer + add to cart) lives in its own section below
    const configurator = page.getByTestId('product-configurator')
    await expect(configurator.getByTestId('model-viewer')).toBeVisible()
    await expect(configurator.getByTestId('add-to-cart')).toBeVisible()

    // catalog card shows the photo instead of the placeholder
    await gotoHydrated(page, '/products')
    const card = page.getByTestId('product-e2e-foto-produkt')
    await expect(card.locator('img')).toHaveAttribute('src', /\/api\/product-images\//)
  })

  test('enforces the maximum of four photos and supports deletion', async ({ page }) => {
    const admin = new AdminPage(page)
    await admin.login()
    await createAndOpenProduct(page, 'E2E Foto Limit', 'e2e-foto-limit')

    await page
      .getByTestId('image-upload')
      .locator('input[type="file"]')
      .setInputFiles([photo, photo, photo, photo])
    await expect(page.getByTestId('toast').filter({ hasText: 'Fotos hochgeladen' })).toBeVisible()
    await expect(page.getByTestId('product-image')).toHaveCount(4)

    // dropzone is replaced by the maxed-out hint
    await expect(page.getByTestId('image-upload-maxed')).toBeVisible()
    await expect(page.getByTestId('image-upload').locator('input[type="file"]')).toHaveCount(0)

    // deleting a photo frees a slot and removes the served file
    const src = await page.getByTestId('product-image').first().locator('img').getAttribute('src')
    await page.getByTestId('delete-product-image').first().click()
    await expect(page.getByTestId('toast').filter({ hasText: 'Foto gelöscht' })).toBeVisible()
    await expect(page.getByTestId('product-image')).toHaveCount(3)
    await expect(page.getByTestId('image-upload').locator('input[type="file"]')).toHaveCount(1)
    const response = await page.request.get(src ?? '')
    expect(response.status()).toBe(404)
  })

  test('product without photos shows the placeholder, never the 3D viewer, in the hero', async ({
    page,
  }) => {
    const admin = new AdminPage(page)
    await admin.login()
    await createAndOpenProduct(page, 'E2E Ohne Foto', 'e2e-ohne-foto')

    await gotoHydrated(page, '/products/e2e-ohne-foto')
    const gallery = page.getByTestId('product-gallery')
    await expect(gallery.getByTestId('gallery-placeholder')).toBeVisible()
    await expect(gallery.getByTestId('model-viewer')).toHaveCount(0)
    await expect(page.getByTestId('product-configurator').getByTestId('model-viewer')).toBeVisible()
  })

  test('image serving rejects unknown files and path traversal', async ({ page }) => {
    const missing = await page.request.get('/api/product-images/does-not-exist.png')
    expect(missing.status()).toBe(404)
    const traversal = await page.request.get('/api/product-images/..%2Fmodels%2Ftest.glb')
    expect(traversal.status()).toBe(404)
  })
})
