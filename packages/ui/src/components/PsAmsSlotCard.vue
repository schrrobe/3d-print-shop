<script setup lang="ts">
import type { AmsSlotStatus } from '@print-shop/types'
import { computed } from 'vue'
import PsBadge from './PsBadge.vue'

const props = withDefaults(
  defineProps<{
    slotIndex: number
    status: AmsSlotStatus
    spoolLabel?: string | null
    colorName?: string | null
    colorHex?: string | null
    remainingGrams?: number | null
    notes?: string | null
  }>(),
  { spoolLabel: null, colorName: null, colorHex: null, remainingGrams: null, notes: null },
)

const STATUS_META: Record<
  AmsSlotStatus,
  { variant: 'default' | 'brand' | 'warning' | 'danger'; label: string }
> = {
  empty: { variant: 'default', label: 'Leer' },
  loaded: { variant: 'brand', label: 'Geladen' },
  low: { variant: 'warning', label: 'Fast leer' },
  error: { variant: 'danger', label: 'Fehler' },
  disabled: { variant: 'default', label: 'Deaktiviert' },
}

const meta = computed(() => STATUS_META[props.status])
</script>

<template>
  <div
    class="flex flex-col gap-sm rounded-card border border-subtle bg-surface-elevated p-md"
    data-testid="ams-slot"
    :data-status="status"
  >
    <div class="flex items-center justify-between gap-sm">
      <span class="text-label-medium text-primary">Slot {{ slotIndex }}</span>
      <PsBadge :variant="meta.variant">{{ meta.label }}</PsBadge>
    </div>
    <div v-if="colorHex || colorName" class="flex items-center gap-sm">
      <span
        v-if="colorHex"
        class="size-4 shrink-0 rounded-full-pill border border-subtle"
        :style="{ backgroundColor: colorHex }"
        :title="colorName ?? undefined"
        aria-hidden="true"
      />
      <span v-if="colorName" class="truncate text-body-regular text-primary">{{ colorName }}</span>
    </div>
    <span v-if="spoolLabel" class="truncate text-caption text-secondary">{{ spoolLabel }}</span>
    <span v-if="remainingGrams != null" class="text-caption text-secondary">
      {{ remainingGrams }} g übrig
    </span>
    <p v-if="notes" class="text-body-regular text-secondary">{{ notes }}</p>
    <div v-if="$slots.actions" class="flex items-center gap-sm">
      <slot name="actions" />
    </div>
  </div>
</template>
