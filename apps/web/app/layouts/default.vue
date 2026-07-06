<script setup lang="ts">
import { PsToastProvider } from '@print-shop/ui'
</script>

<template>
  <div class="flex min-h-screen flex-col bg-surface text-primary">
    <SiteHeader />
    <main class="flex-1">
      <slot />
    </main>
    <SiteFooter />
    <ConsentBanner />
    <PsToastProvider />
  </div>
</template>
