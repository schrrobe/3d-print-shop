import type { MaybeRefOrGetter } from 'vue'

export interface SeoInput {
  /** Page title without the site suffix (the global titleTemplate appends it). */
  title: MaybeRefOrGetter<string>
  description: MaybeRefOrGetter<string>
  /** Absolute or root-relative image URL; falls back to the default OG image. */
  image?: MaybeRefOrGetter<string | null | undefined>
  /** og:type, defaults to 'website'. */
  type?: 'website' | 'product' | 'article'
  /** Set to skip the global titleTemplate (title is already complete). */
  fullTitle?: boolean
}

/**
 * Central SEO metadata: title, description, Open Graph and Twitter Card tags
 * from one source of truth. Canonical + hreflang come from useLocaleHead in
 * app.vue; og:url is derived from the site URL + current route.
 */
export function useSeo(input: SeoInput) {
  const config = useRuntimeConfig()
  const route = useRoute()
  const { localeProperties } = useI18n()

  const siteUrl = config.public.siteUrl.replace(/\/$/, '')
  const pageUrl = computed(() => `${siteUrl}${route.path}`)
  const ogLocale = computed(() => (localeProperties.value.language ?? 'de-DE').replace('-', '_'))
  const image = computed(() => {
    let value = toValue(input.image) || '/og-default.png'
    // Social crawlers (Facebook, X) do not render SVG previews
    if (value.endsWith('.svg')) value = '/og-default.png'
    return value.startsWith('http') ? value : `${siteUrl}${value}`
  })

  if (input.fullTitle) {
    useHead({ titleTemplate: null, title: () => toValue(input.title) })
  } else {
    useHead({ title: () => toValue(input.title) })
  }

  // og:type via useHead — unhead's ogType union misses the valid 'product' type
  useHead({ meta: [{ property: 'og:type', content: input.type ?? 'website' }] })

  useSeoMeta({
    description: () => toValue(input.description),
    ogTitle: () => toValue(input.title),
    ogDescription: () => toValue(input.description),
    ogUrl: () => pageUrl.value,
    ogImage: () => image.value,
    ogImageWidth: 1200,
    ogImageHeight: 630,
    ogImageAlt: () => toValue(input.title),
    ogSiteName: '3D Print Shop',
    ogLocale: () => ogLocale.value,
    twitterCard: 'summary_large_image',
    twitterTitle: () => toValue(input.title),
    twitterDescription: () => toValue(input.description),
    twitterImage: () => image.value,
    twitterImageAlt: () => toValue(input.title),
  })
}
