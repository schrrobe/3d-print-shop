import { expect, test } from '@playwright/test'
import { AdminPage } from '../pages/admin.js'

test.describe('admin orders', () => {
  test('lists seeded orders with status filter', async ({ page }) => {
    const admin = new AdminPage(page)
    await admin.login()
    await page.goto('/admin/orders')
    await expect(page.getByTestId('admin-orders')).toBeVisible()
    await expect(page.getByText('PS-2026-00000001')).toBeVisible()

    await page.getByTestId('order-status-filter').selectOption('awaiting_bank_transfer')
    await expect(page.getByText('PS-2026-00000002')).toBeVisible()
    await expect(page.getByText('PS-2026-00000001')).toBeHidden()
  })

  test('bank transfer order can be marked as paid', async ({ page }) => {
    const admin = new AdminPage(page)
    await admin.login()
    await page.goto('/admin/orders')
    await page.getByTestId('order-status-filter').selectOption('awaiting_bank_transfer')
    await page.getByTestId('order-detail-link').first().click()
    await page.waitForURL(/\/admin\/orders\//)

    await page.getByTestId('mark-paid').click()
    await expect(page.getByTestId('admin-order-status')).toContainText('paid')
  })

  test('shipping with tracking number marks order as shipped', async ({ page }) => {
    const admin = new AdminPage(page)
    await admin.login()
    // Seed order 1 is in_production → quality_check → ready_to_ship → ship
    await page.goto('/admin/orders')
    await page.getByTestId('order-status-filter').selectOption('in_production')
    await page.getByTestId('order-detail-link').first().click()
    await page.waitForURL(/\/admin\/orders\//)

    await page.getByTestId('status-quality_check').click()
    await expect(page.getByTestId('admin-order-status')).toContainText('quality_check')
    await page.getByTestId('status-ready_to_ship').click()
    await expect(page.getByTestId('admin-order-status')).toContainText('ready_to_ship')

    await page.locator('input[name="trackingNumber"]').fill('DHL-E2E-424242')
    await page.getByTestId('ship-order').click()
    await expect(page.getByTestId('admin-order-status')).toContainText('shipped')
  })

  test('invalid status transitions are rejected by the api', async ({ request }) => {
    const login = await request.post('http://localhost:3001/api/admin/auth/login', {
      data: { email: 'admin@example.com', password: 'admin-dev-password' },
    })
    expect(login.ok()).toBe(true)
    const orders = (await (
      await request.get('http://localhost:3001/api/admin/orders?status=shipped')
    ).json()) as { orders: { id: string }[] }
    const shipped = orders.orders[0]!
    const response = await request.post(
      `http://localhost:3001/api/admin/orders/${shipped.id}/status`,
      { data: { status: 'pending' } },
    )
    expect(response.status()).toBe(409)
  })
})
