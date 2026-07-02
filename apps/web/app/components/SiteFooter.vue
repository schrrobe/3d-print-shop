<script setup lang="ts">
const { t } = useI18n()
const localePath = useLocalePath()
const consent = useConsentStore()
</script>

<template>
  <footer class="border-t border-subtle bg-surface py-2xl" data-testid="site-footer">
    <div
      class="mx-auto flex max-w-[72rem] flex-col items-center justify-between gap-md px-md text-caption text-secondary sm:flex-row"
    >
      <p>© 2026 Print Shop · {{ t('footer.claim') }}</p>
      <nav class="flex items-center gap-lg">
        <NuxtLink :to="localePath('/legal/imprint')" class="hover:text-primary">{{
          t('footer.imprint')
        }}</NuxtLink>
        <NuxtLink :to="localePath('/legal/privacy')" class="hover:text-primary">{{
          t('footer.privacy')
        }}</NuxtLink>
        <NuxtLink :to="localePath('/legal/terms')" class="hover:text-primary">{{
          t('footer.terms')
        }}</NuxtLink>
        <button
          type="button"
          class="cursor-pointer hover:text-primary"
          data-testid="open-consent-settings"
          @click="consent.settingsOpen = true"
        >
          {{ t('consent.settings') }}
        </button>
      </nav>
    </div>
  </footer>
</template>
