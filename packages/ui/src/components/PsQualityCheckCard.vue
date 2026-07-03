<script setup lang="ts">
import type { QcStatus } from '@print-shop/types'
import { computed } from 'vue'
import PsBadge from './PsBadge.vue'
import PsCard from './PsCard.vue'

const props = withDefaults(
  defineProps<{
    orderNumber: string
    itemName: string
    printerName?: string | null
    status: QcStatus
    checkedCount?: number
    noteText?: string | null
    overrideReason?: string | null
  }>(),
  { printerName: null, noteText: null, overrideReason: null },
)

const STATUS_META: Record<QcStatus, { variant: 'brand' | 'warning' | 'danger'; label: string }> = {
  open: { variant: 'warning', label: 'Offen' },
  passed: { variant: 'brand', label: 'Bestanden' },
  failed: { variant: 'danger', label: 'Fehlgeschlagen' },
  reprint_required: { variant: 'danger', label: 'Neudruck nötig' },
  overridden: { variant: 'warning', label: 'Überschrieben' },
}

const meta = computed(() => STATUS_META[props.status])
</script>

<template>
  <PsCard data-testid="qc-card" :data-status="status">
    <div class="flex flex-col gap-sm">
      <div class="flex items-start justify-between gap-md">
        <div class="flex min-w-0 flex-col gap-xs">
          <span class="text-caption text-secondary">{{ orderNumber }}</span>
          <span class="truncate text-label-medium text-primary">{{ itemName }}</span>
          <span v-if="printerName" class="text-caption text-secondary">{{ printerName }}</span>
        </div>
        <PsBadge :variant="meta.variant">{{ meta.label }}</PsBadge>
      </div>
      <span v-if="checkedCount != null" class="text-caption text-secondary">
        {{ checkedCount }}/6 geprüft
      </span>
      <p v-if="noteText" class="text-body-regular text-secondary">{{ noteText }}</p>
      <p
        v-if="status === 'overridden' && overrideReason"
        class="rounded-card border border-amber-500/40 bg-amber-500/10 p-sm text-body-regular text-amber-500"
        data-testid="qc-override-reason"
      >
        {{ overrideReason }}
      </p>
      <div v-if="$slots.actions" class="flex items-center gap-sm">
        <slot name="actions" />
      </div>
    </div>
  </PsCard>
</template>
