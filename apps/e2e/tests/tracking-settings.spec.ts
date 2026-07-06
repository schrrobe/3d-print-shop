import { expect, test, type Page } from '@playwright/test'
import { adminApiContext } from '../helpers/api.js'
import { gotoHydrated } from '../helpers/hydration.js'
import { AdminPage } from '../pages/admin.js'

const GA_ID = 'G-TEST123456'
const GTM_ID = 'GTM-TEST123'
const PIXEL_ID = '123456789012345'

const TRACKER_URL = /googletagmanager\.com|google-analytics\.com|connect\.facebook\.net|facebook\.com/

async function putTrackingSettings(values: {
  metaPixelId: string | null
  ga4MeasurementId: string | null
  gtmContainerId: string | null
}): Promise<void> {
  const admin = await adminApiContext()
  const res = await admin.put('/api/admin/settings/tracking', { data: values })
  if (!res.ok()) throw new Error(`saving tracking settings failed: ${res.status()}`)
  await admin.dispose()
}

/** Stub all third-party tracker hosts (offline-safe) and collect the attempted URLs. */
async function stubTrackers(page: Page): Promise<string[]> {
  const requests: string[] = []
  await page.route(TRACKER_URL, (route) => {
    requests.push(route.request().url())
    void route.fulfill({ status: 200, contentType: 'application/javascript', body: '/* stubbed */' })
  })
  return requests
}

/** PageView count recorded by the Meta Pixel stub queue (remote script is stubbed). */
async function pixelPageViews(page: Page): Promise<number> {
  return page.evaluate(() => {
    const fbq = (window as unknown as { fbq?: { queue?: unknown[] } }).fbq
    if (!fbq?.queue) return 0
    return fbq.queue.filter((entry) => {
      const args = Array.from(entry as ArrayLike<unknown>)
      return args[0] === 'track' && args[1] === 'PageView'
    }).length
  })
}

test.describe('tracking settings', () => {
  test.afterAll(async () => {
    await putTrackingSettings({ metaPixelId: null, ga4MeasurementId: null, gtmContainerId: null })
  })

  test('admin saves, edits and clears tracking IDs with validation', async ({ page }) => {
    const admin = new AdminPage(page)
    await admin.login()
    await gotoHydrated(page, '/admin/settings')
    await expect(page.getByTestId('admin-settings')).toBeVisible()

    // invalid GA4 ID → inline error, save blocked
    await page.getByTestId('tracking-ga4MeasurementId').locator('input').fill('not-a-ga4-id')
    await expect(page.getByText('Ungültiges Format — GA4 Measurement ID erwartet', { exact: false })).toBeVisible()
    await expect(page.getByTestId('tracking-save')).toBeDisabled()

    // valid IDs → double-tracking hint (GA4 + GTM), save succeeds
    await page.getByTestId('tracking-ga4MeasurementId').locator('input').fill(GA_ID)
    await page.getByTestId('tracking-gtmContainerId').locator('input').fill(GTM_ID)
    await page.getByTestId('tracking-metaPixelId').locator('input').fill(PIXEL_ID)
    await expect(page.getByTestId('double-tracking-warning')).toBeVisible()
    await page.getByTestId('tracking-save').click()
    await expect(page.getByTestId('toast').getByText('Tracking-Einstellungen gespeichert')).toBeVisible()

    // persisted after reload
    await gotoHydrated(page, '/admin/settings')
    await expect(page.getByTestId('tracking-ga4MeasurementId').locator('input')).toHaveValue(GA_ID)
    await expect(page.getByTestId('tracking-gtmContainerId').locator('input')).toHaveValue(GTM_ID)
    await expect(page.getByTestId('tracking-metaPixelId').locator('input')).toHaveValue(PIXEL_ID)

    // clearing GTM removes the double-tracking hint and persists as empty
    await page.getByTestId('tracking-gtmContainerId-clear').click()
    await expect(page.getByTestId('double-tracking-warning')).toBeHidden()
    await page.getByTestId('tracking-save').click()
    await expect(page.getByTestId('toast').getByText('Tracking-Einstellungen gespeichert')).toBeVisible()
    await gotoHydrated(page, '/admin/settings')
    await expect(page.getByTestId('tracking-gtmContainerId').locator('input')).toHaveValue('')

    // invalid values are rejected server-side too
    const ctx = await adminApiContext()
    const res = await ctx.put('/api/admin/settings/tracking', {
      data: { metaPixelId: 'abc', ga4MeasurementId: null, gtmContainerId: null },
    })
    expect(res.status()).toBe(400)
    await ctx.dispose()
  })

  test('no trackers before consent; accept-all loads all configured providers', async ({ page }) => {
    await putTrackingSettings({ metaPixelId: PIXEL_ID, ga4MeasurementId: GA_ID, gtmContainerId: GTM_ID })
    const requests = await stubTrackers(page)

    await gotoHydrated(page, '/')
    await expect(page.getByTestId('consent-banner')).toBeVisible()
    expect(requests).toEqual([])

    await page.getByTestId('consent-accept').click()
    // GA4 (gtag.js), GTM (gtm.js) and Meta Pixel (fbevents.js) all load
    await expect.poll(() => requests.some((u) => u.includes(`gtag/js?id=${GA_ID}`))).toBe(true)
    await expect.poll(() => requests.some((u) => u.includes(`gtm.js?id=${GTM_ID}`))).toBe(true)
    await expect.poll(() => requests.some((u) => u.includes('fbevents.js'))).toBe(true)
  })

  test('statistics-only consent loads GA4 but neither GTM nor Meta Pixel', async ({ page }) => {
    await putTrackingSettings({ metaPixelId: PIXEL_ID, ga4MeasurementId: GA_ID, gtmContainerId: GTM_ID })
    const requests = await stubTrackers(page)

    await gotoHydrated(page, '/')
    await page.getByTestId('consent-settings').click()
    await page.getByTestId('consent-statistics').check()
    await page.getByTestId('consent-save').click()

    await expect.poll(() => requests.some((u) => u.includes(`gtag/js?id=${GA_ID}`))).toBe(true)
    // GTM requires statistics AND marketing; the pixel requires marketing
    expect(requests.some((u) => u.includes('gtm.js'))).toBe(false)
    expect(requests.some((u) => u.includes('facebook'))).toBe(false)
  })

  test('stored consent initializes on revisit; one pageview per navigation; revoke stops tracking', async ({
    page,
  }) => {
    await putTrackingSettings({ metaPixelId: PIXEL_ID, ga4MeasurementId: GA_ID, gtmContainerId: GTM_ID })
    const requests = await stubTrackers(page)

    await gotoHydrated(page, '/')
    await page.getByTestId('consent-accept').click()
    await expect.poll(() => pixelPageViews(page)).toBe(1)

    // revisit with stored consent: no banner, trackers initialize immediately
    requests.length = 0
    await gotoHydrated(page, '/')
    await expect(page.getByTestId('consent-banner')).toBeHidden()
    await expect.poll(() => requests.some((u) => u.includes('fbevents.js'))).toBe(true)
    await expect.poll(() => pixelPageViews(page)).toBe(1)

    // SPA route change → exactly one additional pageview
    await page.getByTestId('cart-link').click()
    await page.waitForURL(/\/cart/)
    await expect.poll(() => pixelPageViews(page)).toBe(2)

    // revoke via footer settings → no further tracking on navigation
    await page.getByTestId('open-consent-settings').click()
    await page.getByTestId('consent-statistics').uncheck()
    await page.getByTestId('consent-marketing').uncheck()
    await page.getByTestId('consent-save').click()

    await page.goBack()
    await page.waitForURL((url) => !url.pathname.includes('/cart'))
    // pixel got no further PageView after consent withdrawal
    expect(await pixelPageViews(page)).toBe(2)
  })
})
