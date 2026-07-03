<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    value: number
    max: number
    min?: number | null
    labelText?: string
  }>(),
  { min: null },
)

const percent = computed(() => {
  if (props.max <= 0) return 0
  return Math.min(100, Math.max(0, (props.value / props.max) * 100))
})

const minPercent = computed(() => {
  if (props.min == null || props.max <= 0) return null
  return Math.min(100, Math.max(0, (props.min / props.max) * 100))
})

/**
 * Einfache Farblogik:
 * - danger: Wert liegt unter dem Minimum
 * - warning: Wert liegt höchstens 25 % über dem Minimum
 * - brand: sonst (auch wenn kein Minimum gesetzt ist)
 */
const barClass = computed(() => {
  if (props.min != null) {
    if (props.value < props.min) return 'bg-red-500'
    if (props.value <= props.min * 1.25) return 'bg-amber-500'
  }
  return 'bg-brand'
})
</script>

<template>
  <div class="flex flex-col gap-xs" data-testid="stock-bar">
    <div
      role="progressbar"
      :aria-valuenow="value"
      :aria-valuemin="0"
      :aria-valuemax="max"
      :aria-label="labelText ?? `${value} von ${max}`"
      class="relative h-2 w-full overflow-hidden rounded-pill-small bg-surface"
    >
      <div
        class="h-full rounded-pill-small transition-all duration-300"
        :class="barClass"
        :style="{ width: `${percent}%` }"
      />
      <span
        v-if="minPercent != null"
        class="absolute inset-y-0 w-px bg-primary/60"
        :style="{ left: `${minPercent}%` }"
        aria-hidden="true"
      />
    </div>
    <span v-if="labelText" class="text-caption text-secondary">{{ labelText }}</span>
  </div>
</template>
