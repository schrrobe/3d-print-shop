import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import { gotoHydrated } from '../helpers/hydration.js'

/** WCAG A/AA scans on the core shop pages (design system targets AA). */
async function scan(page: Page) {
  return new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa'])
    // 3D canvas has no text alternative concept in axe
    .exclude('[data-testid="model-viewer"]')
    .analyze()
}

test.describe('accessibility (axe, wcag aa)', () => {
  for (const route of ['/', '/products', '/products/spiral-vase', '/cart', '/upload']) {
    test(`no serious/critical violations on ${route}`, async ({ page }) => {
      await gotoHydrated(page, route)
      // settle consent banner into the scan too — it must be accessible itself
      const results = await scan(page)
      const severe = results.violations.filter((v) =>
        ['serious', 'critical'].includes(v.impact ?? ''),
      )
      expect(
        severe.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(', ')}`),
      ).toEqual([])
    })
  }

  test('checkout form fields have labels', async ({ page }) => {
    await gotoHydrated(page, '/checkout')
    const results = await scan(page)
    expect(results.violations.map((v) => v.id)).not.toContain('label')
  })
})
