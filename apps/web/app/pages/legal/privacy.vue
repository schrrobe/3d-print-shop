<script setup lang="ts">
import { PsSection } from '@print-shop/ui'

const { t } = useI18n()

useSeo({
  title: () => t('seo.legal.privacy'),
  description: () => t('seo.legal.description'),
})
</script>

<template>
  <PsSection :title="t('legal.privacyTitle')" heading-level="h1">
    <div class="max-w-[42rem] text-body-regular text-secondary" data-testid="legal-privacy">
      <p>{{ t('legal.placeholder') }}</p>
      <p class="mt-lg">{{ t('consent.text') }}</p>
    </div>
  </PsSection>
</template>
