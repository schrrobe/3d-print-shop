<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  steps: { key: string; label: string }[]
  current: string
}>()

const currentIndex = computed(() => props.steps.findIndex((step) => step.key === props.current))

function stateOf(index: number): 'done' | 'current' | 'future' {
  if (index < currentIndex.value) return 'done'
  if (index === currentIndex.value) return 'current'
  return 'future'
}
</script>

<template>
  <ol class="flex items-center gap-sm" data-testid="stepper" aria-label="Fortschritt">
    <li
      v-for="(step, index) in steps"
      :key="step.key"
      class="flex items-center gap-sm"
      :class="index < steps.length - 1 ? 'flex-1' : ''"
    >
      <span
        class="inline-flex items-center gap-sm whitespace-nowrap rounded-full-pill border px-md py-sm text-caption transition-colors"
        :class="{
          'border-brand bg-brand text-on-brand': stateOf(index) === 'done',
          'border-brand bg-surface-elevated text-primary': stateOf(index) === 'current',
          'border-subtle bg-surface-elevated text-secondary': stateOf(index) === 'future',
        }"
        :aria-current="stateOf(index) === 'current' ? 'step' : undefined"
        :data-step="step.key"
      >
        <span v-if="stateOf(index) === 'done'" aria-hidden="true">✓</span>
        {{ step.label }}
      </span>
      <span
        v-if="index < steps.length - 1"
        class="h-px min-w-md flex-1"
        :class="stateOf(index) === 'done' ? 'bg-brand' : 'bg-subtle'"
        aria-hidden="true"
      />
    </li>
  </ol>
</template>
