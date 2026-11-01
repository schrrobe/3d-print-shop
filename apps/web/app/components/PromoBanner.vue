<script setup lang="ts">
import { PsDialog } from '@print-shop/ui'
import type { PromoBannerInput } from '@print-shop/validators'

// Promo modal, managed in admin (Einstellungen → Promo-Banner). The API returns null when it is
// switched off or its voucher can no longer be redeemed (e.g. all 20 uses gone).
type Banner = Omit<PromoBannerInput, 'enabled'>
const SEEN_KEY = 'kb-promo-seen'

const { t, locale } = useI18n()
const route = useRoute()
const routeBaseName = useRouteBaseName()
const consent = useConsentStore()
const banner = ref<Banner | null>(null)
const open = ref(false)
const copied = ref(false)
let fetched = false

// Empty fields in the visitor's language fall back to German.
const text = computed(() => {
  const de = banner.value?.content.de
  const own = banner.value?.content[locale.value as keyof Banner['content']]
  return {
    title: own?.title || de?.title || '',
    text: own?.text || de?.text || '',
    cta: own?.cta || de?.cta || '',
  }
})

// A new campaign (other code or headline) shows again for visitors who saw the last one.
const campaignId = (b: Banner) => `${b.code ?? ''}|${b.content.de?.title ?? ''}`

function seenCampaign() {
  try {
    return localStorage.getItem(SEEN_KEY)
  } catch {
    return null
  }
}

async function maybeShow() {
  if (fetched) return
  fetched = true
  const res = await $fetch<{ banner: Banner | null }>('/api/promo-banner').catch(() => null)
  if (!res?.banner || seenCampaign() === campaignId(res.banner)) return
  banner.value = res.banner
  open.value = true
  try {
    localStorage.setItem(SEEN_KEY, campaignId(res.banner))
  } catch {
    // private mode: banner may show again next visit, harmless
  }
}

// First product page visit, and only once the consent banner is gone so two overlays never stack.
watch(
  () => consent.hydrated && !consent.bannerVisible && routeBaseName(route) === 'products-slug',
  (ready) => {
    if (ready) void maybeShow()
  },
  { immediate: true },
)

async function copyCode() {
  if (!banner.value?.code) return
  try {
    await navigator.clipboard.writeText(banner.value.code)
    copied.value = true
    setTimeout(() => (copied.value = false), 2000)
  } catch {
    // clipboard blocked: code stays selectable (select-all) for manual copy
  }
}
</script>

<template>
  <PsDialog v-if="banner" v-model:open="open" :title="text.title">
    <div class="flex flex-col gap-4" data-testid="promo-banner">
      <p class="whitespace-pre-line text-ink-2">{{ text.text }}</p>
      <button
        v-if="banner.code"
        type="button"
        class="flex cursor-pointer flex-col items-center gap-1 border-2 border-dashed border-ink py-3 hover:bg-paper"
        :aria-label="`${t('shop.promo.copy')}: ${banner.code}`"
        data-testid="promo-copy"
        @click="copyCode"
      >
        <span class="text-sm text-ink-2" aria-live="polite">
          {{ copied ? t('shop.promo.copied') : t('shop.promo.codeLabel') }}
        </span>
        <span class="flex items-center gap-2">
          <span class="select-all font-mono text-2xl font-bold tracking-widest">{{
            banner.code
          }}</span>
          <ShopIcon :name="copied ? 'check' : 'copy'" :size="22" />
        </span>
      </button>
      <button type="button" class="kb-btn kb-btn-ink" @click="open = false">
        {{ text.cta }}
      </button>
    </div>
  </PsDialog>
</template>
