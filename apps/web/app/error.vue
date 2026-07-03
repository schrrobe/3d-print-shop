<script setup lang="ts">
import type { NuxtError } from '#app'
import { PsPillButton } from '@print-shop/ui'

const props = defineProps<{ error: NuxtError }>()

const { t } = useI18n()
const localePath = useLocalePath()

const isNotFound = computed(() => props.error.statusCode === 404)
const title = computed(() => (isNotFound.value ? t('seo.error.notFound') : t('seo.error.generic')))

useHead({
  title,
  meta: [{ name: 'robots', content: 'noindex' }],
})

function goHome() {
  clearError({ redirect: localePath('/') })
}
</script>

<template>
  <div class="flex min-h-screen flex-col items-center justify-center gap-lg bg-surface px-md text-center">
    <p class="text-display-large text-brand">{{ error.statusCode }}</p>
    <h1 class="text-heading-large text-primary" data-testid="error-title">{{ title }}</h1>
    <p v-if="isNotFound" class="max-w-[32rem] text-body-regular text-secondary">
      {{ t('seo.error.notFoundText') }}
    </p>
    <PsPillButton data-testid="error-home" @click="goHome">{{ t('seo.error.back') }}</PsPillButton>
  </div>
</template>
