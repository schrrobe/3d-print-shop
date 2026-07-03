<script setup lang="ts">
const config = useRuntimeConfig()
const siteUrl = config.public.siteUrl.replace(/\/$/, '')
const { locale } = useI18n()

// Canonical + hreflang alternates + og:locale for all 6 locales (needs i18n.baseUrl)
const i18nHead = useLocaleHead({ seo: true })

useHead({
  // short code ('en'), not the regional variant from useLocaleHead ('en-US')
  htmlAttrs: { lang: locale },
  titleTemplate: (title) => (title ? `${title} · 3D Print Shop` : '3D Print Shop'),
  link: () => i18nHead.value.link ?? [],
  meta: () => i18nHead.value.meta ?? [],
  script: [
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': 'Organization',
            name: '3D Print Shop',
            url: siteUrl,
            logo: `${siteUrl}/og-default.png`,
          },
          {
            '@type': 'WebSite',
            name: '3D Print Shop',
            url: siteUrl,
            inLanguage: ['de', 'en', 'pl', 'fr', 'nl', 'cs'],
          },
        ],
      }),
    },
  ],
})

// Hydration marker — e2e tests wait for this before interacting with forms
onMounted(() => {
  document.documentElement.dataset.hydrated = 'true'
})
</script>

<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>
