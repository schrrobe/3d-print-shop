<script setup lang="ts">
import type { SocialPlatform, SocialPostStatus } from '@print-shop/types'
import { computed } from 'vue'
import { formatSocialDateTime } from '../social.js'
import PsSocialPlatformBadge from './PsSocialPlatformBadge.vue'
import PsSocialPostStatusBadge from './PsSocialPostStatusBadge.vue'

/** Simple post preview: platform badge, image, caption, product link, time, status. */
const props = defineProps<{
  platforms: SocialPlatform[]
  caption: string
  mediaUrls: string[]
  productName?: string | null
  productUrl?: string | null
  scheduledAt?: string | null
  status?: SocialPostStatus
}>()

const image = computed(() => props.mediaUrls[0] ?? null)
</script>

<template>
  <article
    class="flex max-w-96 flex-col gap-md rounded-card border border-subtle bg-surface-elevated p-md"
    data-testid="social-post-preview"
    aria-label="Post-Vorschau"
  >
    <div class="flex flex-wrap items-center gap-sm">
      <PsSocialPlatformBadge v-for="platform in platforms" :key="platform" :platform="platform" />
      <PsSocialPostStatusBadge v-if="status" :status="status" />
    </div>

    <img
      v-if="image"
      :src="image"
      alt=""
      class="aspect-square w-full rounded-card bg-surface object-cover"
    />
    <div
      v-else
      class="flex aspect-square w-full items-center justify-center rounded-card border border-dashed border-subtle text-caption text-secondary"
    >
      Kein Bild ausgewählt
    </div>

    <p class="whitespace-pre-line text-body-regular text-primary" data-testid="preview-caption">
      {{ caption || '(Keine Caption)' }}
    </p>

    <a
      v-if="productUrl"
      :href="productUrl"
      target="_blank"
      rel="noopener"
      class="text-caption text-brand hover:underline"
      data-testid="preview-product-link"
    >
      {{ productName ?? productUrl }}
    </a>

    <p class="text-caption text-secondary" data-testid="preview-scheduled-at">
      Geplant für: {{ formatSocialDateTime(scheduledAt) }}
    </p>
  </article>
</template>
