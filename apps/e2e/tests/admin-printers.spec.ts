import { expect, test } from '@playwright/test'
import { AdminPage } from '../pages/admin.js'
import { gotoHydrated } from '../helpers/hydration.js'

test.describe('admin printers', () => {
  test('shows seeded printers with status and spools', async ({ page }) => {
    const admin = new AdminPage(page)
    await admin.login()
    await gotoHydrated(page, '/admin/printers')
    await expect(page.getByTestId('admin-printers')).toBeVisible()
    await expect(page.getByText('Bambu Lab X1C #1')).toBeVisible()
    await expect(page.getByText('Bambu Lab A1 #2')).toBeVisible()
    // AMS spool documentation from seed
    await expect(page.getByText('AMS-/Spulenbelegung').first()).toBeVisible()
  })

  test('creates a printer', async ({ page }) => {
    const admin = new AdminPage(page)
    await admin.login()
    await gotoHydrated(page, '/admin/printers')
    await page.getByTestId('new-printer').click()
    const form = page.getByTestId('printer-form')
    await form.locator('input').nth(0).fill('E2E Printer P1S')
    await form.locator('input').nth(1).fill('Bambu Lab P1S')
    await page.getByTestId('save-printer').click()
    await expect(page.getByText('E2E Printer P1S')).toBeVisible()
  })

  test('changes printer status (wartung → frei)', async ({ page }) => {
    const admin = new AdminPage(page)
    await admin.login()
    await gotoHydrated(page, '/admin/printers')
    const card = page.getByTestId('printer-row').filter({ hasText: 'Bambu Lab A1 #2' })
    await expect(card.getByText('Wartung', { exact: true })).toBeVisible()
    await card.getByTestId('printer-status-select').locator('button, [role="combobox"]').first().click()
    await page.getByRole('option', { name: 'idle' }).click()
    await expect(card.getByText('Frei', { exact: true })).toBeVisible()
  })
})
