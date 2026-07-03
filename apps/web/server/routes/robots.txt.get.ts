export default defineEventHandler((event) => {
  const siteUrl = useRuntimeConfig().public.siteUrl.replace(/\/$/, '')
  setHeader(event, 'content-type', 'text/plain; charset=utf-8')
  // Locale-prefixed variants (/en/cart …) are matched by the same path segments
  const disallow = ['/admin', '/checkout', '/cart', '/order/', '/quote/', '/support/ticket/']
  return [
    'User-agent: *',
    ...disallow.map((p) => `Disallow: ${p}`),
    ...disallow.map((p) => `Disallow: /*${p}`),
    '',
    `Sitemap: ${siteUrl}/sitemap.xml`,
    '',
  ].join('\n')
})
