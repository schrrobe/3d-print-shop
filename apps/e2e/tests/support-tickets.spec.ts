import { expect, test } from '@playwright/test'
import { adminApiContext, apiContext, createTicketViaApi } from '../helpers/api.js'
import { gotoHydrated } from '../helpers/hydration.js'
import { AdminPage } from '../pages/admin.js'
import { ShopPage } from '../pages/shop.js'

const SUPPORT_EMAIL = 'support@example.com'
const SUPPORT_PASSWORD = 'admin-dev-password'

async function emailsFor(to: string): Promise<string[]> {
  const ctx = await apiContext()
  const response = await ctx.get(`/api/dev/emails?to=${encodeURIComponent(to)}`)
  const data = (await response.json()) as { emails: { template: string }[] }
  await ctx.dispose()
  return data.emails.map((e) => e.template)
}

/** Admin-side lookup of a ticket by its number (list endpoint + filter in JS). */
async function ticketByNumber(ticketNumber: string): Promise<{ id: string; status: string }> {
  const admin = await adminApiContext()
  const response = await admin.get('/api/admin/tickets')
  const data = (await response.json()) as { tickets: { id: string; ticketNumber: string; status: string }[] }
  await admin.dispose()
  const ticket = data.tickets.find((t) => t.ticketNumber === ticketNumber)
  if (!ticket) throw new Error(`Ticket ${ticketNumber} not found via admin API`)
  return ticket
}

test.describe('support tickets', () => {
  test('customer creates a ticket via the form and sees the thread on the token page', async ({ page }) => {
    const email = `ticket-ui-${Date.now()}@example.com`
    const shop = new ShopPage(page)
    await gotoHydrated(page, '/support')
    await shop.acceptConsent()

    await page.locator('input[name="name"]').fill('Tina Ticket')
    await page.locator('input[name="email"]').fill(email)
    await page.locator('input[name="subject"]').fill('Frage zur Lieferung')
    await page.getByTestId('support-category').selectOption('shipping')
    await page.locator('textarea[name="message"]').fill('Hallo, wie lange dauert der Versand nach Österreich?')
    await page.getByTestId('support-submit').click()

    await expect(page.getByTestId('support-success')).toBeVisible()
    const ticketNumber = (await page.getByTestId('support-ticket-number').textContent()) ?? ''
    expect(ticketNumber).toMatch(/^TIC-\d{4}-\d{5}$/)

    await page.getByTestId('support-ticket-link').click()
    await page.waitForURL(/\/support\/ticket\//)
    await expect(page.getByTestId('ticket-page')).toBeVisible()
    await expect(page.getByTestId('ticket-message')).toHaveCount(1)
    await expect(page.getByTestId('ticket-message').first()).toContainText('Versand nach Österreich')
    await expect(page.getByTestId('ticket-status')).toContainText('Offen')

    expect(await emailsFor(email)).toContain('ticket_created')
  })

  test('links the order only when order number and email match', async () => {
    const linked = await createTicketViaApi('kunde1@example.com', {
      orderNumber: 'PS-2026-00000001',
    })
    expect(linked.ticketNumber).toMatch(/^TIC-/)
    const ctx = await apiContext()
    const linkedView = (await (await ctx.get(`/api/tickets/${linked.accessToken}`)).json()) as {
      ticket: { orderNumber: string | null }
    }
    expect(linkedView.ticket.orderNumber).toBe('PS-2026-00000001')

    const unlinked = await createTicketViaApi(`wrong-mail-${Date.now()}@example.com`, {
      orderNumber: 'PS-2026-00000001',
    })
    const unlinkedView = (await (await ctx.get(`/api/tickets/${unlinked.accessToken}`)).json()) as {
      ticket: { orderNumber: string | null }
    }
    expect(unlinkedView.ticket.orderNumber).toBeNull()
    await ctx.dispose()
  })

  test('admin replies, sets waiting_customer; customer reply reopens; closing locks the thread', async ({ page }) => {
    const email = `ticket-flow-${Date.now()}@example.com`
    const { ticketNumber, accessToken } = await createTicketViaApi(email)
    const { id } = await ticketByNumber(ticketNumber)

    const admin = new AdminPage(page)
    await admin.login()
    await gotoHydrated(page, `/admin/tickets/${id}`)
    await expect(page.getByTestId('admin-ticket-detail')).toBeVisible()

    // Staff reply → status in_progress + customer notification
    await page.getByTestId('admin-ticket-reply').locator('textarea').fill('Hallo, wir prüfen das und melden uns!')
    await page.getByTestId('admin-ticket-reply-submit').click()
    await expect(page.getByTestId('admin-ticket-status')).toContainText('in_progress')
    await expect
      .poll(async () => emailsFor(email), { timeout: 10_000 })
      .toEqual(expect.arrayContaining(['ticket_reply']))

    // Explicit transition → waiting_customer
    await page.getByTestId('ticket-status-waiting_customer').click()
    await expect(page.getByTestId('admin-ticket-status')).toContainText('waiting_customer')

    // Customer replies on the token page → ticket reopens to in_progress
    await gotoHydrated(page, `/support/ticket/${accessToken}`)
    await new ShopPage(page).acceptConsent()
    await expect(page.getByTestId('ticket-message')).toHaveCount(2)
    await page.getByTestId('ticket-reply-input').locator('textarea').fill('Danke, ich warte auf eure Rückmeldung.')
    await page.getByTestId('ticket-reply-submit').click()
    await expect(page.getByTestId('ticket-message')).toHaveCount(3)
    expect((await ticketByNumber(ticketNumber)).status).toBe('in_progress')

    // Admin closes → public page hides the reply form
    const adminCtx = await adminApiContext()
    const close = await adminCtx.post(`/api/admin/tickets/${id}/status`, { data: { status: 'closed' } })
    expect(close.ok()).toBe(true)
    await adminCtx.dispose()

    await gotoHydrated(page, `/support/ticket/${accessToken}`)
    await expect(page.getByTestId('ticket-closed-note')).toBeVisible()
    await expect(page.getByTestId('ticket-reply-submit')).toBeHidden()
  })

  test('admin list shows seeded tickets with filters and assignment', async ({ page }) => {
    const admin = new AdminPage(page)
    await admin.login()
    await gotoHydrated(page, '/admin/tickets')
    await expect(page.getByTestId('admin-tickets')).toBeVisible()
    await expect(page.getByText('TIC-2026-00001')).toBeVisible()

    await page.getByTestId('ticket-status-filter').selectOption('in_progress')
    await expect(page.getByText('TIC-2026-00002')).toBeVisible()
    await expect(page.getByText('TIC-2026-00001')).toBeHidden()
    // seeded ticket 2 is assigned to the support user
    await expect(page.getByText('Sami Support')).toBeVisible()
  })

  test('support role can access and answer tickets (RBAC)', async ({ page }) => {
    const email = `ticket-rbac-${Date.now()}@example.com`
    const { ticketNumber } = await createTicketViaApi(email)
    const { id } = await ticketByNumber(ticketNumber)

    const admin = new AdminPage(page)
    await admin.login(SUPPORT_EMAIL, SUPPORT_PASSWORD)
    await gotoHydrated(page, '/admin/tickets')
    await expect(page.getByTestId('admin-tickets')).toBeVisible()

    await gotoHydrated(page, `/admin/tickets/${id}`)
    await page.getByTestId('admin-ticket-reply').locator('textarea').fill('Antwort vom Support-Team (RBAC-Test).')
    await page.getByTestId('admin-ticket-reply-submit').click()
    await expect(page.getByTestId('admin-ticket-status')).toContainText('in_progress')
  })

  test('invalid token shows 404', async ({ page }) => {
    const response = await page.goto('/support/ticket/not-a-real-token')
    expect(response?.status()).toBe(404)
  })
})
