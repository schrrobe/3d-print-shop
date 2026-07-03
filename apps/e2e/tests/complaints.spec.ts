import { expect, test } from '@playwright/test'
import { AdminPage } from '../pages/admin.js'
import { adminApiContext, apiContext } from '../helpers/api.js'
import { gotoHydrated } from '../helpers/hydration.js'

const ORDER = 'PS-2026-00000004'
const ORDER_TOKEN = 'seed-token-order-4'
const SEED_COMPLAINT = 'REK-2026-00001'

test.describe('complaints', () => {
  test('customer opens a complaint on an order', async ({ page }) => {
    await gotoHydrated(page, `/complaint/new?order=${ORDER}&token=${ORDER_TOKEN}`)
    await expect(page.getByTestId('complaint-custom-made-note')).toBeVisible()

    // Pick the first affected item
    await page.getByTestId('complaint-item-checkbox').first().check()
    await page.getByTestId('complaint-reason').selectOption('damaged')
    await page
      .locator('textarea[name="description"]')
      .fill('Die Oberfläche weist deutliche Risse auf, bitte um Ersatz.')
    await page.getByTestId('complaint-submit').click()

    await page.waitForURL(/\/complaint\/REK-/)
    await expect(page.getByTestId('complaint-status')).toBeVisible()
  })

  test('wrong complaint token is rejected', async () => {
    const ctx = await apiContext()
    const res = await ctx.get(`/api/complaints/${SEED_COMPLAINT}?token=wrong-token`)
    expect(res.status()).toBe(401)
    await ctx.dispose()
  })

  test('admin decides replacement and a reprint job is created', async () => {
    const admin = await adminApiContext()
    const list = (await (await admin.get('/api/admin/complaints')).json()) as {
      complaints: { id: string; complaintNumber: string; status: string }[]
    }
    const seeded = list.complaints.find((c) => c.complaintNumber === SEED_COMPLAINT)
    expect(seeded).toBeTruthy()

    // submitted → in_review, then decide a replacement print
    await admin.post(`/api/admin/complaints/${seeded!.id}/status`, { data: { status: 'in_review' } })
    const decision = await admin.post(`/api/admin/complaints/${seeded!.id}/decision`, {
      data: { resolution: 'replacement_print', note: 'Ersatzdruck angestoßen' },
    })
    expect(decision.status()).toBe(201)

    const detail = (await (await admin.get(`/api/admin/complaints/${seeded!.id}`)).json()) as {
      complaint: { status: string; decisions: { resolution: string; reprintJob: { id: string } | null }[] }
    }
    expect(detail.complaint.status).toBe('replacement_planned')
    expect(detail.complaint.decisions.some((d) => d.resolution === 'replacement_print' && d.reprintJob)).toBe(true)
    await admin.dispose()
  })

  test('admin links a support ticket to a complaint', async () => {
    const admin = await adminApiContext()
    const ctx = await apiContext()
    // A valid complaint needs at least one order item — read them from the order
    const order = (await (
      await ctx.get(`/api/orders/${ORDER}`, { params: { token: ORDER_TOKEN } })
    ).json()) as { order: { items: { id: string }[] } }
    const form = new FormData()
    form.append('orderNumber', ORDER)
    form.append('token', ORDER_TOKEN)
    form.append('reason', 'missing_parts')
    form.append('description', 'Im Paket fehlte eine Komponente des Sets.')
    form.append('items', JSON.stringify([{ orderItemId: order.order.items[3]!.id, quantity: 1 }]))
    const created = await ctx.post('/api/complaints', { multipart: form })
    expect(created.status()).toBe(201)
    const { complaintNumber } = (await created.json()) as { complaintNumber: string }

    const list = (await (await admin.get('/api/admin/complaints')).json()) as {
      complaints: { id: string; complaintNumber: string }[]
    }
    const fresh = list.complaints.find((c) => c.complaintNumber === complaintNumber)!
    const ticket = await admin.post(`/api/admin/complaints/${fresh.id}/ticket`, { data: {} })
    expect(ticket.status()).toBe(201)
    const body = (await ticket.json()) as { complaint: { ticket: { ticketNumber: string } | null } }
    expect(body.complaint.ticket?.ticketNumber).toMatch(/^TIC-/)
    await admin.dispose()
    await ctx.dispose()
  })

  test('admin complaints list renders', async ({ page }) => {
    const admin = new AdminPage(page)
    await admin.login()
    await gotoHydrated(page, '/admin/complaints')
    await expect(page.getByTestId('admin-complaints')).toBeVisible()
    await expect(page.getByText(SEED_COMPLAINT)).toBeVisible()
  })
})
