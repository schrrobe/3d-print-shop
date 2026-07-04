import { expect, test, type APIRequestContext } from '@playwright/test'
import { AdminPage } from '../pages/admin.js'
import { adminApiContext, createPaidOrderViaApi, getAdminOrder, roleApiContext } from '../helpers/api.js'
import { gotoHydrated } from '../helpers/hydration.js'

const CATALOG = '/api/products'

async function firstProductId(admin: APIRequestContext): Promise<string> {
  const res = (await (await admin.get(CATALOG)).json()) as { products: { id: string }[] }
  return res.products[0]!.id
}

/** Move an order's single job to quality_check without opening a QC record yet. */
async function jobToQualityCheck(admin: APIRequestContext, orderNumber: string): Promise<string> {
  const printers = (await (await admin.get('/api/admin/printers')).json()) as { printers: { id: string }[] }
  const printerId = printers.printers[0]!.id
  const order = await getAdminOrder(admin, orderNumber)
  const job = order.printerJobs[0]!
  await admin.post(`/api/admin/production/${job.id}/assign`, { data: { printerId, printDurationMinutes: 30 } })
  await admin.post(`/api/admin/production/${job.id}/status`, { data: { status: 'printing' } })
  await admin.post(`/api/admin/production/${job.id}/status`, { data: { status: 'printed' } })
  await admin.post(`/api/admin/production/${job.id}/status`, { data: { status: 'quality_check' } })
  return job.id
}

test.describe('quality control', () => {
  test('passing QC requires the full checklist', async () => {
    const admin = await adminApiContext()
    const productId = await firstProductId(admin)
    const { orderNumber } = await createPaidOrderViaApi(productId, 'qc-gate@example.com')
    const jobId = await jobToQualityCheck(admin, orderNumber)

    const opened = await admin.post('/api/admin/qc', { data: { printerJobId: jobId } })
    const { record } = (await opened.json()) as { record: { id: string } }

    // Not all boxes ticked → 409
    const early = await admin.post(`/api/admin/qc/${record.id}/status`, { data: { status: 'passed' } })
    expect(early.status()).toBe(409)

    await admin.patch(`/api/admin/qc/${record.id}`, {
      data: {
        colorOk: true,
        surfaceOk: true,
        dimensionsOk: true,
        stabilityOk: true,
        completenessOk: true,
        packagingOk: true,
      },
    })
    const passed = await admin.post(`/api/admin/qc/${record.id}/status`, { data: { status: 'passed' } })
    expect(passed.ok()).toBe(true)
    await admin.dispose()
  })

  test('failed QC can require a reprint and releases the job', async () => {
    const admin = await adminApiContext()
    const productId = await firstProductId(admin)
    const { orderNumber } = await createPaidOrderViaApi(productId, 'qc-reprint@example.com')
    const jobId = await jobToQualityCheck(admin, orderNumber)

    const opened = await admin.post('/api/admin/qc', { data: { printerJobId: jobId } })
    const { record } = (await opened.json()) as { record: { id: string } }
    await admin.post(`/api/admin/qc/${record.id}/status`, { data: { status: 'failed' } })
    const reprint = await admin.post(`/api/admin/qc/${record.id}/status`, { data: { status: 'reprint_required' } })
    expect(reprint.ok()).toBe(true)

    const order = await getAdminOrder(admin, orderNumber)
    const job = order.printerJobs.find((j) => j.id === jobId)
    expect(job?.status).toBe('reprint_needed')
    await admin.dispose()
  })

  test('override requires admin — production is forbidden', async () => {
    const admin = await adminApiContext()
    const productId = await firstProductId(admin)
    const { orderNumber } = await createPaidOrderViaApi(productId, 'qc-override@example.com')
    const jobId = await jobToQualityCheck(admin, orderNumber)
    const opened = await admin.post('/api/admin/qc', { data: { printerJobId: jobId } })
    const { record } = (await opened.json()) as { record: { id: string } }
    await admin.dispose()

    const production = await roleApiContext('produktion@example.com')
    const forbidden = await production.post(`/api/admin/qc/${record.id}/override`, {
      data: { overrideReason: 'Versand trotz offener Prüfung' },
    })
    expect(forbidden.status()).toBe(403)
    await production.dispose()

    const admin2 = await adminApiContext()
    const allowed = await admin2.post(`/api/admin/qc/${record.id}/override`, {
      data: { overrideReason: 'Bewusste Freigabe durch Admin' },
    })
    expect(allowed.ok()).toBe(true)
    await admin2.dispose()
  })

  test('admin runs a QC checklist through the UI', async ({ page }) => {
    const admin = await adminApiContext()
    const productId = await firstProductId(admin)
    const { orderNumber } = await createPaidOrderViaApi(productId, 'qc-ui@example.com')
    await jobToQualityCheck(admin, orderNumber)
    await admin.dispose()

    const adminPage = new AdminPage(page)
    await adminPage.login()
    await gotoHydrated(page, '/admin/qc')
    await expect(page.getByTestId('admin-qc')).toBeVisible()

    const job = page.getByTestId('qc-job').filter({ hasText: orderNumber })
    await job.getByTestId('qc-start').click()
    // Tick all six checklist items
    const checklist = job.getByTestId('qc-checklist')
    const boxes = checklist.locator('input[type="checkbox"]')
    await boxes.first().waitFor()
    const count = await boxes.count()
    for (let i = 0; i < count; i++) await boxes.nth(i).check()
    // Wait for the checklist state to settle before passing
    await expect(job.getByTestId('qc-progress')).toContainText('6/6')
    await job.getByTestId('qc-pass').click()
    await expect(page.getByText('QC → passed', { exact: true })).toBeVisible()
  })
})
