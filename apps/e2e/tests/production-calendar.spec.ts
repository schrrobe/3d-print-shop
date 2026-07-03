import { expect, test, type APIRequestContext } from '@playwright/test'
import { AdminPage } from '../pages/admin.js'
import { adminApiContext, createPaidOrderViaApi, getAdminOrder } from '../helpers/api.js'
import { gotoHydrated } from '../helpers/hydration.js'

async function freshJobId(admin: APIRequestContext, email: string): Promise<string> {
  const products = (await (await admin.get('/api/products')).json()) as { products: { id: string }[] }
  const { orderNumber } = await createPaidOrderViaApi(products.products[0]!.id, email)
  const order = await getAdminOrder(admin, orderNumber)
  return order.printerJobs[0]!.id
}

test.describe('production calendar', () => {
  test('overlapping jobs conflict unless forced', async () => {
    const admin = await adminApiContext()
    const printers = (await (await admin.get('/api/admin/printers')).json()) as { printers: { id: string }[] }
    const printerId = printers.printers[0]!.id
    const jobA = await freshJobId(admin, 'cal-a@example.com')
    const jobB = await freshJobId(admin, 'cal-b@example.com')

    const first = await admin.post(`/api/admin/production/${jobA}/schedule`, {
      data: { printerId, plannedStartAt: '2027-01-04T08:00:00.000Z', plannedEndAt: '2027-01-04T12:00:00.000Z' },
    })
    expect(first.ok()).toBe(true)

    const conflict = await admin.post(`/api/admin/production/${jobB}/schedule`, {
      data: { printerId, plannedStartAt: '2027-01-04T10:00:00.000Z', plannedEndAt: '2027-01-04T14:00:00.000Z' },
    })
    expect(conflict.status()).toBe(409)
    const body = (await conflict.json()) as { details?: { jobs: unknown[] } }
    expect(body.details?.jobs.length).toBeGreaterThan(0)

    const forced = await admin.post(`/api/admin/production/${jobB}/schedule`, {
      data: {
        printerId,
        plannedStartAt: '2027-01-04T10:00:00.000Z',
        plannedEndAt: '2027-01-04T14:00:00.000Z',
        force: true,
      },
    })
    expect(forced.ok()).toBe(true)
    await admin.dispose()
  })

  test('a job can be moved to a free slot', async () => {
    const admin = await adminApiContext()
    const printers = (await (await admin.get('/api/admin/printers')).json()) as { printers: { id: string }[] }
    const printerId = printers.printers[0]!.id
    const jobId = await freshJobId(admin, 'cal-move@example.com')

    await admin.post(`/api/admin/production/${jobId}/schedule`, {
      data: { printerId, plannedStartAt: '2027-03-01T08:00:00.000Z', plannedEndAt: '2027-03-01T10:00:00.000Z' },
    })
    const moved = await admin.post(`/api/admin/production/${jobId}/schedule`, {
      data: { printerId, plannedStartAt: '2027-03-02T08:00:00.000Z', plannedEndAt: '2027-03-02T10:00:00.000Z' },
    })
    expect(moved.ok()).toBe(true)
    const { job } = (await moved.json()) as { job: { plannedStartAt: string } }
    expect(job.plannedStartAt).toContain('2027-03-02')
    await admin.dispose()
  })

  test('maintenance windows block scheduling', async () => {
    const admin = await adminApiContext()
    const printers = (await (await admin.get('/api/admin/printers')).json()) as { printers: { id: string }[] }
    const printerId = printers.printers[1]?.id ?? printers.printers[0]!.id
    const jobId = await freshJobId(admin, 'cal-maint@example.com')

    await admin.post(`/api/admin/production/printers/${printerId}/maintenance`, {
      data: { title: 'E2E Wartung', startsAt: '2027-04-01T08:00:00.000Z', endsAt: '2027-04-01T12:00:00.000Z' },
    })
    const conflict = await admin.post(`/api/admin/production/${jobId}/schedule`, {
      data: { printerId, plannedStartAt: '2027-04-01T10:00:00.000Z', plannedEndAt: '2027-04-01T14:00:00.000Z' },
    })
    expect(conflict.status()).toBe(409)
    const body = (await conflict.json()) as { details?: { maintenance: unknown[] } }
    expect(body.details?.maintenance.length).toBeGreaterThan(0)
    await admin.dispose()
  })

  test('calendar page renders with the seeded week', async ({ page }) => {
    const admin = new AdminPage(page)
    await admin.login()
    await gotoHydrated(page, '/admin/production/calendar')
    await expect(page.getByTestId('admin-calendar')).toBeVisible()
    await expect(page.getByTestId('calendar-next')).toBeVisible()
    await page.getByTestId('calendar-next').click()
    await expect(page.getByTestId('week-calendar')).toBeVisible()
  })
})
