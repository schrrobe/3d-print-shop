<script setup lang="ts">
const { t } = useI18n()
const localePath = useLocalePath()
const document = useLegalDocument('withdrawal')

useSeo({
  title: () => t('legal.withdrawalTitle'),
  description: () => t('seo.legal.description'),
})
</script>

<template>
  <LegalLocalizedDocument
    v-if="document"
    :title="t('legal.withdrawalTitle')"
    :document="document"
    data-testid="legal-withdrawal"
  >
    <NuxtLink class="kb-btn kb-btn-ink" :to="localePath('/withdraw')" data-testid="withdrawal-cta">
      {{ t('withdraw.cta') }}
    </NuxtLink>
  </LegalLocalizedDocument>
</template>
