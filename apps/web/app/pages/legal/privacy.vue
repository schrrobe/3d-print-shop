<script setup lang="ts">
import { PsSection } from '@print-shop/ui'

const { t } = useI18n()
</script>

<template>
  <PsSection :title="t('legal.privacyTitle')">
    <div class="max-w-2xl text-body-regular text-secondary" data-testid="legal-privacy">
      <p>{{ t('legal.placeholder') }}</p>
      <p class="mt-lg">{{ t('consent.text') }}</p>
    </div>
  </PsSection>
</template>
