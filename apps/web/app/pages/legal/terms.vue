<script setup lang="ts">
const { t } = useI18n()
const document = useLegalDocument('terms')

useSeo({
  title: () => t('seo.legal.terms'),
  description: () => t('seo.legal.description'),
})
</script>

<template>
  <LegalLocalizedDocument
    v-if="document"
    :title="t('legal.termsTitle')"
    :document="document"
    data-testid="legal-terms"
  />
</template>
