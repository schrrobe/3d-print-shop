import { expect, test } from '@playwright/test'
import { apiContext } from '../helpers/api.js'
import { gotoHydrated } from '../helpers/hydration.js'

const VALID_TOKEN = 'test-magic-token-kunde1'
const EXPIRED_TOKEN = 'test-magic-token-expired'
const PORTAL_EMAIL = 'kunde1@example.com'

test.describe('customer portal (magic link)', () => {
  test('request-link always answers 202 (anti-enumeration)', async () => {
    const ctx = await apiContext()
    const known = await ctx.post('/api/portal/request-link', {
      data: { email: PORTAL_EMAIL, locale: 'de' },
    })
    expect(known.status()).toBe(202)
    const unknown = await ctx.post('/api/portal/request-link', {
      data: { email: 'nobody-xyz@example.com', locale: 'de' },
    })
    expect(unknown.status()).toBe(202)
    await ctx.dispose()
  })

  test('valid token exposes the account orders via API (Bearer only)', async () => {
    const ctx = await apiContext()
    const res = await ctx.get('/api/portal/orders', {
      headers: { Authorization: `Bearer ${VALID_TOKEN}` },
    })
    expect(res.ok()).toBe(true)
    const { orders } = (await res.json()) as { orders: { orderNumber: string; trackingNumber: string | null }[] }
    const seeded = orders.find((o) => o.orderNumber === 'PS-2026-00000004')
    expect(seeded).toBeTruthy()
    expect(seeded!.trackingNumber).toBe('HERMES-SEED-654321')
    await ctx.dispose()
  })

  test('invalid token is rejected', async () => {
    const ctx = await apiContext()
    const res = await ctx.get('/api/portal/orders', {
      headers: { Authorization: 'Bearer definitely-not-valid' },
    })
    expect(res.status()).toBe(401)
    await ctx.dispose()
  })

  test('portal page shows orders and tracking', async ({ page }) => {
    await gotoHydrated(page, `/portal/${VALID_TOKEN}`)
    await expect(page.getByTestId('portal-order-card').first()).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText('PS-2026-00000004')).toBeVisible()
    await expect(page.getByText('HERMES-SEED-654321')).toBeVisible()
    // Deep links to the existing token pages
    await expect(page.getByTestId('portal-order-complaint').first()).toBeVisible()
  })

  test('expired token shows the renewal form', async ({ page }) => {
    await gotoHydrated(page, `/portal/${EXPIRED_TOKEN}`)
    await expect(page.getByTestId('portal-expired')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByTestId('portal-renew-submit')).toBeVisible()
  })

  test('request-link page confirms without leaking existence', async ({ page }) => {
    await gotoHydrated(page, '/portal')
    await page.getByTestId('portal-request-email').locator('input').fill(PORTAL_EMAIL)
    await page.getByTestId('portal-request-submit').click()
    await expect(page.getByTestId('portal-request-confirmation')).toBeVisible()
  })
})
