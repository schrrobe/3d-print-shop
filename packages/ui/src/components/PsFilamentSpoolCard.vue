<script setup lang="ts">
import { computed } from 'vue'
import PsBadge from './PsBadge.vue'
import PsCard from './PsCard.vue'
import PsStockBar from './PsStockBar.vue'

const props = withDefaults(
  defineProps<{
    label?: string | null
    material: string
    manufacturer?: string | null
    colorName?: string | null
    colorHex?: string | null
    remainingGrams?: number | null
    totalGrams?: number | null
    minRemainingGrams?: number | null
    storageLocation?: string | null
    active?: boolean
    reorder?: boolean
    amsLocationLabel?: string | null
  }>(),
  {
    label: null,
    manufacturer: null,
    colorName: null,
    colorHex: null,
    remainingGrams: null,
    totalGrams: null,
    minRemainingGrams: null,
    storageLocation: null,
    active: true,
    reorder: false,
    amsLocationLabel: null,
  },
)

const belowMinimum = computed(
  () =>
    props.remainingGrams != null &&
    props.minRemainingGrams != null &&
    props.remainingGrams < props.minRemainingGrams,
)

const stockLabel = computed(() => {
  if (props.remainingGrams == null || props.totalGrams == null) return undefined
  return `${props.remainingGrams} g / ${props.totalGrams} g`
})
</script>

<template>
  <PsCard data-testid="spool-card">
    <div class="flex flex-col gap-sm">
      <div class="flex items-start justify-between gap-md">
        <div class="flex min-w-0 items-center gap-sm">
          <span
            v-if="colorHex"
            class="size-6 shrink-0 rounded-full-pill border border-subtle"
            :style="{ backgroundColor: colorHex }"
            :title="colorName ?? undefined"
            aria-hidden="true"
            data-testid="spool-swatch"
          />
          <div class="flex min-w-0 flex-col">
            <span class="truncate text-label-medium text-primary">{{ label ?? material }}</span>
            <span class="truncate text-caption text-secondary">
              <template v-if="manufacturer">{{ manufacturer }} · </template>{{ material
              }}<template v-if="colorName"> · {{ colorName }}</template>
            </span>
          </div>
        </div>
        <div class="flex shrink-0 flex-wrap justify-end gap-xs">
          <PsBadge v-if="reorder" variant="warning">Nachbestellen</PsBadge>
          <PsBadge v-if="belowMinimum" variant="danger">Unter Minimum</PsBadge>
          <PsBadge v-if="!active" variant="default">Inaktiv</PsBadge>
        </div>
      </div>
      <PsStockBar
        v-if="remainingGrams != null && totalGrams != null"
        :value="remainingGrams"
        :max="totalGrams"
        :min="minRemainingGrams"
        :label-text="stockLabel"
      />
      <span v-if="amsLocationLabel || storageLocation" class="text-caption text-secondary">
        <template v-if="amsLocationLabel">{{ amsLocationLabel }}</template>
        <template v-if="amsLocationLabel && storageLocation"> · </template>
        <template v-if="storageLocation">{{ storageLocation }}</template>
      </span>
      <div v-if="$slots.actions" class="flex items-center gap-sm">
        <slot name="actions" />
      </div>
    </div>
  </PsCard>
</template>
