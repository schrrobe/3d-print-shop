<script setup lang="ts">
import { PsButton, PsDialog, PsPillButton } from '@print-shop/ui'

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
  void consent.saveCustom({ statistics: statistics.value, marketing: marketing.value }, locale.value)
  consent.settingsOpen = false
}
</script>

<template>
  <!-- Consent banner — no animations, GDPR: nothing loads before opt-in -->
  <div
    v-if="consent.bannerVisible"
    class="fixed inset-x-0 bottom-0 z-50 border-t border-subtle bg-surface-elevated p-lg shadow-card"
    role="dialog"
    aria-modal="false"
    :aria-label="t('consent.title')"
    data-testid="consent-banner"
  >
    <div class="mx-auto flex max-w-[72rem] flex-col gap-md md:flex-row md:items-center md:justify-between">
      <div class="max-w-[42rem]">
        <h2 class="text-label-medium font-semibold">{{ t('consent.title') }}</h2>
        <p class="mt-xs text-body-regular text-secondary">{{ t('consent.text') }}</p>
      </div>
      <div class="flex flex-wrap items-center gap-sm">
        <PsButton variant="ghost" data-testid="consent-settings" @click="consent.settingsOpen = true">
          {{ t('consent.settings') }}
        </PsButton>
        <PsButton variant="secondary" data-testid="consent-reject" @click="consent.rejectAll(locale)">
          {{ t('consent.rejectAll') }}
        </PsButton>
        <PsPillButton variant="primary" data-testid="consent-accept" @click="consent.acceptAll(locale)">
          {{ t('consent.acceptAll') }}
        </PsPillButton>
      </div>
    </div>
  </div>

  <PsDialog v-model:open="consent.settingsOpen" :title="t('consent.title')">
    <div class="flex flex-col gap-md" data-testid="consent-settings-dialog">
      <label class="flex items-start gap-md">
        <input type="checkbox" checked disabled class="mt-1 accent-(--brand)" />
        <span>
          <span class="text-label-medium">{{ t('consent.necessary') }}</span>
          <span class="block text-body-regular text-secondary">{{ t('consent.necessaryText') }}</span>
        </span>
      </label>
      <label class="flex items-start gap-md">
        <input
          v-model="statistics"
          type="checkbox"
          class="mt-1 accent-(--brand)"
          data-testid="consent-statistics"
        />
        <span>
          <span class="text-label-medium">{{ t('consent.statistics') }}</span>
          <span class="block text-body-regular text-secondary">{{ t('consent.statisticsText') }}</span>
        </span>
      </label>
      <label class="flex items-start gap-md">
        <input
          v-model="marketing"
          type="checkbox"
          class="mt-1 accent-(--brand)"
          data-testid="consent-marketing"
        />
        <span>
          <span class="text-label-medium">{{ t('consent.marketing') }}</span>
          <span class="block text-body-regular text-secondary">{{ t('consent.marketingText') }}</span>
        </span>
      </label>
      <PsButton data-testid="consent-save" @click="saveSettings">{{ t('consent.save') }}</PsButton>
    </div>
  </PsDialog>
</template>
