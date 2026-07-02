import { expect, test } from '@playwright/test'
import { adminApiContext, apiContext } from '../helpers/api.js'
import { AdminPage } from '../pages/admin.js'

test.describe('admin auth & rbac', () => {
  test('rejects wrong credentials', async ({ page }) => {
    await page.goto('/admin/login')
    await page.locator('input[name="email"]').fill('admin@example.com')
    await page.locator('input[name="password"]').fill('definitely-wrong-pw')
    await page.getByTestId('login-submit').click()
    await expect(page.getByTestId('login-error')).toBeVisible()
  })

  test('admin can log in and out', async ({ page }) => {
    const admin = new AdminPage(page)
    await admin.login()
    await expect(page.getByTestId('admin-dashboard')).toBeVisible()
    await page.getByTestId('admin-logout').click()
    await page.waitForURL(/\/admin\/login/)
  })

  test('unauthenticated users are redirected to login', async ({ page }) => {
    await page.goto('/admin/orders')
    await page.waitForURL(/\/admin\/login/)
  })

  test('api requires auth for admin routes', async () => {
    const ctx = await apiContext()
    const response = await ctx.get('/api/admin/orders')
    expect(response.status()).toBe(401)
    await ctx.dispose()
  })

  test('rbac: production role cannot manage users', async () => {
    const ctx = await apiContext()
    const login = await ctx.post('/api/admin/auth/login', {
      data: { email: 'produktion@example.com', password: 'admin-dev-password' },
    })
    expect(login.ok()).toBe(true)
    const users = await ctx.get('/api/admin/users')
    expect(users.status()).toBe(403)
    // but production may read the queue
    const queue = await ctx.get('/api/admin/production/queue')
    expect(queue.ok()).toBe(true)
    await ctx.dispose()
  })

  test('admin session grants full access', async () => {
    const ctx = await adminApiContext()
    const users = await ctx.get('/api/admin/users')
    expect(users.ok()).toBe(true)
    await ctx.dispose()
  })
})
