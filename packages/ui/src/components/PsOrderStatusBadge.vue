<script setup lang="ts">
import type { OrderStatus } from '@print-shop/types'
import { computed } from 'vue'
import PsBadge from './PsBadge.vue'

const props = defineProps<{
  status: OrderStatus
  label?: string
}>()

const variant = computed<'warning' | 'info' | 'brand' | 'danger'>(() => {
  const map: Record<OrderStatus, 'warning' | 'info' | 'brand' | 'danger'> = {
    pending: 'warning',
    awaiting_payment: 'warning',
    awaiting_bank_transfer: 'warning',
    paid: 'info',
    in_production: 'info',
    quality_check: 'info',
    ready_to_ship: 'info',
    shipped: 'brand',
    completed: 'brand',
    cancelled: 'danger',
    refunded: 'danger',
  }
  return map[props.status]
})
</script>

<template>
  <PsBadge :variant="variant" data-testid="order-status" :data-status="status">
    {{ label ?? status }}
  </PsBadge>
</template>
