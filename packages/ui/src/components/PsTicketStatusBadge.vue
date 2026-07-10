<script setup lang="ts">
import type { TicketStatus } from '@print-shop/types'
import { computed } from 'vue'
import PsBadge from './PsBadge.vue'

const props = defineProps<{
  status: TicketStatus
  label?: string
}>()

const variant = computed<'default' | 'brand' | 'warning' | 'info'>(() => {
  const map: Record<TicketStatus, 'default' | 'brand' | 'warning' | 'info'> = {
    open: 'warning',
    in_progress: 'info',
    waiting_customer: 'warning',
    resolved: 'brand',
    closed: 'default',
  }
  return map[props.status]
})
</script>

<template>
  <PsBadge :variant="variant" data-testid="ticket-status" :data-status="status">
    {{ label ?? status }}
  </PsBadge>
</template>
