<script setup lang="ts">
import type { ProductionStatus } from '@print-shop/types'
import { computed } from 'vue'
import PsBadge from './PsBadge.vue'

const props = withDefaults(
  defineProps<{
    orderNumber: string
    itemName: string
    status: ProductionStatus
    printerName?: string | null
    durationLabel?: string
  }>(),
  { printerName: null },
)

const STATUS_META: Record<
  ProductionStatus,
  { variant: 'default' | 'brand' | 'info' | 'warning' | 'danger'; label: string }
> = {
  waiting: { variant: 'default', label: 'Wartet' },
  assigned: { variant: 'info', label: 'Zugewiesen' },
  printing: { variant: 'info', label: 'Druckt' },
  printed: { variant: 'brand', label: 'Fertig' },
  quality_check: { variant: 'warning', label: 'Qualitätsprüfung' },
  ready_to_ship: { variant: 'brand', label: 'Versandbereit' },
  shipped: { variant: 'brand', label: 'Versendet' },
  failed: { variant: 'danger', label: 'Fehlgeschlagen' },
  reprint_needed: { variant: 'danger', label: 'Reprint nötig' },
}

const meta = computed(() => STATUS_META[props.status])
</script>

<template>
  <div
    class="flex items-center justify-between gap-md rounded-card border border-subtle bg-surface-elevated px-md py-md-sm"
    data-testid="queue-item"
    :data-status="status"
  >
    <div class="flex min-w-0 flex-col gap-xs">
      <span class="text-caption text-secondary">{{ orderNumber }}</span>
      <span class="truncate text-label-medium text-primary">{{ itemName }}</span>
      <span v-if="printerName || durationLabel" class="text-caption text-secondary">
        <template v-if="printerName">{{ printerName }}</template>
        <template v-if="printerName && durationLabel"> · </template>
        <template v-if="durationLabel">{{ durationLabel }}</template>
      </span>
    </div>
    <div class="flex shrink-0 items-center gap-sm">
      <PsBadge :variant="meta.variant">{{ meta.label }}</PsBadge>
      <slot name="actions" />
    </div>
  </div>
</template>
