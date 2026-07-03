import { expect, test } from '@playwright/test'
import { apiContext } from '../helpers/api.js'
import { gotoHydrated } from '../helpers/hydration.js'

test.describe('advanced product configurator', () => {
  test('save + share a configuration is deduplicated to a stable token', async () => {
    const ctx = await apiContext()
    const product = (await (await ctx.get('/api/products/spiral-vase')).json()) as {
      product: { id: string; colorSlots: { slot: string }[] }
    }
    const colors = (await (await ctx.get('/api/colors')).json()) as {
      colors: { id: string; active: boolean; outOfStock?: boolean }[]
    }
    const slot = product.product.colorSlots[0]!.slot
    const color = colors.colors.find((c) => c.active && !c.outOfStock)!
    const selectedColors = { [slot]: color.id }

    const first = await ctx.post('/api/configurations', {
      data: { productId: product.product.id, selectedColors },
    })
    expect([200, 201]).toContain(first.status())
    const a = (await first.json()) as { shareToken: string }

    const second = await ctx.post('/api/configurations', {
      data: { productId: product.product.id, selectedColors },
    })
    const b = (await second.json()) as { shareToken: string }
    expect(b.shareToken).toBe(a.shareToken)
    await ctx.dispose()
  })

  test('shared configuration reports per-zone availability', async () => {
    const ctx = await apiContext()
    // seed-config-vase-2 references an unavailable colour
    const res = await ctx.get('/api/configurations/seed-config-vase-2')
    expect(res.ok()).toBe(true)
    const config = (await res.json()) as { availability: Record<string, string> }
    expect(Object.values(config.availability).some((s) => s !== 'ok')).toBe(true)
    await ctx.dispose()
  })

  test('loading a shared config with an unavailable colour warns the user', async ({ page }) => {
    await gotoHydrated(page, '/products/spiral-vase?config=seed-config-vase-2')
    await expect(page.getByTestId('config-warning').first()).toBeVisible({ timeout: 10_000 })
  })

  test('a valid shared config loads without a warning', async ({ page }) => {
    await gotoHydrated(page, '/products/spiral-vase?config=seed-config-vase-1')
    await expect(page.getByTestId('product-detail')).toBeVisible()
    await expect(page.getByTestId('config-warning')).toHaveCount(0)
  })

  test('cart line can be edited via the configurator', async ({ page }) => {
    await gotoHydrated(page, '/products/spiral-vase')
    await page.getByTestId('add-to-cart').click()
    await gotoHydrated(page, '/cart')
    await expect(page.getByTestId('cart-item').first()).toBeVisible()
    await page.getByTestId('cart-edit').first().click()
    await page.waitForURL(/\/products\/spiral-vase\?edit=/)
    await expect(page.getByTestId('add-to-cart')).toContainText('Änderungen', { ignoreCase: true })
    await page.getByTestId('add-to-cart').click()
    await page.waitForURL(/\/cart/)
    await expect(page.getByTestId('cart-item').first()).toBeVisible()
  })
})
