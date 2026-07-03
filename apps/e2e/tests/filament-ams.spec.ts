import { expect, test } from '@playwright/test'
import { AdminPage } from '../pages/admin.js'
import { adminApiContext, apiContext } from '../helpers/api.js'
import { gotoHydrated } from '../helpers/hydration.js'

test.describe('filament & AMS', () => {
  test('spool CRUD via the API', async () => {
    const admin = await adminApiContext()
    const created = await admin.post('/api/admin/filament/spools', {
      data: { material: 'PETG', manufacturer: 'Prusa', label: 'E2E Spool', totalGrams: 1000, remainingGrams: 1000, minRemainingGrams: 200 },
    })
    expect(created.status()).toBe(201)
    const { spool } = (await created.json()) as { spool: { id: string } }

    const list = (await (await admin.get('/api/admin/filament/spools')).json()) as {
      spools: { id: string; label: string | null }[]
    }
    expect(list.spools.some((s) => s.id === spool.id)).toBe(true)

    const deleted = await admin.delete(`/api/admin/filament/spools/${spool.id}`)
    expect(deleted.ok()).toBe(true)
    await admin.dispose()
  })

  test('low-stock alerts and shopping list reflect the seed', async () => {
    const admin = await adminApiContext()
    const alerts = (await (await admin.get('/api/admin/filament/alerts')).json()) as {
      lowSpools: unknown[]
      lowColors: unknown[]
    }
    expect(alerts.lowSpools.length + alerts.lowColors.length).toBeGreaterThan(0)

    const shopping = (await (await admin.get('/api/admin/filament/shopping-list')).json()) as {
      shoppingList: unknown[]
    }
    expect(shopping.shoppingList.length).toBeGreaterThan(0)
    await admin.dispose()
  })

  test('marking a color out of stock is reflected in the shop', async () => {
    const admin = await adminApiContext()
    const ctx = await apiContext()
    const colors = (await (await admin.get('/api/admin/colors')).json()) as {
      colors: { id: string; name: string }[]
    }
    const target = colors.colors.find((c) => c.name === 'Warm White') ?? colors.colors[0]!
    await admin.post(`/api/admin/filament/colors/${target.id}/availability`, {
      data: { outOfStock: true },
    })

    const shopColors = (await (await ctx.get('/api/colors')).json()) as {
      colors: { id: string; outOfStock?: boolean }[]
    }
    const shown = shopColors.colors.find((c) => c.id === target.id)
    expect(shown?.outOfStock).toBe(true)
    await admin.dispose()
    await ctx.dispose()
  })

  test('a spool cannot occupy two AMS slots', async () => {
    const admin = await adminApiContext()
    const units = (await (await admin.get('/api/admin/filament/ams-units')).json()) as {
      units: { slots: { id: string }[] }[]
    }
    const slots = units.units[0]?.slots ?? []
    expect(slots.length).toBeGreaterThanOrEqual(2)

    const created = await admin.post('/api/admin/filament/spools', {
      data: { material: 'PLA', label: 'Slot E2E', remainingGrams: 500 },
    })
    const { spool } = (await created.json()) as { spool: { id: string } }

    const first = await admin.patch(`/api/admin/filament/ams-slots/${slots[0]!.id}`, {
      data: { spoolId: spool.id },
    })
    expect(first.ok()).toBe(true)
    const second = await admin.patch(`/api/admin/filament/ams-slots/${slots[1]!.id}`, {
      data: { spoolId: spool.id },
    })
    expect(second.status()).toBe(409)

    // Clean up: unload and delete
    await admin.patch(`/api/admin/filament/ams-slots/${slots[0]!.id}`, { data: { spoolId: null } })
    await admin.delete(`/api/admin/filament/spools/${spool.id}`)
    await admin.dispose()
  })

  test('admin filament page renders with tabs and create dialog', async ({ page }) => {
    const admin = new AdminPage(page)
    await admin.login()
    await gotoHydrated(page, '/admin/filament')
    await expect(page.getByTestId('admin-filament')).toBeVisible()
    await page.getByTestId('spool-create').click()
    await page.locator('input[name="material"]').fill('TPU')
    await page.getByTestId('spool-form-save').click()
    await page.getByTestId('filament-tab-einkaufsliste').click()
    await expect(page.getByTestId('admin-filament')).toBeVisible()
  })
})
