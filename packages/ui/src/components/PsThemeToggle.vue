<script setup lang="ts">
/** Theme segmented control: dark / light / system. State lives in the app (color-mode). */
const model = defineModel<'dark' | 'light' | 'system'>({ default: 'system' })

const options = [
  { value: 'dark' as const, label: '🌙', title: 'Dark' },
  { value: 'light' as const, label: '☀️', title: 'Light' },
  { value: 'system' as const, label: '💻', title: 'System' },
]
</script>

<template>
  <div
    class="inline-flex items-center gap-xs rounded-full-pill border border-subtle bg-surface-elevated p-xs"
    role="radiogroup"
    aria-label="Theme"
    data-testid="theme-toggle"
  >
    <button
      v-for="option in options"
      :key="option.value"
      type="button"
      role="radio"
      :aria-checked="model === option.value"
      :title="option.title"
      :data-theme-option="option.value"
      class="cursor-pointer rounded-full-pill px-sm py-xs text-caption transition-colors"
      :class="model === option.value ? 'bg-brand text-on-brand' : 'hover:bg-surface'"
      @click="model = option.value"
    >
      <span aria-hidden="true">{{ option.label }}</span>
      <span class="sr-only">{{ option.title }}</span>
    </button>
  </div>
</template>
