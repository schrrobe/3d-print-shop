import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { expect, test } from '@playwright/test'
import { gotoHydrated } from '../helpers/hydration.js'
import { ShopPage } from '../pages/shop.js'

const fixtures = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../fixtures')

test.describe('upload request (3mf/stl, max 50 MB)', () => {
  test('customer can submit a model upload request', async ({ page }) => {
    await gotoHydrated(page, '/upload')
    await new ShopPage(page).acceptConsent()
    await expect(page.getByTestId('stepper')).toBeVisible()

    await page
      .getByTestId('upload-dropzone')
      .locator('input[type="file"]')
      .setInputFiles(path.join(fixtures, 'model.stl'))
    await expect(page.getByTestId('upload-file-list')).toContainText('model.stl')

    await page.locator('input[name="name"]').fill('Paula Playwright')
    await page.locator('input[name="email"]').fill('paula-e2e@example.com')
    await page
      .locator('textarea[name="description"]')
      .fill('Bitte einmal in PETG drucken, Schichthöhe 0,2 mm.')
    await page.getByTestId('upload-terms').check()
    await page.getByTestId('upload-submit').click()
    await expect(page.getByTestId('upload-success')).toBeVisible()
  })

  test('rejects disallowed file types client-side', async ({ page }) => {
    await gotoHydrated(page, '/upload')
    await new ShopPage(page).acceptConsent()
    await page
      .getByTestId('upload-dropzone')
      .locator('input[type="file"]')
      .setInputFiles(path.join(fixtures, 'invalid.txt'))
    await expect(page.getByTestId('upload-file-list')).toBeHidden()
    await expect(page.getByTestId('toast')).toBeVisible()
  })

  test('api rejects disallowed file types', async ({ request }) => {
    const response = await request.post('http://localhost:3001/api/upload-requests', {
      multipart: {
        files: {
          name: 'evil.exe',
          mimeType: 'application/x-msdownload',
          buffer: Buffer.from('MZ'),
        },
        name: 'X',
        email: 'x@example.com',
        description: 'should never be accepted!',
      },
    })
    expect(response.status()).toBe(400)
  })

  test('form requires a file before submitting', async ({ page }) => {
    await gotoHydrated(page, '/upload')
    await new ShopPage(page).acceptConsent()
    await page.locator('input[name="name"]').fill('Ohne Datei')
    await page.locator('input[name="email"]').fill('nofile@example.com')
    await page.locator('textarea[name="description"]').fill('Anfrage ohne Datei gesendet.')
    await page.getByTestId('upload-submit').click()
    await expect(page.getByTestId('upload-error')).toBeVisible()
  })

  test('requires accepting the upload terms', async ({ page }) => {
    await gotoHydrated(page, '/upload')
    await new ShopPage(page).acceptConsent()
    await expect(page.getByTestId('upload-terms')).not.toBeChecked()
    await expect(page.getByTestId('upload-terms')).toHaveAttribute('required')
  })
})
