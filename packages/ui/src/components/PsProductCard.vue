<script setup lang="ts">
import type { Locale } from '@print-shop/types'
import PsBadge from './PsBadge.vue'
import PsCard from './PsCard.vue'
import PsPrice from './PsPrice.vue'
import PsProductPlaceholder from './PsProductPlaceholder.vue'

withDefaults(
  defineProps<{
    name: string
    priceCents: number
    imageUrl?: string | null
    href?: string
    badge?: string
    locale?: Locale
  }>(),
  { imageUrl: null, locale: 'de' },
)
</script>

<template>
  <component
    :is="href ? 'a' : 'div'"
    :href="href"
    class="block rounded-card focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
    data-testid="product-card"
  >
    <PsCard hover :padded="false">
      <div
        class="relative flex aspect-[4/3] items-center justify-center overflow-hidden rounded-t-card bg-surface"
      >
        <img
          v-if="imageUrl"
          :src="imageUrl"
          :alt="name"
          class="size-full max-w-full object-cover"
          loading="lazy"
        />
        <PsProductPlaceholder v-else />
        <div v-if="badge" class="absolute left-md top-md">
          <PsBadge variant="brand">{{ badge }}</PsBadge>
        </div>
      </div>
      <div class="flex flex-col gap-sm p-md">
        <span class="text-label-medium text-primary">{{ name }}</span>
        <PsPrice :cents="priceCents" :locale="locale" />
      </div>
    </PsCard>
  </component>
</template>
