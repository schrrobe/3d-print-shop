import { expect, test } from '@playwright/test'
import { AdminPage } from '../pages/admin.js'

test.describe('admin colors', () => {
  test('lists global colors incl. inactive ones', async ({ page }) => {
    const admin = new AdminPage(page)
    await admin.login()
    await page.goto('/admin/colors')
    await expect(page.getByTestId('admin-colors')).toBeVisible()
    await expect(page.getByText('Brand Green')).toBeVisible()
    await expect(page.getByText('Neon Orange (ausverkauft)')).toBeVisible()
  })

  test('creates a color and it appears in the public configurator', async ({ page }) => {
    const admin = new AdminPage(page)
    await admin.login()
    await page.goto('/admin/colors')
    await page.getByTestId('new-color').click()
    const form = page.getByTestId('color-form')
    await form.locator('input').nth(0).fill('E2E Magenta')
    await form.locator('input').nth(1).fill('#d02090')
    await form.locator('input').nth(2).fill('PLA')
    await form.locator('input').nth(3).fill('E2E Filaments')
    await page.getByTestId('save-color').click()
    await expect(page.getByText('E2E Magenta')).toBeVisible()

    // public API exposes the new active color
    const response = await page.request.get('http://localhost:3001/api/colors')
    const data = (await response.json()) as { colors: { name: string }[] }
    expect(data.colors.some((c) => c.name === 'E2E Magenta')).toBe(true)
  })

  test('deactivating a color hides it from the shop', async ({ page }) => {
    const admin = new AdminPage(page)
    await admin.login()
    await page.goto('/admin/colors')
    const row = page.locator('tr', { hasText: 'Sun Yellow' })
    await row.getByTestId('toggle-color').click()
    await expect(row.getByText('inaktiv')).toBeVisible()

    const response = await page.request.get('http://localhost:3001/api/colors')
    const data = (await response.json()) as { colors: { name: string }[] }
    expect(data.colors.some((c) => c.name === 'Sun Yellow')).toBe(false)

    // restore for other tests
    await row.getByTestId('toggle-color').click()
  })

  test('rejects invalid hex values', async ({ page }) => {
    const admin = new AdminPage(page)
    await admin.login()
    await page.goto('/admin/colors')
    await page.getByTestId('new-color').click()
    const form = page.getByTestId('color-form')
    await form.locator('input').nth(0).fill('Kaputt')
    await form.locator('input').nth(1).fill('nicht-hex')
    await form.locator('input').nth(2).fill('PLA')
    await form.locator('input').nth(3).fill('X')
    await page.getByTestId('save-color').click()
    await expect(page.getByTestId('toast')).toContainText('fehlgeschlagen')
  })
})
