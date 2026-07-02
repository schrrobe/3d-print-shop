import type { Page } from '@playwright/test'

/**
 * Nuxt sets data-hydrated="true" on <html> once the client app has mounted
 * (see apps/web/app/app.vue). Interacting with SSR-rendered forms before that
 * point loses input events — always navigate via this helper in tests.
 */
export async function gotoHydrated(page: Page, path: string): Promise<void> {
  await page.goto(path)
  await page.waitForSelector('html[data-hydrated="true"]', { timeout: 30_000 })
}
