<script setup lang="ts">
import type { PrinterStatus } from '@print-shop/types'
import { computed } from 'vue'
import PsBadge from './PsBadge.vue'
import PsCard from './PsCard.vue'

const props = withDefaults(
  defineProps<{
    name: string
    model: string
    status: PrinterStatus
    notes?: string | null
    etaLabel?: string
  }>(),
  { notes: null },
)

const STATUS_META: Record<
  PrinterStatus,
  { variant: 'brand' | 'info' | 'warning' | 'danger'; label: string }
> = {
  idle: { variant: 'brand', label: 'Frei' },
  prepared: { variant: 'info', label: 'Vorbereitet' },
  printing: { variant: 'info', label: 'Druckt' },
  paused: { variant: 'warning', label: 'Pausiert' },
  error: { variant: 'danger', label: 'Fehler' },
  maintenance: { variant: 'warning', label: 'Wartung' },
}

const meta = computed(() => STATUS_META[props.status])
</script>

<template>
  <PsCard data-testid="printer-card" :data-status="status">
    <div class="flex flex-col gap-sm">
      <div class="flex items-start justify-between gap-md">
        <div class="flex flex-col">
          <span class="text-label-medium text-primary">{{ name }}</span>
          <span class="text-caption text-secondary">{{ model }}</span>
        </div>
        <PsBadge :variant="meta.variant">{{ meta.label }}</PsBadge>
      </div>
      <p v-if="notes" class="text-body-regular text-secondary">{{ notes }}</p>
      <p v-if="etaLabel" class="text-caption text-brand">{{ etaLabel }}</p>
    </div>
  </PsCard>
</template>
