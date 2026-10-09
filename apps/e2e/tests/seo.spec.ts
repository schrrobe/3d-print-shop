import { expect, test, type APIRequestContext } from '@playwright/test'

/**
 * SEO surface: SSR head tags, robots.txt, sitemap, noindex and the 404 page.
 * Checks the raw server response (what crawlers see), not the hydrated DOM.
 */

async function ssrHead(request: APIRequestContext, path: string) {
  const response = await request.get(path, { headers: { accept: 'text/html' } })
  return { status: response.status(), html: await response.text() }
}

test.describe('seo & social previews', () => {
  test('landing page has full og/twitter/canonical/hreflang set', async ({ request }) => {
    const { html } = await ssrHead(request, '/')
    expect(html).toContain('property="og:title"')
    expect(html).toContain('property="og:description"')
    expect(html).toContain('property="og:image" content="http://localhost:3000/og-default.png"')
    expect(html).toContain('property="og:image:width" content="1200"')
    expect(html).toContain('name="twitter:card" content="summary_large_image"')
    expect(html).toContain('rel="canonical"')
    expect(html).toContain('hreflang="x-default"')
    expect(html).toContain('hreflang="cs"')
    expect(html).toMatch(/<title>kaliberbox\.de — [^<]+<\/title>/)
    expect(html).toContain('application/ld+json')
  })

  test('product page has product og:type, db seo title and Product JSON-LD', async ({
    request,
  }) => {
    const { html } = await ssrHead(request, '/products/patronenbox-9mm-luger-50')
    expect(html).toContain('property="og:type" content="product"')
    expect(html).toContain('<title>Patronenbox 9 mm Luger – 50 Schuss — 3D-Druck</title>')
    expect(html).toContain('"@type":"Product"')
    expect(html).toContain('"priceCurrency":"EUR"')
    expect(html).toContain('data-testid="product-breadcrumbs"')
    expect(html).toContain('"@type":"BreadcrumbList"')
    expect(html).toContain('"item":"http://localhost:3000/products/patronenbox-9mm-luger-50"')
    expect(html).toContain('"image":["http://localhost:3000/images/products/kaliberbox-50.svg"')
    // SVG product images must not leak into og:image (crawlers cannot render them)
    expect(html).not.toMatch(/og:image" content="[^"]*\.svg/)
    // english variant carries its own translation and locale
    const en = await ssrHead(request, '/en/products/patronenbox-9mm-luger-50')
    expect(en.html).toContain('property="og:locale" content="en_US"')
  })

  test('static pages have unique titles and descriptions', async ({ request }) => {
    const cart = await ssrHead(request, '/cart')
    expect(cart.html).toContain('<title>Warenkorb · kaliberbox.de</title>')
    const products = await ssrHead(request, '/products')
    expect(products.html).toMatch(/<title>Patronenboxen · kaliberbox\.de<\/title>/)
    expect(products.html).not.toContain('<title>Warenkorb')
    expect(cart.html).toContain('name="description" content="Dein Warenkorb')
  })

  test('robots.txt disallows private areas and links the sitemap', async ({ request }) => {
    const response = await request.get('/robots.txt')
    expect(response.status()).toBe(200)
    const body = await response.text()
    expect(body).toContain('Disallow: /admin')
    expect(body).toContain('Disallow: /support/ticket/')
    expect(body).toContain('Sitemap: http://localhost:3000/sitemap.xml')
  })

  test('sitemap.xml lists products in all six locales', async ({ request }) => {
    const response = await request.get('/sitemap.xml')
    expect(response.status()).toBe(200)
    expect(response.headers()['content-type']).toContain('xml')
    const body = await response.text()
    expect(body).toContain('<loc>http://localhost:3000/products/patronenbox-9mm-luger-50</loc>')
    expect(body).toContain('<loc>http://localhost:3000/cs/products/patronenbox-9mm-luger-50</loc>')
    expect(body).toContain('hreflang="pl"')
    expect(body).not.toContain('/checkout')
  })

  test('admin, checkout and token pages are noindex', async ({ request }) => {
    for (const path of [
      '/admin',
      '/checkout',
      '/order/some-number',
      '/support/ticket/some-token',
    ]) {
      const { html } = await ssrHead(request, path)
      expect(html, path).toContain('name="robots" content="noindex')
    }
  })

  test('unknown product renders the branded 404 page', async ({ page }) => {
    const response = await page.goto('/products/does-not-exist')
    expect(response?.status()).toBe(404)
    await expect(page.getByTestId('error-title')).toHaveText('Seite nicht gefunden')
    await expect(page.getByTestId('error-home')).toBeVisible()
  })
})
