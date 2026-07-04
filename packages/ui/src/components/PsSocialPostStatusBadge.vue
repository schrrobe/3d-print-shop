<script setup lang="ts">
import type { SocialPostStatus } from '@print-shop/types'
import { computed } from 'vue'
import { SOCIAL_POST_STATUS_LABELS } from '../social.js'
import PsBadge from './PsBadge.vue'

const props = defineProps<{
  status: SocialPostStatus
  label?: string
}>()

const variant = computed<'default' | 'brand' | 'warning' | 'danger' | 'info'>(() => {
  const map: Record<SocialPostStatus, 'default' | 'brand' | 'warning' | 'danger' | 'info'> = {
    draft: 'default',
    scheduled: 'info',
    publishing: 'warning',
    published: 'brand',
    failed: 'danger',
    cancelled: 'default',
  }
  return map[props.status]
})
</script>

<template>
  <PsBadge :variant="variant" data-testid="social-post-status" :data-status="status">
    {{ label ?? SOCIAL_POST_STATUS_LABELS[status] }}
  </PsBadge>
</template>
