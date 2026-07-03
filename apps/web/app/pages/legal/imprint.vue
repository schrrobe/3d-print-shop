<script setup lang="ts">
import { PsSection } from '@print-shop/ui'

const { t } = useI18n()

useSeo({
  title: () => t('seo.legal.imprint'),
  description: () => t('seo.legal.description'),
})
</script>

<template>
  <PsSection :title="t('legal.imprintTitle')" heading-level="h1">
    <div class="max-w-[42rem] text-body-regular text-secondary" data-testid="legal-imprint">
      <p>{{ t('legal.placeholder') }}</p>
      <p class="mt-lg">Print Shop GmbH · Musterstraße 1 · 12345 Berlin</p>
    </div>
  </PsSection>
</template>
