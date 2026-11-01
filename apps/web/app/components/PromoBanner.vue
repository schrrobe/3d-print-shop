<script setup lang="ts">
import { PsDialog } from '@print-shop/ui'

// Shop-opening promo. Switched on via NUXT_PUBLIC_PROMO_BANNER=true (web.env), no rebuild.
// The "first 20 orders" limit lives on the OPEN10 voucher (maxRedemptions), not here.
const CODE = 'OPEN10'
const SEEN_KEY = 'kb-promo-open10-seen'

const { t } = useI18n()
const consent = useConsentStore()
const enabled = useRuntimeConfig().public.promoBanner
const open = ref(false)
let timer: ReturnType<typeof setTimeout> | undefined

function seen() {
  try {
    return localStorage.getItem(SEEN_KEY) !== null
  } catch {
    return false
  }
}

function show() {
  open.value = true
  try {
    localStorage.setItem(SEEN_KEY, '1')
  } catch {
    // private mode: banner may show again next visit, harmless
  }
}

// Start the 5 s only once the consent banner is gone, so two overlays never stack.
watch(
  () => consent.hydrated && !consent.bannerVisible,
  (ready) => {
    if (ready && enabled && !seen()) timer = setTimeout(show, 5000)
  },
  { immediate: true },
)
onBeforeUnmount(() => clearTimeout(timer))
</script>

<template>
  <PsDialog v-model:open="open" :title="t('shop.promo.title')">
    <div class="flex flex-col gap-4" data-testid="promo-banner">
      <p class="text-ink-2">{{ t('shop.promo.text', { count: 20, percent: 10 }) }}</p>
      <p class="flex flex-col items-center gap-1 border-2 border-dashed border-ink py-3">
        <span class="text-sm text-ink-2">{{ t('shop.promo.codeLabel') }}</span>
        <span class="select-all font-mono text-2xl font-bold tracking-widest">{{ CODE }}</span>
      </p>
      <button type="button" class="kb-btn kb-btn-ink" @click="open = false">
        {{ t('shop.promo.cta') }}
      </button>
    </div>
  </PsDialog>
</template>
