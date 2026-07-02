<script setup lang="ts">
import { PsSection } from '@print-shop/ui'

const { t } = useI18n()
</script>

<template>
  <PsSection :title="t('legal.termsTitle')">
    <div class="max-w-[42rem] text-body-regular text-secondary" data-testid="legal-terms">
      <p>{{ t('legal.placeholder') }}</p>
    </div>
  </PsSection>
</template>
