<script setup lang="ts">
import type { Locale } from '@print-shop/types'
import PsBadge from './PsBadge.vue'
import PsCard from './PsCard.vue'
import PsPrice from './PsPrice.vue'

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
        <div v-else class="text-secondary" aria-hidden="true">
          <svg
            width="64"
            height="64"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.2"
            stroke-linejoin="round"
          >
            <path d="M12 2 3 7v10l9 5 9-5V7l-9-5Z" />
            <path d="M3 7l9 5 9-5" />
            <path d="M12 12v10" />
          </svg>
        </div>
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
