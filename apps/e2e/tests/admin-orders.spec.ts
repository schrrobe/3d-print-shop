import { expect, test } from '@playwright/test'
import { AdminPage } from '../pages/admin.js'
import { adminApiContext, createPaidOrderViaApi, getAdminOrder } from '../helpers/api.js'
import { gotoHydrated } from '../helpers/hydration.js'

test.describe('admin orders', () => {
  test('lists seeded orders with status filter', async ({ page }) => {
    const admin = new AdminPage(page)
    await admin.login()
    await gotoHydrated(page, '/admin/orders')
    await expect(page.getByTestId('admin-orders')).toBeVisible()
    await expect(page.getByText('PS-2026-00000001')).toBeVisible()

    await page.getByTestId('order-status-filter').selectOption('awaiting_bank_transfer')
    await expect(page.getByText('PS-2026-00000002')).toBeVisible()
    await expect(page.getByText('PS-2026-00000001')).toBeHidden()
  })

  test('bank transfer order can be marked as paid', async ({ page }) => {
    const admin = new AdminPage(page)
    await admin.login()
    await gotoHydrated(page, '/admin/orders')
    await page.getByTestId('order-status-filter').selectOption('awaiting_bank_transfer')
    await page.getByTestId('order-detail-link').first().click()
    await page.waitForURL(/\/admin\/orders\//)

    await page.getByTestId('mark-paid').click()
    await expect(page.getByTestId('admin-order-status')).toContainText('paid')
  })

  test('shipping with tracking number marks order as shipped', async ({ page }) => {
    // Fresh paid order, print jobs still open — the tracking number alone ships it
    const api = await adminApiContext()
    const products = (await (await api.get('/api/products')).json()) as {
      products: { id: string }[]
    }
    const { orderNumber } = await createPaidOrderViaApi(
      products.products[0]!.id,
      'admin-ship@example.com',
    )
    const order = await getAdminOrder(api, orderNumber)
    await api.dispose()

    const admin = new AdminPage(page)
    await admin.login()
    await gotoHydrated(page, `/admin/orders/${order.id}`)

    await page.locator('input[name="trackingNumber"]').fill('DHL-E2E-424242')
    await page.getByTestId('ship-order').click()
    await expect(page.getByTestId('admin-order-status')).toContainText('shipped')
  })

  test('internal note stays admin-only, tracking link reaches the customer', async ({
    page,
    request,
  }) => {
    const api = await adminApiContext()
    const products = (await (await api.get('/api/products')).json()) as {
      products: { id: string }[]
    }
    const { orderNumber, accessToken } = await createPaidOrderViaApi(
      products.products[0]!.id,
      'admin-note@example.com',
    )
    const order = await getAdminOrder(api, orderNumber)
    await api.dispose()

    const admin = new AdminPage(page)
    await admin.login()
    await gotoHydrated(page, `/admin/orders/${order.id}`)

    await page.locator('textarea[name="internalNote"]').fill('Nur intern: Kunde ruft zurück')
    await page.getByTestId('save-internal-note').click()
    await expect(page.getByTestId('toast').filter({ hasText: 'Gespeichert' })).toBeVisible()

    await page.locator('input[name="trackingNumber"]').fill('DHL-E2E-NOTE-1')
    await page
      .locator('input[name="trackingUrl"]')
      .fill('https://www.dhl.de/track?id=DHL-E2E-NOTE-1')
    await page.getByTestId('ship-order').click()
    await expect(page.getByTestId('admin-order-status')).toContainText('shipped')
    await expect(page.getByTestId('order-tracking').getByRole('link')).toHaveAttribute(
      'href',
      'https://www.dhl.de/track?id=DHL-E2E-NOTE-1',
    )

    await page.reload()
    await expect(page.locator('textarea[name="internalNote"]')).toHaveValue(
      'Nur intern: Kunde ruft zurück',
    )

    const publicOrder = await request.get(
      `http://localhost:3001/api/orders/${orderNumber}?token=${accessToken}`,
    )
    expect(publicOrder.ok()).toBe(true)
    const body = await publicOrder.text()
    expect(body).not.toContain('Kunde ruft zurück')
    expect(body).toContain('https://www.dhl.de/track?id=DHL-E2E-NOTE-1')
  })

  test('delivery address can be redirected until the order ships', async ({ page }) => {
    const api = await adminApiContext()
    const products = (await (await api.get('/api/products')).json()) as {
      products: { id: string }[]
    }
    const { orderNumber } = await createPaidOrderViaApi(
      products.products[0]!.id,
      'admin-delivery@example.com',
    )
    const order = await getAdminOrder(api, orderNumber)

    const admin = new AdminPage(page)
    await admin.login()
    await gotoHydrated(page, `/admin/orders/${order.id}`)

    await page.getByTestId('edit-delivery-address').click()
    const form = page.getByTestId('delivery-address-form')
    await form.locator('input[name="deliveryFirstName"]').fill('Max')
    await form.locator('input[name="deliveryLastName"]').fill('Nachbar')
    await form.locator('input[name="deliveryStreet"]').fill('Andere Straße 9')
    await form.locator('input[name="deliveryZip"]').fill('20095')
    await form.locator('input[name="deliveryCity"]').fill('Hamburg')
    await page.getByTestId('save-delivery-address').click()
    await expect(page.getByTestId('delivery-address')).toContainText('Max Nachbar')
    await expect(page.getByTestId('delivery-address')).toContainText('20095 Hamburg')

    // Billing address (invoice) stays as ordered.
    expect((await getAdminOrder(api, orderNumber)).street).toBe('Flowweg 1')

    await page.locator('input[name="trackingNumber"]').fill('DHL-E2E-DELIVERY-1')
    await page.getByTestId('ship-order').click()
    await expect(page.getByTestId('admin-order-status')).toContainText('shipped')
    await expect(page.getByTestId('edit-delivery-address')).toHaveCount(0)

    const late = await api.patch(`/api/admin/orders/${order.id}`, {
      data: { deliveryAddress: null },
    })
    expect(late.status()).toBe(409)
    await api.dispose()
  })

  test('tracking link only accepts http(s) urls', async ({ request }) => {
    const login = await request.post('http://localhost:3001/api/admin/auth/login', {
      data: { email: 'admin@example.com', password: 'admin-dev-password' },
    })
    expect(login.ok()).toBe(true)
    const orders = (await (
      await request.get('http://localhost:3001/api/admin/orders?status=shipped')
    ).json()) as { orders: { id: string }[] }
    const response = await request.patch(
      `http://localhost:3001/api/admin/orders/${orders.orders[0]!.id}`,
      { data: { trackingUrl: 'javascript:alert(1)' } },
    )
    expect(response.status()).toBe(400)
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
