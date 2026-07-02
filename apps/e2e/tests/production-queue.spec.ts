import { expect, test } from '@playwright/test'
import { AdminPage } from '../pages/admin.js'
import { gotoHydrated } from '../helpers/hydration.js'

test.describe('production queue', () => {
  test('shows seeded printing job', async ({ page }) => {
    const admin = new AdminPage(page)
    await admin.login()
    await gotoHydrated(page, '/admin/production')
    await expect(page.getByTestId('production-queue')).toBeVisible()
    const job = page.getByTestId('production-job').filter({ hasText: 'PS-2026-00000001' })
    await expect(job).toBeVisible()
    await expect(job.getByText('Druckt')).toBeVisible()
  })

  test('walks a job through the production lifecycle', async ({ page }) => {
    const admin = new AdminPage(page)
    await admin.login()
    await gotoHydrated(page, '/admin/production')
    const job = page.getByTestId('production-job').filter({ hasText: 'PS-2026-00000001' })

    await job.getByTestId('job-status-printed').click()
    await expect(job.getByText('Fertig', { exact: true })).toBeVisible()

    await job.getByTestId('job-status-quality_check').click()
    await expect(job.getByText('Qualitätsprüfung')).toBeVisible()

    await job.getByTestId('job-status-ready_to_ship').click()
    await expect(job.getByText('Versandbereit')).toBeVisible()
  })

  test('assigns a waiting job to a printer with duration', async ({ page, request }) => {
    // Create a fresh paid order → production job via checkout + mock payment
    const products = (await (await request.get('http://localhost:3001/api/products')).json()) as {
      products: { id: string }[]
    }
    const checkout = await request.post('http://localhost:3001/api/checkout', {
      data: {
        items: [{ productId: products.products[0]!.id, quantity: 1, colorSelection: {} }],
        address: {
          firstName: 'Queue',
          lastName: 'Test',
          street: 'Queueweg 1',
          zip: '10115',
          city: 'Berlin',
          country: 'DE',
          email: 'queue-e2e@example.com',
        },
        paymentMethod: 'stripe',
      },
    })
    const checkoutData = (await checkout.json()) as { payment: { redirectUrl: string } }
    const session = new URL(checkoutData.payment.redirectUrl).searchParams.get('session')!
    await request.post(`http://localhost:3001/api/dev/stripe/complete/${session}`)

    const admin = new AdminPage(page)
    await admin.login()
    await gotoHydrated(page, '/admin/production')
    const waiting = page.getByTestId('production-job').filter({ hasText: 'Wartet' }).first()
    await waiting.getByTestId('assign-job').click()

    const form = page.getByTestId('assign-form')
    await form.locator('input[type="number"]').fill('90')
    await page.getByTestId('confirm-assign').click()
    await expect(page.getByTestId('production-job').filter({ hasText: 'Zugewiesen' }).first()).toBeVisible()
  })
})
