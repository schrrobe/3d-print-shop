<script setup lang="ts">
import { PsToastProvider } from '@print-shop/ui'

const { t } = useI18n()

// Shop world tokens live under html.kb (assets/css/shop.css); admin layout stays untouched.
useHead({ htmlAttrs: { class: 'kb' } })
</script>

<template>
  <div class="flex min-h-dvh flex-col bg-paper text-ink">
    <a
      href="#main"
      class="kb-btn kb-btn-ink fixed left-4 top-2 z-[60] -translate-y-24 focus-visible:translate-y-0"
      data-testid="skip-link"
    >
      {{ t('shop.a11y.skipToContent') }}
    </a>
    <SiteHeader />
    <main id="main" tabindex="-1" class="flex-1 focus:outline-none">
      <slot />
    </main>
    <SiteFooter />
    <ConsentBanner />
    <PsToastProvider />
  </div>
</template>
