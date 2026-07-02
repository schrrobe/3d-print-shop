<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{ variant?: 'default' | 'brand' | 'warning' | 'danger' | 'info' }>(),
  { variant: 'default' },
)

const classes = computed(
  () =>
    ({
      default: 'bg-surface-elevated text-secondary border border-subtle',
      brand: 'bg-brand/15 text-brand',
      warning: 'bg-amber-500/15 text-amber-500',
      danger: 'bg-red-500/15 text-red-500',
      info: 'bg-blue-500/15 text-blue-400',
    })[props.variant],
)
</script>

<template>
  <span
    :class="classes"
    class="inline-flex items-center gap-xs rounded-pill-small px-md-sm py-xs text-caption whitespace-nowrap"
  >
    <slot />
  </span>
</template>
