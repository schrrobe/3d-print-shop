<script setup lang="ts">
import type { TicketPriority } from '@print-shop/types'
import { computed } from 'vue'
import PsBadge from './PsBadge.vue'

const props = defineProps<{
  priority: TicketPriority
  label?: string
}>()

const variant = computed<'default' | 'warning' | 'danger'>(() => {
  const map: Record<TicketPriority, 'default' | 'warning' | 'danger'> = {
    low: 'default',
    normal: 'default',
    high: 'warning',
    urgent: 'danger',
  }
  return map[props.priority]
})
</script>

<template>
  <PsBadge :variant="variant" data-testid="ticket-priority" :data-priority="priority">
    {{ label ?? priority }}
  </PsBadge>
</template>
