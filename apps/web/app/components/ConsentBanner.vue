<script setup lang="ts">
import { PsDialog } from '@print-shop/ui'

const { t, locale } = useI18n()
const consent = useConsentStore()

onMounted(() => consent.hydrate())

const statistics = ref(false)
const marketing = ref(false)

watch(
  () => consent.settingsOpen,
  (open) => {
    if (open) {
      statistics.value = consent.consent?.statistics ?? false
      marketing.value = consent.consent?.marketing ?? false
    }
  },
)

function saveSettings() {
  void consent.saveCustom(
    { statistics: statistics.value, marketing: marketing.value },
    locale.value,
  )
  consent.settingsOpen = false
}
</script>

<template>
  <!-- Consent banner — no animations, GDPR: nothing loads before opt-in.
       Reject and accept carry equal visual weight (no dark pattern). -->
  <section
    v-if="consent.bannerVisible"
    class="fixed inset-x-0 bottom-0 z-50 border-t-2 border-ink bg-paper-raised pb-[env(safe-area-inset-bottom)]"
    :aria-label="t('consent.title')"
    data-testid="consent-banner"
  >
    <div
      class="kb-wrap flex flex-col gap-4 py-4 md:flex-row md:items-center md:justify-between md:gap-8"
    >
      <div class="max-w-[42rem]">
        <h2 class="font-bold">{{ t('consent.title') }}</h2>
        <p class="mt-1 text-sm text-ink-2">{{ t('consent.text') }}</p>
      </div>
      <div class="grid grid-cols-2 gap-2 md:flex md:shrink-0">
        <button
          type="button"
          class="kb-btn kb-btn-ink"
          data-testid="consent-reject"
          @click="consent.rejectAll(locale)"
        >
          {{ t('consent.rejectAll') }}
        </button>
        <button
          type="button"
          class="kb-btn kb-btn-ink"
          data-testid="consent-accept"
          @click="consent.acceptAll(locale)"
        >
          {{ t('consent.acceptAll') }}
        </button>
        <button
          type="button"
          class="kb-btn kb-btn-quiet col-span-2 md:order-first"
          data-testid="consent-settings"
          @click="consent.settingsOpen = true"
        >
          {{ t('consent.settings') }}
        </button>
      </div>
    </div>
  </section>

  <PsDialog v-model:open="consent.settingsOpen" :title="t('consent.title')">
    <div class="flex flex-col gap-4" data-testid="consent-settings-dialog">
      <label class="flex items-start gap-3">
        <input type="checkbox" checked disabled class="mt-1 size-5" />
        <span>
          <span class="font-semibold">{{ t('consent.necessary') }}</span>
          <span class="block text-sm text-ink-2">{{ t('consent.necessaryText') }}</span>
        </span>
      </label>
      <label class="flex cursor-pointer items-start gap-3">
        <input
          v-model="statistics"
          type="checkbox"
          class="mt-1 size-5"
          data-testid="consent-statistics"
        />
        <span>
          <span class="font-semibold">{{ t('consent.statistics') }}</span>
          <span class="block text-sm text-ink-2">{{ t('consent.statisticsText') }}</span>
        </span>
      </label>
      <label class="flex cursor-pointer items-start gap-3">
        <input
          v-model="marketing"
          type="checkbox"
          class="mt-1 size-5"
          data-testid="consent-marketing"
        />
        <span>
          <span class="font-semibold">{{ t('consent.marketing') }}</span>
          <span class="block text-sm text-ink-2">{{ t('consent.marketingText') }}</span>
        </span>
      </label>
      <button
        type="button"
        class="kb-btn kb-btn-ink"
        data-testid="consent-save"
        @click="saveSettings"
      >
        {{ t('consent.save') }}
      </button>
    </div>
  </PsDialog>
</template>
