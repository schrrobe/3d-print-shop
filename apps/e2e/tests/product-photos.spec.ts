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

async function createProductViaApi(
  name: string,
  slug: string,
): Promise<{ id: string; slug: string }> {
  const admin = await adminApiContext()
  try {
    const response = await admin.post('/api/admin/products', {
      data: {
        slug,
        priceCents: 999,
        active: true,
        translations: [{ locale: 'de', name, description: 'Vom Foto-Test angelegt.' }],
        colorSlots: [],
      },
    })
    expect(response.status()).toBe(201)
    const { product } = (await response.json()) as { product: { id: string; slug: string } }
    return product
  } finally {
    await admin.dispose()
  }
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
    await expect(page.getByTestId('photo-alt').locator('input')).toHaveValue(
      'E2E Foto Produkt Bild 1',
    )
    await page.getByTestId('photo-alt').locator('input').fill('Frontansicht vom E2E Foto Produkt')
    await page.getByTestId('save-photo-alt').click()
    await expect(
      page.getByTestId('toast').filter({ hasText: 'Alt-Text gespeichert' }),
    ).toBeVisible()
    await page.reload()
    await expect(page.getByTestId('photo-alt').locator('input')).toHaveValue(
      'Frontansicht vom E2E Foto Produkt',
    )

    await page.getByTestId('photo-upload').locator('input[type="file"]').setInputFiles(photo)
    await expect(page.getByTestId('product-photo')).toHaveCount(2)
    await page.getByTestId('product-photo').nth(1).getByTestId('set-cover-photo').click()
    await expect(
      page.getByTestId('toast').filter({ hasText: 'Bildreihenfolge gespeichert' }),
    ).toBeVisible()
    await expect(page.getByTestId('product-photo').first().locator('img')).toHaveAttribute(
      'alt',
      'E2E Foto Produkt Bild 2',
    )

    // The uploaded file is served publicly as an image.
    const src = await page.getByTestId('product-photo').first().locator('img').getAttribute('src')
    expect(src).toContain('/api/product-images/')
    expect(src).toContain('w=320')
    const served = await page.request.get(src!)
    expect(served.status()).toBe(200)
    expect(served.headers()['content-type']).toContain('image/')

    // Storefront: photo gallery on top (inside product-detail), NO 3D model above it.
    await gotoHydrated(page, '/products/e2e-foto-produkt')
    const detail = page.getByTestId('product-detail')
    await expect(detail.getByTestId('product-gallery')).toBeVisible()
    await expect(detail.getByTestId('product-gallery-main')).toBeVisible()
    await expect(detail.getByTestId('product-gallery-main')).toHaveAttribute(
      'alt',
      'E2E Foto Produkt Bild 2',
    )
    expect(await detail.getByTestId('product-gallery-main').getAttribute('src')).toContain('w=960')
    expect(await detail.getByTestId('product-gallery-main').getAttribute('srcset')).toContain(
      '1200w',
    )
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
    await expect(page.getByTestId('purchase-panel')).toBeVisible()
    await expect(page.getByTestId('purchase-configuration-summary')).toBeVisible()
    await expect(page.getByTestId('configurator')).toBeVisible()
    await expect(page.getByTestId('configurator').getByTestId('color-picker')).toBeVisible()

    await page
      .getByTestId('configurator-accordion')
      .getByRole('button', { name: /Konfigurator/ })
      .click()
    await expect(page.getByTestId('configurator').getByTestId('color-picker')).toBeHidden()
    await page.evaluate(() => window.scrollTo(0, 0))
    const scrollBeforePreviewClick = await page.evaluate(() => window.scrollY)
    await page
      .getByTestId('purchase-configuration-summary')
      .getByTestId('configuration-preview')
      .click()
    await expect(page.getByTestId('configurator').getByTestId('color-picker')).toBeVisible()
    await expect
      .poll(() => page.evaluate(() => window.scrollY))
      .toBeGreaterThan(scrollBeforePreviewClick)
  })

  test('deleting a product removes uploaded photo files', async () => {
    const admin = await adminApiContext()
    const product = await createProductViaApi('E2E Foto Cleanup', `e2e-foto-cleanup-${Date.now()}`)
    let imageUrl: string | null = null
    try {
      const file = {
        name: 'cleanup.png',
        mimeType: 'image/png',
        buffer: Buffer.from(PNG_BASE64, 'base64'),
      }
      const uploaded = await admin.post(`/api/admin/products/${product.id}/images`, {
        multipart: { files: file },
      })
      expect(uploaded.status()).toBe(201)
      const { assets } = (await uploaded.json()) as { assets: { url: string }[] }
      const asset = assets[0]
      if (!asset) throw new Error('No uploaded product image returned')
      imageUrl = asset.url
      expect((await admin.get(imageUrl)).status()).toBe(200)

      const deleted = await admin.delete(`/api/admin/products/${product.id}`)
      expect(deleted.status()).toBe(200)
      expect((await admin.get(imageUrl)).status()).toBe(404)
    } finally {
      await admin.delete(`/api/admin/products/${product.id}`).catch(() => undefined)
      await admin.dispose()
    }
  })

  test('server rejects more than four photos', async () => {
    const admin = await adminApiContext()
    const anon = await apiContext()
    const { product } = (await (await anon.get('/api/products/spiral-vase')).json()) as {
      product: { id: string; assets: { id: string; type: string }[] }
    }
    await anon.dispose()
    const seededImages = product.assets.filter((a) => a.type === 'image').length

    const file = {
      name: 'extra.png',
      mimeType: 'image/png',
      buffer: Buffer.from(PNG_BASE64, 'base64'),
    }
    const added: string[] = []
    try {
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
      const afterReject = (await (await admin.get(`/api/admin/products/${product.id}`)).json()) as {
        product: { assets: { type: string }[] }
      }
      expect(afterReject.product.assets.filter((a) => a.type === 'image')).toHaveLength(4)
    } finally {
      // Restore the seeded photo count so later tests see a stable fixture.
      for (const id of added) {
        await admin.delete(`/api/admin/products/${product.id}/assets/${id}`).catch(() => undefined)
      }
      await admin.dispose()
    }
  })
})
