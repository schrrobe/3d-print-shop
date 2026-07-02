<script setup lang="ts">
defineProps<{
  hex: string
  name: string
  selected?: boolean
  disabled?: boolean
  size?: 'sm' | 'md'
}>()

defineEmits<{ select: [] }>()
</script>

<template>
  <button
    type="button"
    :disabled="disabled"
    :title="name"
    :aria-label="name"
    :aria-pressed="selected"
    class="relative inline-flex shrink-0 cursor-pointer items-center justify-center rounded-full-pill border-2 transition-all duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-30"
    :class="[
      selected ? 'border-brand scale-110' : 'border-subtle hover:scale-105',
      size === 'sm' ? 'size-6' : 'size-9',
    ]"
    :style="{ backgroundColor: hex }"
    data-testid="color-swatch"
    @click="$emit('select')"
  >
    <span
      v-if="selected"
      class="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full-pill bg-brand text-[10px] text-on-brand"
      aria-hidden="true"
      >✓</span
    >
  </button>
</template>
