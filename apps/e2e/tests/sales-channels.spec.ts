import { expect, test, type APIRequestContext, type Page } from '@playwright/test'
import { adminApiContext, apiContext } from '../helpers/api.js'
import { gotoHydrated } from '../helpers/hydration.js'
import { AdminPage } from '../pages/admin.js'
import { ShopPage } from '../pages/shop.js'

/**
 * Sales channels (influencer links). The 9 mm box costs 14,90 €; seed voucher
 * TEST10 = 10 %. Codes carry a run suffix so reruns never collide.
 */
const SLUG = 'patronenbox-9mm-luger-50'
const run = Date.now().toString(36)

interface ChannelStats {
  id: string
  code: string
  clicks: number
  orders: number
  revenueCents: number
  commissionCents: number
}

async function productId(slug: string): Promise<string> {
  const ctx = await apiContext()
  const { products } = (await (await ctx.get('/api/products')).json()) as {
    products: { id: string; slug: string }[]
  }
  await ctx.dispose()
  const product = products.find((p) => p.slug === slug)
  if (!product) throw new Error(`product ${slug} not seeded`)
  return product.id
}

async function createChannel(admin: APIRequestContext, data: Record<string, unknown>) {
  const res = await admin.post('/api/admin/sales-channels', {
    data: { commissionType: 'percent', commissionValue: 1000, ...data },
  })
  expect(res.status()).toBe(201)
  return ((await res.json()) as { channel: { id: string; code: string; url: string } }).channel
}

async function stats(code: string): Promise<ChannelStats> {
  const admin = await adminApiContext()
  const res = await admin.get('/api/admin/sales-channels', {
    params: { from: '1970-01-01T00:00:00.000Z', to: '2100-01-01T00:00:00.000Z' },
  })
  expect(res.ok()).toBe(true)
  const { channels } = (await res.json()) as { channels: ChannelStats[] }
  await admin.dispose()
  const channel = channels.find((c) => c.code === code)
  if (!channel) throw new Error(`channel ${code} missing`)
  return channel
}

/** Cart → Stripe (mock) checkout → simulate payment, so the order counts as revenue. */
async function payCartWithStripe(page: Page, email: string): Promise<void> {
  const shop = new ShopPage(page)
  await shop.gotoCheckout()
  await shop.fillCheckoutAddress(email)
  await page.getByTestId('payment-stripe').click()
  await page.getByTestId('submit-order').click()
  await page.waitForURL(/\/checkout\/success/)
  await page.waitForSelector('html[data-hydrated="true"]')
  await page.getByTestId('simulate-payment').click()
  await expect(page.getByTestId('simulate-payment')).toBeHidden()
}

test.describe('sales channels', () => {
  test('admin creates a channel in the UI; the link counts a click and sets the ref cookie', async ({
    page,
  }) => {
    const code = `anna-${run}`
    await new AdminPage(page).login()
    await gotoHydrated(page, '/admin/sales-channels')
    await page.getByTestId('new-channel').click()
    await page.getByTestId('channel-name').locator('input').fill('Anna – Instagram')
    await page.getByTestId('channel-code').locator('input').fill(code)
    await page.getByTestId('channel-product').selectOption({ index: 1 })
    await page.getByTestId('channel-commission').locator('input').fill('10')
    await page.getByTestId('save-channel').click()

    const row = page.locator('tr', { hasText: code })
    await expect(row.getByTestId('channel-url')).toContainText(`/r/${code}`)
    await expect(row).toContainText('10 %')

    await page.goto(`/r/${code}`)
    await page.waitForURL(/\/products\//)
    const ref = (await page.context().cookies()).find((c) => c.name === 'ps_ref')
    expect(ref?.value).toMatch(new RegExp(`^${code}\\.\\d+$`))
    expect(ref?.httpOnly).toBe(true)
    // A second visit with the cookie already set is not a new click.
    await page.goto(`/r/${code}`)
    await page.waitForURL(/\/products\//)

    await gotoHydrated(page, '/admin/sales-channels')
    await expect(page.locator('tr', { hasText: code }).getByTestId('channel-clicks')).toHaveText(
      '1',
    )
  })

  test('a paid order after a link click is attributed with frozen commission', async ({ page }) => {
    const admin = await adminApiContext()
    const channel = await createChannel(admin, {
      code: `ben-${run}`,
      name: 'Ben – YouTube',
      productId: await productId(SLUG),
    })
    await admin.dispose()

    await page.goto(`/r/${channel.code}`)
    await page.waitForURL(new RegExp(`/products/${SLUG}`))
    await page.waitForSelector('html[data-hydrated="true"]')
    const shop = new ShopPage(page)
    await shop.acceptConsent()
    await page.getByTestId('add-to-cart').click()
    await payCartWithStripe(page, `channel-cookie-${run}@example.com`)

    // 10 % of 14,90 € goods (shipping excluded) = 1,49 €
    const s = await stats(channel.code)
    expect(s).toMatchObject({ clicks: 1, orders: 1, revenueCents: 1490, commissionCents: 149 })

    await new AdminPage(page).login()
    await gotoHydrated(page, '/admin/sales-channels')
    await page.getByTestId('channel-period').selectOption('all')
    const row = page.locator('tr', { hasText: channel.code })
    await expect(row.getByTestId('channel-orders')).toHaveText('1')
    await expect(row.getByTestId('channel-revenue')).toContainText('14,90')
    await expect(row.getByTestId('channel-commission-amount')).toContainText('1,49')
    await expect(row.getByTestId('channel-share')).toContainText('%')
    await expect(page.getByTestId('channels-share')).toContainText('%')
  })

  test('the channel voucher beats another channel’s link cookie', async ({ page }) => {
    const admin = await adminApiContext()
    const voucherCode = `CARLA${run}`.toUpperCase()
    const voucherRes = await admin.post('/api/admin/vouchers', {
      data: { code: voucherCode, type: 'percent', value: 10, active: true },
    })
    expect(voucherRes.ok()).toBe(true)
    const { voucher } = (await voucherRes.json()) as { voucher: { id: string } }
    const viaVoucher = await createChannel(admin, {
      code: `carla-${run}`,
      name: 'Carla – TikTok',
      voucherId: voucher.id,
      commissionType: 'fixed',
      commissionValue: 500,
    })
    const viaCookie = await createChannel(admin, { code: `dora-${run}`, name: 'Dora – Blog' })
    await admin.dispose()

    await page.goto(`/r/${viaCookie.code}`)
    await page.waitForURL((url) => url.pathname === '/')
    const shop = new ShopPage(page)
    await shop.addAndGotoCart(SLUG)
    await shop.applyVoucher(voucherCode)
    await expect(page.getByTestId('cart-discount')).toContainText('1,49')
    await payCartWithStripe(page, `channel-voucher-${run}@example.com`)

    // base = 14,90 − 1,49 = 13,41 €; fixed 5 € commission
    expect(await stats(viaVoucher.code)).toMatchObject({
      orders: 1,
      revenueCents: 1341,
      commissionCents: 500,
    })
    expect(await stats(viaCookie.code)).toMatchObject({ clicks: 1, orders: 0 })
  })

  test('the link puts the channel voucher into the cart automatically', async ({ page }) => {
    const admin = await adminApiContext()
    const voucherCode = `EMMA${run}`.toUpperCase()
    const voucherRes = await admin.post('/api/admin/vouchers', {
      data: { code: voucherCode, type: 'percent', value: 10, active: true },
    })
    const { voucher } = (await voucherRes.json()) as { voucher: { id: string } }
    const channel = await createChannel(admin, {
      code: `emma-${run}`,
      name: 'Emma – Instagram',
      productId: await productId(SLUG),
      voucherId: voucher.id,
    })
    await admin.dispose()

    await page.goto(`/r/${channel.code}`)
    await page.waitForURL(new RegExp(`/products/${SLUG}`))
    await page.waitForSelector('html[data-hydrated="true"]')
    await expect(page.getByTestId('toast')).toContainText(voucherCode)
    // The trigger param is removed once the voucher is in the cart.
    await expect(page).not.toHaveURL(/gutschein=/)

    const shop = new ShopPage(page)
    await shop.acceptConsent()
    await page.getByTestId('add-to-cart').click()
    await gotoHydrated(page, '/cart')
    await expect(page.getByTestId('voucher-row')).toContainText(voucherCode)
    await expect(page.getByTestId('cart-discount')).toContainText('1,49')
    await payCartWithStripe(page, `channel-autovoucher-${run}@example.com`)

    expect(await stats(channel.code)).toMatchObject({ clicks: 1, orders: 1, revenueCents: 1341 })
  })

  test('the link skips the voucher when it is no longer redeemable', async () => {
    const admin = await adminApiContext()
    const voucherRes = await admin.post('/api/admin/vouchers', {
      data: { code: `OFF${run}`.toUpperCase(), type: 'percent', value: 10, active: false },
    })
    const { voucher } = (await voucherRes.json()) as { voucher: { id: string } }
    const channel = await createChannel(admin, {
      code: `finn-${run}`,
      name: 'Finn – Blog',
      voucherId: voucher.id,
    })
    await admin.dispose()

    const anon = await apiContext()
    const res = await anon.get(`/api/r/${channel.code}`, { maxRedirects: 0 })
    expect(res.status()).toBe(302)
    expect(res.headers().location).not.toContain('gutschein=')
    // anon now carries the ref cookie, but the inactive voucher is not handed out.
    expect(await (await anon.get('/api/vouchers/referral')).json()).toEqual({ voucher: null })
    await anon.dispose()

    // Without a ref cookie the endpoint never reveals any voucher.
    const fresh = await apiContext()
    expect(await (await fresh.get('/api/vouchers/referral')).json()).toEqual({ voucher: null })
    await fresh.dispose()
  })

  test('unknown codes go home; inactive channels redirect without counting', async ({ page }) => {
    await page.goto('/r/does-not-exist')
    await page.waitForURL((url) => url.pathname === '/')

    const admin = await adminApiContext()
    const inactive = await createChannel(admin, {
      code: `paused-${run}`,
      name: 'Pausiert',
      productId: await productId(SLUG),
      active: false,
    })
    await admin.dispose()

    await page.goto(`/r/${inactive.code}`)
    await page.waitForURL(new RegExp(`/products/${SLUG}`))
    expect((await page.context().cookies()).find((c) => c.name === 'ps_ref')).toBeUndefined()
    expect(await stats(inactive.code)).toMatchObject({ clicks: 0 })
  })

  test('admin API rejects bad input and keeps commission out of order views', async () => {
    const admin = await adminApiContext()
    await createChannel(admin, { code: `dup-${run}`, name: 'Erster' })
    const res = await admin.post('/api/admin/sales-channels', {
      data: {
        code: `dup-${run}`,
        name: 'Zweiter',
        commissionType: 'percent',
        commissionValue: 500,
      },
    })
    expect(res.status()).toBe(409)

    const missing = await admin.post('/api/admin/sales-channels', {
      data: {
        code: `ghost-${run}`,
        name: 'Ohne Produkt',
        productId: 'does-not-exist',
        commissionType: 'percent',
        commissionValue: 500,
      },
    })
    expect(missing.status()).toBe(400)

    // Commission stays admin-only: order views don't leak it.
    const { orders } = (await (await admin.get('/api/admin/orders')).json()) as {
      orders: Record<string, unknown>[]
    }
    expect(orders.length).toBeGreaterThan(0)
    expect(orders[0]).not.toHaveProperty('commissionCents')
    await admin.dispose()
  })
})
