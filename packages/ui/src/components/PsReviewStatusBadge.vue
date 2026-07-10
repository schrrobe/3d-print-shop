<script setup lang="ts">
import type { ReviewStatus } from '@print-shop/types'
import { computed } from 'vue'
import PsBadge from './PsBadge.vue'

const props = defineProps<{
  status: ReviewStatus
  label?: string
}>()

const variant = computed<'default' | 'brand' | 'warning' | 'danger'>(() => {
  const map: Record<ReviewStatus, 'default' | 'brand' | 'warning' | 'danger'> = {
    pending: 'warning',
    approved: 'brand',
    rejected: 'danger',
    hidden: 'default',
  }
  return map[props.status]
})
</script>

<template>
  <PsBadge :variant="variant" data-testid="review-status" :data-status="status">
    {{ label ?? status }}
  </PsBadge>
</template>
