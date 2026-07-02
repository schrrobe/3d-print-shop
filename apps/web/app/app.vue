<script setup lang="ts">
const { locale } = useI18n()
useHead({ htmlAttrs: { lang: locale } })

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
