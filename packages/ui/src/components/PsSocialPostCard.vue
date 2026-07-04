<script setup lang="ts">
import { computed } from 'vue'
import type { SocialPostItem } from '../social.js'
import { formatSocialDateTime } from '../social.js'
import PsSocialPlatformBadge from './PsSocialPlatformBadge.vue'
import PsSocialPostStatusBadge from './PsSocialPostStatusBadge.vue'

/** Compact post card for the calendar and dashboards. */
const props = defineProps<{ post: SocialPostItem }>()

const emit = defineEmits<{ open: [post: SocialPostItem] }>()

const excerpt = computed(() =>
  props.post.caption.length > 80 ? `${props.post.caption.slice(0, 80)}…` : props.post.caption,
)
</script>

<template>
  <button
    type="button"
    class="flex w-full cursor-pointer flex-col gap-xs rounded-card border border-subtle bg-surface-elevated p-sm text-left transition-colors hover:border-brand focus-visible:outline-2 focus-visible:outline-brand"
    data-testid="social-post-card"
    :data-post-id="post.id"
    @click="emit('open', post)"
  >
    <div class="flex flex-wrap items-center gap-xs">
      <PsSocialPlatformBadge :platform="post.platform" />
      <PsSocialPostStatusBadge :status="post.status" />
    </div>
    <p class="text-caption text-primary">{{ excerpt }}</p>
    <p class="text-caption text-secondary">
      {{ post.productName ?? '—' }} · {{ formatSocialDateTime(post.scheduledAt) }}
    </p>
    <p v-if="post.status === 'failed' && post.errorMessage" class="text-caption text-red-500">
      {{ post.errorMessage }}
    </p>
  </button>
</template>
