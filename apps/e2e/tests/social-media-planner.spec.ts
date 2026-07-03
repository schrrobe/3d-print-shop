import { expect, test, type APIRequestContext } from '@playwright/test'
import { adminApiContext, apiContext, getFirstProduct } from '../helpers/api.js'
import { gotoHydrated } from '../helpers/hydration.js'
import { AdminPage } from '../pages/admin.js'

/**
 * Social Media Planner: Kalender/Liste, Editor mit Produkt-Prefill,
 * Planen/Bearbeiten/Löschen, Retry für fehlgeschlagene Posts, RBAC und
 * Unveränderlichkeit veröffentlichter Posts. Publishing läuft über den
 * Mock-Provider ([e2e-fail]-Marker erzwingt Fehlschläge).
 */

interface ApiPost {
  id: string
  platform: string
  status: string
  caption: string
}

async function createPostViaApi(
  admin: APIRequestContext,
  body: Record<string, unknown>,
): Promise<ApiPost[]> {
  const response = await admin.post('/api/admin/social-posts', { data: body })
  expect(response.status(), await response.text()).toBe(201)
  const data = (await response.json()) as { posts: ApiPost[] }
  return data.posts
}

async function runScheduler(admin: APIRequestContext): Promise<void> {
  const response = await admin.post('/api/admin/social-posts/run-scheduler')
  expect(response.ok()).toBe(true)
}

test.describe('social media planner', () => {
  test('admin opens the planner with seeded posts, filters and calendar', async ({ page }) => {
    const admin = new AdminPage(page)
    await admin.login()
    await gotoHydrated(page, '/admin/social')
    await expect(page.getByTestId('admin-social')).toBeVisible()

    // Seeded: Entwurf (Instagram), geplant (Facebook), fehlgeschlagen (Instagram)
    await expect(page.getByTestId('social-post-list')).toBeVisible()
    await expect(page.getByTestId('social-post-status').first()).toBeVisible()

    // Plattform-Filter
    await page.getByTestId('social-platform-filter').selectOption('facebook')
    await expect
      .poll(async () => page.locator('[data-testid="social-platform"][data-platform="instagram"]').count())
      .toBe(0)
    await page.getByTestId('social-platform-filter').selectOption('')

    // Status-Filter
    await page.getByTestId('social-status-filter').selectOption('failed')
    await expect
      .poll(async () =>
        page.locator('[data-testid="social-post-status"][data-status="failed"]').count(),
      )
      .toBeGreaterThan(0)
    await expect(
      page.locator('[data-testid="social-post-status"][data-status="draft"]'),
    ).toHaveCount(0)
    await page.getByTestId('social-status-filter').selectOption('')

    // Kalenderansicht
    await page.getByTestId('social-view-calendar').click()
    await expect(page.getByTestId('social-post-calendar')).toBeVisible()
    await expect(page.getByTestId('calendar-month')).toBeVisible()
  })

  test('admin creates a draft with product prefill, both platforms and media', async ({ page }) => {
    const admin = new AdminPage(page)
    await admin.login()
    await gotoHydrated(page, '/admin/social')
    await page.getByTestId('social-new-post').click()
    await page.waitForURL(/\/admin\/social\/new/)
    await expect(page.getByTestId('social-post-editor')).toBeVisible()

    // Produktwahl befüllt Caption (Name, Preis, Link) und Medien vor
    const productSelect = page.getByTestId('social-product-select')
    await productSelect.selectOption({ index: 1 })
    const caption = page.getByTestId('social-caption').locator('textarea')
    await expect(caption).not.toHaveValue('')
    const prefilled = await caption.inputValue()
    expect(prefilled).toContain('/products/')
    expect(prefilled).toContain('€')
    await expect(
      page.locator('[data-testid="media-option"][data-selected="true"]'),
    ).toHaveCount(1)

    // Beide Plattformen + eigene Caption-Markierung
    await page.getByTestId('social-platform-facebook').check()
    await caption.fill(`E2E-Entwurf beide Plattformen ${Date.now()}`)

    await page.getByTestId('social-save-draft').click()
    await expect(page.getByTestId('toast')).toContainText('Entwurf gespeichert')
    await page.waitForURL(/\/admin\/social$/)

    // Suche findet den Entwurf; zwei Zeilen (eine pro Plattform)
    await page.getByTestId('social-search').fill('E2E-Entwurf beide Plattformen')
    await expect
      .poll(async () => page.locator('[data-testid="social-post-status"][data-status="draft"]').count())
      .toBe(2)
  })

  test('admin schedules a post; it appears in list and calendar', async ({ page }) => {
    const admin = new AdminPage(page)
    await admin.login()
    await gotoHydrated(page, '/admin/social/new')

    await page.getByTestId('social-product-select').selectOption({ index: 1 })
    const caption = page.getByTestId('social-caption').locator('textarea')
    const marker = `E2E-Geplant ${Date.now()}`
    await caption.fill(marker)

    // Zeitpunkt weit in der Zukunft (lokale Eingabe, UTC-Speicherung)
    await page.getByTestId('scheduled-datetime').fill('2027-01-15T10:30')
    await page.getByTestId('social-schedule').click()
    await expect(page.getByTestId('toast')).toContainText('Post geplant')
    await page.waitForURL(/\/admin\/social$/)

    await page.getByTestId('social-search').fill(marker)
    await expect
      .poll(async () =>
        page.locator('[data-testid="social-post-status"][data-status="scheduled"]').count(),
      )
      .toBe(1)

    // Kalender: Monat Januar 2027 zeigt den Post
    await page.getByTestId('social-view-calendar').click()
    const month = page.getByTestId('calendar-month')
    for (let i = 0; i < 12; i++) {
      if ((await month.textContent())?.includes('Januar 2027')) break
      await page.getByTestId('calendar-next').click()
    }
    await expect(month).toContainText('Januar 2027')
    await expect(page.getByTestId('social-post-card').first()).toBeVisible()
  })

  test('admin edits a scheduled post', async ({ page }) => {
    const adminCtx = await adminApiContext()
    const product = await getFirstProduct()
    const marker = `E2E-Edit ${Date.now()}`
    const [post] = await createPostViaApi(adminCtx, {
      platforms: ['facebook'],
      caption: marker,
      mediaUrls: [],
      productId: product.id,
      scheduledAt: '2027-02-01T09:00:00.000Z',
      schedule: true,
    })
    await adminCtx.dispose()

    const admin = new AdminPage(page)
    await admin.login()
    await gotoHydrated(page, `/admin/social/${post!.id}`)
    await expect(page.getByTestId('social-post-editor')).toBeVisible()

    const caption = page.getByTestId('social-caption').locator('textarea')
    await caption.fill(`${marker} — überarbeitet`)
    await page.getByTestId('social-save-draft').click()
    await expect(page.getByTestId('toast')).toContainText('Änderungen gespeichert')

    await gotoHydrated(page, '/admin/social')
    await page.getByTestId('social-search').fill(`${marker} — überarbeitet`)
    await expect
      .poll(async () =>
        page.locator('[data-testid="social-post-status"][data-status="scheduled"]').count(),
      )
      .toBe(1)
  })

  test('admin deletes a scheduled post via the list', async ({ page }) => {
    const adminCtx = await adminApiContext()
    const marker = `E2E-Delete ${Date.now()}`
    await createPostViaApi(adminCtx, {
      platforms: ['facebook'],
      caption: marker,
      mediaUrls: [],
      scheduledAt: '2027-03-01T09:00:00.000Z',
      schedule: true,
    })
    await adminCtx.dispose()

    const admin = new AdminPage(page)
    await admin.login()
    await gotoHydrated(page, '/admin/social')
    await page.getByTestId('social-search').fill(marker)
    // Suche ist debounced — erst auf die gefilterte Einzelzeile warten
    const row = page.locator('[data-testid="social-post-list"] tbody tr', { hasText: marker })
    await expect(row).toHaveCount(1)
    await row.getByTestId('social-post-delete').click()
    await page.getByTestId('social-delete-confirm').click()
    await expect(page.getByTestId('toast')).toContainText('Post gelöscht')
    await expect(page.locator('[data-testid="social-post-list"] tbody tr td[colspan]')).toBeVisible()
  })

  test('failed post can be retried and publishes on the next run', async ({ page }) => {
    const adminCtx = await adminApiContext()
    const marker = `E2E-Retry ${Date.now()}`
    // Mock-Provider schlägt fehl, solange die Caption [e2e-fail] enthält
    const [post] = await createPostViaApi(adminCtx, {
      platforms: ['facebook'],
      caption: `[e2e-fail] ${marker}`,
      mediaUrls: [],
      scheduledAt: '2026-01-01T00:00:00.000Z',
      schedule: true,
    })
    await runScheduler(adminCtx)
    let detail = (await (await adminCtx.get(`/api/admin/social-posts/${post!.id}`)).json()) as {
      post: ApiPost & { errorMessage: string | null }
    }
    expect(detail.post.status).toBe('failed')
    expect(detail.post.errorMessage).toContain('mock_simulated_failure')

    // UI: Fehlermeldung sichtbar, Fix + sofortiger Retry
    const admin = new AdminPage(page)
    await admin.login()
    await gotoHydrated(page, `/admin/social/${post!.id}`)
    await expect(page.getByTestId('social-error-message')).toContainText('mock_simulated_failure')
    const caption = page.getByTestId('social-caption').locator('textarea')
    await caption.fill(marker) // Marker entfernen, damit der Retry durchgeht
    await page.getByTestId('social-save-draft').click()
    await expect(page.getByTestId('toast')).toContainText('Änderungen gespeichert')
    await page.getByTestId('social-detail-retry').click()
    await expect(page.getByTestId('toast').last()).toContainText('erneut geplant')

    await runScheduler(adminCtx)
    detail = (await (await adminCtx.get(`/api/admin/social-posts/${post!.id}`)).json()) as {
      post: ApiPost & { errorMessage: string | null }
    }
    expect(detail.post.status).toBe('published')
    await adminCtx.dispose()
  })

  test('unauthorized roles cannot create posts (RBAC)', async () => {
    // Produktion: kein social-posts-Zugriff
    const production = await apiContext()
    const login = await production.post('/api/admin/auth/login', {
      data: { email: 'produktion@example.com', password: 'admin-dev-password' },
    })
    expect(login.ok()).toBe(true)
    const denied = await production.post('/api/admin/social-posts', {
      data: { platforms: ['facebook'], caption: 'RBAC-Test', mediaUrls: [] },
    })
    expect(denied.status()).toBe(403)
    const deniedRead = await production.get('/api/admin/social-posts')
    expect(deniedRead.status()).toBe(403)
    await production.dispose()

    // Support: lesen ja, schreiben nein
    const support = await apiContext()
    const supportLogin = await support.post('/api/admin/auth/login', {
      data: { email: 'support@example.com', password: 'admin-dev-password' },
    })
    expect(supportLogin.ok()).toBe(true)
    const read = await support.get('/api/admin/social-posts')
    expect(read.status()).toBe(200)
    const write = await support.post('/api/admin/social-posts', {
      data: { platforms: ['facebook'], caption: 'RBAC-Test', mediaUrls: [] },
    })
    expect(write.status()).toBe(403)
    await support.dispose()
  })

  test('published posts cannot be edited or deleted', async ({ page }) => {
    const adminCtx = await adminApiContext()
    const marker = `E2E-Published ${Date.now()}`
    const [post] = await createPostViaApi(adminCtx, {
      platforms: ['facebook'],
      caption: marker,
      mediaUrls: [],
      scheduledAt: '2026-01-01T00:00:00.000Z',
      schedule: true,
    })
    await runScheduler(adminCtx)
    const detail = (await (await adminCtx.get(`/api/admin/social-posts/${post!.id}`)).json()) as {
      post: ApiPost & { externalPostId: string | null }
    }
    expect(detail.post.status).toBe('published')
    expect(detail.post.externalPostId).toContain('mock_facebook_')

    // API: Bearbeiten/Löschen → 409
    const patch = await adminCtx.patch(`/api/admin/social-posts/${post!.id}`, {
      data: { caption: 'darf nicht' },
    })
    expect(patch.status()).toBe(409)
    const del = await adminCtx.delete(`/api/admin/social-posts/${post!.id}`)
    expect(del.status()).toBe(409)
    await adminCtx.dispose()

    // UI: Nur-Lesen-Ansicht ohne Editor/Löschen
    const admin = new AdminPage(page)
    await admin.login()
    await gotoHydrated(page, `/admin/social/${post!.id}`)
    await expect(page.getByTestId('social-readonly-notice')).toBeVisible()
    await expect(page.getByTestId('social-post-editor')).toHaveCount(0)
    await expect(page.getByTestId('social-detail-delete')).toHaveCount(0)
    await expect(page.getByTestId('social-post-preview')).toBeVisible()
  })
})
