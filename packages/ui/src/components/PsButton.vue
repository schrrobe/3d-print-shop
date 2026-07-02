<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
    size?: 'sm' | 'md' | 'lg'
    type?: 'button' | 'submit'
    disabled?: boolean
    loading?: boolean
  }>(),
  { variant: 'primary', size: 'md', type: 'button' },
)

const classes = computed(() => {
  const variant = {
    primary: 'bg-brand text-on-brand hover:opacity-90',
    secondary: 'bg-surface-elevated text-primary border border-subtle hover:border-brand',
    ghost: 'bg-transparent text-primary hover:bg-surface-elevated',
    danger: 'bg-red-600 text-white hover:bg-red-700',
  }[props.variant]
  const size = {
    sm: 'px-md py-sm text-caption',
    md: 'px-lg py-md-sm text-label-medium',
    lg: 'px-xl py-md text-label-medium',
  }[props.size]
  return `${variant} ${size}`
})
</script>

<template>
  <button
    :type="type"
    :disabled="disabled || loading"
    :class="classes"
    class="inline-flex cursor-pointer items-center justify-center gap-sm rounded-card font-medium transition-all duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-50"
  >
    <span
      v-if="loading"
      class="size-4 animate-spin rounded-full border-2 border-current border-t-transparent"
      aria-hidden="true"
    />
    <slot />
  </button>
</template>
