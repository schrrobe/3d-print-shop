<script setup lang="ts">
import type { SocialPlatform } from '@print-shop/types'
import { computed } from 'vue'
import { SOCIAL_PLATFORM_LABELS } from '../social.js'

const props = defineProps<{
  platform: SocialPlatform
  label?: string
}>()

const classes = computed(
  () =>
    ({
      instagram: 'bg-fuchsia-500/15 text-fuchsia-500',
      facebook: 'bg-blue-500/15 text-blue-400',
    })[props.platform],
)
</script>

<template>
  <span
    :class="classes"
    class="inline-flex items-center gap-xs rounded-pill-small px-md-sm py-xs text-caption whitespace-nowrap"
    data-testid="social-platform"
    :data-platform="platform"
  >
    {{ label ?? SOCIAL_PLATFORM_LABELS[platform] }}
  </span>
</template>
