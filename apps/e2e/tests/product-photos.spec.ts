import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { expect, test, type Page } from '@playwright/test'
import { AdminPage } from '../pages/admin.js'
import { adminApiContext, apiContext } from '../helpers/api.js'
import { gotoHydrated } from '../helpers/hydration.js'

const fixtures = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'fixtures')
const photo = path.join(fixtures, 'product-photo.png')

// 1×1 PNG, matches the on-disk fixture — used for direct API uploads.
const PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='

async function createProduct(page: Page, name: string, slug: string): Promise<void> {
  await gotoHydrated(page, '/admin/products')
  await page.getByTestId('new-product').click()
  const form = page.getByTestId('product-form')
  await form.locator('input').nth(0).fill(name)
  await form.locator('input').nth(1).fill(slug)
  await form.locator('input').nth(2).fill('9,99')
  await form.locator('textarea').fill('Vom Foto-Test angelegt.')
  await page.getByTestId('save-product').click()
  const row = page.locator('tr', { hasText: slug })
  await row.getByTestId('open-product').click()
  await expect(page.getByTestId('admin-product-detail')).toBeVisible()
}

test.describe('product photos', () => {
  test('admin uploads a photo — shown in the gallery, served publicly, model moved below', async ({
    page,
  }) => {
    const admin = new AdminPage(page)
    await admin.login()
    await createProduct(page, 'E2E Foto Produkt', 'e2e-foto-produkt')

    await expect(page.getByTestId('product-photos-empty')).toBeVisible()
    await page.getByTestId('photo-upload').locator('input[type="file"]').setInputFiles(photo)
    await expect(page.getByTestId('toast').filter({ hasText: 'hochgeladen' })).toBeVisible()
    await expect(page.getByTestId('product-photo')).toHaveCount(1)

    // The uploaded file is served publicly as an image.
    const src = await page.getByTestId('product-photo').first().locator('img').getAttribute('src')
    expect(src).toContain('/api/product-images/')
    const served = await page.request.get(src!)
    expect(served.status()).toBe(200)
    expect(served.headers()['content-type']).toContain('image/')

    // Storefront: photo gallery on top (inside product-detail), NO 3D model above it.
    await gotoHydrated(page, '/products/e2e-foto-produkt')
    const detail = page.getByTestId('product-detail')
    await expect(detail.getByTestId('product-gallery')).toBeVisible()
    await expect(detail.getByTestId('product-gallery-main')).toBeVisible()
    await expect(detail.getByTestId('model-viewer')).toHaveCount(0)
    // The configurator (3D model + colours) lives in its own section below.
    await expect(page.getByTestId('configurator').getByTestId('model-viewer')).toBeVisible()
  })

  test('admin can delete a product photo', async ({ page }) => {
    const admin = new AdminPage(page)
    await admin.login()
    await createProduct(page, 'E2E Foto Del', 'e2e-foto-del')

    await page.getByTestId('photo-upload').locator('input[type="file"]').setInputFiles(photo)
    await expect(page.getByTestId('product-photo')).toHaveCount(1)
    await page.getByTestId('delete-photo').first().click()
    await expect(page.getByTestId('product-photos-empty')).toBeVisible()
    await expect(page.getByTestId('product-photo')).toHaveCount(0)
  })

  test('seeded product shows a multi-photo gallery with the configurator below it', async ({
    page,
  }) => {
    await gotoHydrated(page, '/products/spiral-vase')
    const detail = page.getByTestId('product-detail')
    await expect(detail.getByTestId('product-gallery')).toBeVisible()
    await expect(page.getByTestId('product-gallery-thumb').first()).toBeVisible()
    expect(await page.getByTestId('product-gallery-thumb').count()).toBeGreaterThan(1)

    // Configurator moved one section down and still holds the colour picker.
    await expect(page.getByTestId('configurator')).toBeVisible()
    await expect(page.getByTestId('configurator').getByTestId('color-picker')).toBeVisible()
  })

  test('server rejects more than four photos', async () => {
    const admin = await adminApiContext()
    const anon = await apiContext()
    const { product } = (await (await anon.get('/api/products/spiral-vase')).json()) as {
      product: { id: string; assets: { id: string; type: string }[] }
    }
    await anon.dispose()
    const seededImages = product.assets.filter((a) => a.type === 'image').length

    const file = { name: 'extra.png', mimeType: 'image/png', buffer: Buffer.from(PNG_BASE64, 'base64') }
    const added: string[] = []
    // Fill up to the cap of four (single file per request keeps multipart simple).
    while (seededImages + added.length < 4) {
      const ok = await admin.post(`/api/admin/products/${product.id}/images`, {
        multipart: { files: file },
      })
      expect(ok.status()).toBe(201)
      const { assets } = (await ok.json()) as { assets: { id: string }[] }
      added.push(...assets.map((a) => a.id))
    }
    // The fifth photo is rejected.
    const tooMany = await admin.post(`/api/admin/products/${product.id}/images`, {
      multipart: { files: file },
    })
    expect(tooMany.status()).toBe(400)

    // Restore the seeded photo count so later tests see a stable fixture.
    for (const id of added) {
      await admin.delete(`/api/admin/products/${product.id}/assets/${id}`)
    }
    await admin.dispose()
  })
})
