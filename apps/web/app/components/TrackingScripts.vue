<script setup lang="ts">
/**
 * GDPR-gated tracking placeholders.
 * GA4 loads only after statistics consent, Meta Pixel only after marketing
 * consent — and only when the respective env id is configured.
 */
const consent = useConsentStore()
const config = useRuntimeConfig()

const ga4Loaded = ref(false)
const pixelLoaded = ref(false)

watchEffect(() => {
  if (import.meta.server) return

  if (consent.ga4Allowed && config.public.ga4MeasurementId && !ga4Loaded.value) {
    ga4Loaded.value = true
    const script = document.createElement('script')
    script.async = true
    script.src = `https://www.googletagmanager.com/gtag/js?id=${config.public.ga4MeasurementId}`
    script.dataset.tracker = 'ga4'
    document.head.appendChild(script)
    const w = window as typeof window & { dataLayer?: unknown[]; gtag?: (...args: unknown[]) => void }
    w.dataLayer = w.dataLayer ?? []
    w.gtag = (...args: unknown[]) => w.dataLayer!.push(args)
    w.gtag('js', new Date())
    w.gtag('config', config.public.ga4MeasurementId, { anonymize_ip: true })
  }

  if (consent.metaPixelAllowed && config.public.metaPixelId && !pixelLoaded.value) {
    pixelLoaded.value = true
    const script = document.createElement('script')
    script.async = true
    script.src = 'https://connect.facebook.net/en_US/fbevents.js'
    script.dataset.tracker = 'meta-pixel'
    document.head.appendChild(script)
  }
})
</script>

<template>
  <!-- renders nothing — scripts are injected only after consent -->
  <span hidden aria-hidden="true" data-testid="tracking-scripts" :data-ga4="ga4Loaded" :data-pixel="pixelLoaded" />
</template>
