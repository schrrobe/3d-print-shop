<script setup lang="ts">
import type { ShipmentStatus } from '@print-shop/types'
import { computed } from 'vue'
import PsBadge from './PsBadge.vue'

const props = defineProps<{
  status: ShipmentStatus
  label?: string
}>()

const STATUS_META: Record<
  ShipmentStatus,
  { variant: 'warning' | 'info' | 'brand' | 'danger'; label: string }
> = {
  waiting_for_qc: { variant: 'warning', label: 'Wartet auf QC' },
  ready_for_shipping: { variant: 'info', label: 'Versandbereit' },
  packed: { variant: 'info', label: 'Verpackt' },
  shipped: { variant: 'brand', label: 'Versendet' },
  delivered: { variant: 'brand', label: 'Zugestellt' },
  problem: { variant: 'danger', label: 'Problem' },
}

const meta = computed(() => STATUS_META[props.status])
</script>

<template>
  <PsBadge :variant="meta.variant" data-testid="shipment-status" :data-status="status">
    {{ label ?? meta.label }}
  </PsBadge>
</template>
