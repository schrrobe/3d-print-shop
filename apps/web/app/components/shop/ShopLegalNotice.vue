<script setup lang="ts">
/** § 36 WaffG storage notice — wording must be reviewed legally before launch. */
const { t } = useI18n()
</script>

<template>
  <aside
    class="grid gap-3 border border-ink p-5 sm:grid-cols-[auto_1fr] sm:gap-5 sm:p-6"
    :aria-label="t('shop.legalNotice.title')"
    data-testid="storage-notice"
  >
    <ShopIcon name="lock" :size="24" class="text-ink" />
    <div>
      <h2 class="font-bold">{{ t('shop.legalNotice.title') }}</h2>
      <p class="mt-1 max-w-[70ch] text-ink-2">{{ t('shop.legalNotice.text') }}</p>
    </div>
  </aside>
</template>
