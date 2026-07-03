const LOCALES = ['de', 'en', 'pl', 'fr', 'nl', 'cs']
const STATIC_PATHS = ['', '/products', '/upload', '/support', '/legal/imprint', '/legal/privacy', '/legal/terms']

/** Locale-prefixed URL (strategy prefix_except_default: de has no prefix). */
function localizedUrl(siteUrl: string, locale: string, path: string): string {
  const prefix = locale === 'de' ? '' : `/${locale}`
  return `${siteUrl}${prefix}${path}` || siteUrl
}

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const siteUrl = config.public.siteUrl.replace(/\/$/, '')

  let slugs: string[] = []
  try {
    const { products } = await $fetch<{ products: { slug: string }[] }>(
      `${config.apiOrigin}/api/products`,
    )
    slugs = products.map((p) => p.slug)
  } catch {
    // API down: still serve the static pages instead of a 500
  }

  const paths = [...STATIC_PATHS, ...slugs.map((slug) => `/products/${slug}`)]
  const entries = paths.flatMap((path) =>
    LOCALES.map((locale) => {
      const loc = localizedUrl(siteUrl, locale, path)
      const alternates = LOCALES.map(
        (l) =>
          `<xhtml:link rel="alternate" hreflang="${l}" href="${localizedUrl(siteUrl, l, path)}"/>`,
      ).join('')
      return `<url><loc>${loc}</loc>${alternates}</url>`
    }),
  )

  setHeader(event, 'content-type', 'application/xml; charset=utf-8')
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${entries.join('\n')}
</urlset>
`
})
