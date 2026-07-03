import { expect, test, type APIRequestContext } from '@playwright/test'
import { AdminPage } from '../pages/admin.js'
import {
  adminApiContext,
  apiContext,
  clearOrderJobsQc,
  createPaidOrderViaApi,
  getAdminOrder,
} from '../helpers/api.js'
import { gotoHydrated } from '../helpers/hydration.js'

async function createShipmentForOrder(admin: APIRequestContext, orderNumber: string) {
  const order = await getAdminOrder(admin, orderNumber)
  const res = await admin.post('/api/admin/shipments', {
    data: {
      orderId: order.id,
      items: order.items.map((i) => ({ orderItemId: i.id, quantity: i.quantity })),
    },
  })
  if (!res.ok()) throw new Error(`shipment create failed: ${res.status()}`)
  const { shipment } = (await res.json()) as { shipment: { id: string } }
  return { shipmentId: shipment.id, orderId: order.id }
}

test.describe('shipping management', () => {
  test('seeded shipments are listed with history', async () => {
    const admin = await adminApiContext()
    const list = (await (await admin.get('/api/admin/shipments')).json()) as {
      shipments: { shipmentNumber: string; status: string }[]
    }
    expect(list.shipments.some((s) => s.shipmentNumber === 'VER-2026-00001')).toBe(true)

    const detailList = list.shipments.filter((s) => s.shipmentNumber === 'VER-2026-00001')
    expect(detailList[0]?.status).toBe('shipped')
    await admin.dispose()
  })

  test('QC gate blocks ready_for_shipping until QC passes', async () => {
    const admin = await adminApiContext()
    const products = (await (await admin.get('/api/products')).json()) as { products: { id: string }[] }
    const { orderNumber } = await createPaidOrderViaApi(products.products[0]!.id, 'ship-gate@example.com')
    const { shipmentId } = await createShipmentForOrder(admin, orderNumber)

    // Jobs are still 'waiting' → not QC-cleared → 409
    const blocked = await admin.post(`/api/admin/shipments/${shipmentId}/status`, {
      data: { status: 'ready_for_shipping' },
    })
    expect(blocked.status()).toBe(409)
    await admin.dispose()
  })

  test('full flow: QC → ship with DHL, order shipped, email + PDF', async () => {
    const admin = await adminApiContext()
    const ctx = await apiContext()
    const email = `ship-full-${Date.now()}@example.com`
    const products = (await (await admin.get('/api/products')).json()) as { products: { id: string }[] }
    const { orderNumber } = await createPaidOrderViaApi(products.products[0]!.id, email)

    await clearOrderJobsQc(admin, orderNumber)
    const order = await getAdminOrder(admin, orderNumber)
    // Drive the order status machine to ready_to_ship
    for (const status of ['in_production', 'quality_check', 'ready_to_ship']) {
      await admin.post(`/api/admin/orders/${order.id}/status`, { data: { status } })
    }

    const { shipmentId } = await createShipmentForOrder(admin, orderNumber)
    const toReady = await admin.post(`/api/admin/shipments/${shipmentId}/status`, {
      data: { status: 'ready_for_shipping' },
    })
    expect(toReady.ok()).toBe(true)
    await admin.post(`/api/admin/shipments/${shipmentId}/status`, { data: { status: 'packed' } })

    const shipped = await admin.post(`/api/admin/shipments/${shipmentId}/ship`, {
      data: { carrier: 'dhl', trackingNumber: 'DHL-E2E-777001' },
    })
    expect(shipped.ok()).toBe(true)

    // Order marked shipped with carrier + tracking (single writer)
    const afterOrder = await getAdminOrder(admin, orderNumber)
    expect(afterOrder.status).toBe('shipped')

    // Shipping confirmation email logged
    const emails = (await (await ctx.get(`/api/dev/emails?to=${encodeURIComponent(email)}`)).json()) as {
      emails: { template: string }[]
    }
    expect(emails.emails.map((e) => e.template)).toContain('shipping_confirmation')

    // PDFs render
    const packing = await admin.get(`/api/admin/shipments/${shipmentId}/packing-list.pdf`)
    expect(packing.ok()).toBe(true)
    expect(packing.headers()['content-type']).toContain('pdf')
    const delivery = await admin.get(`/api/admin/shipments/${shipmentId}/delivery-note.pdf`)
    expect(delivery.ok()).toBe(true)

    await admin.dispose()
    await ctx.dispose()
  })

  test('admin shipments page renders', async ({ page }) => {
    const admin = new AdminPage(page)
    await admin.login()
    await gotoHydrated(page, '/admin/shipments')
    await expect(page.getByTestId('admin-shipments')).toBeVisible()
    await expect(page.getByText('VER-2026-00001')).toBeVisible()
  })
})
