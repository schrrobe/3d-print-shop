<script setup lang="ts">
import { PsDialog } from '@print-shop/ui'

// Shop-opening promo. Switched on via NUXT_PUBLIC_PROMO_BANNER=true (web.env), no rebuild.
// The "first 20 orders" limit lives on the OPEN10 voucher (maxRedemptions), not here.
const CODE = 'OPEN10'
const SEEN_KEY = 'kb-promo-open10-seen'

const { t } = useI18n()
const route = useRoute()
const routeBaseName = useRouteBaseName()
const consent = useConsentStore()
const enabled = useRuntimeConfig().public.promoBanner
const open = ref(false)
const copied = ref(false)

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

// First product page visit, and only once the consent banner is gone so two overlays never stack.
watch(
  () => consent.hydrated && !consent.bannerVisible && routeBaseName(route) === 'products-slug',
  (ready) => {
    if (ready && enabled && !seen()) show()
  },
  { immediate: true },
)

async function copyCode() {
  try {
    await navigator.clipboard.writeText(CODE)
    copied.value = true
    setTimeout(() => (copied.value = false), 2000)
  } catch {
    // clipboard blocked: code stays selectable (select-all) for manual copy
  }
}
</script>

<template>
  <PsDialog v-model:open="open" :title="t('shop.promo.title')">
    <div class="flex flex-col gap-4" data-testid="promo-banner">
      <p class="text-ink-2">{{ t('shop.promo.text', { count: 20, percent: 10 }) }}</p>
      <button
        type="button"
        class="flex cursor-pointer flex-col items-center gap-1 border-2 border-dashed border-ink py-3 hover:bg-paper"
        :aria-label="`${t('shop.promo.copy')}: ${CODE}`"
        data-testid="promo-copy"
        @click="copyCode"
      >
        <span class="text-sm text-ink-2" aria-live="polite">
          {{ copied ? t('shop.promo.copied') : t('shop.promo.codeLabel') }}
        </span>
        <span class="flex items-center gap-2">
          <span class="select-all font-mono text-2xl font-bold tracking-widest">{{ CODE }}</span>
          <ShopIcon :name="copied ? 'check' : 'copy'" :size="22" />
        </span>
      </button>
      <button type="button" class="kb-btn kb-btn-ink" @click="open = false">
        {{ t('shop.promo.cta') }}
      </button>
    </div>
  </PsDialog>
</template>
