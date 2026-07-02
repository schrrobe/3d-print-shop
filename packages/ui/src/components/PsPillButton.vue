<script setup lang="ts">
import { computed } from 'vue'

/** Pill-shaped CTA button — the signature shape of the design system. */
const props = withDefaults(
  defineProps<{
    variant?: 'primary' | 'secondary' | 'inverse'
    size?: 'sm' | 'md' | 'lg' | 'xl'
    type?: 'button' | 'submit'
    disabled?: boolean
  }>(),
  { variant: 'primary', size: 'md', type: 'button' },
)

const classes = computed(() => {
  const variant = {
    primary: 'bg-brand text-on-brand hover:opacity-90',
    secondary: 'bg-transparent text-primary border border-subtle hover:border-brand',
    inverse: 'bg-surface-inverse text-inverse hover:opacity-90',
  }[props.variant]
  const size = {
    sm: 'px-md py-sm text-caption rounded-pill-small',
    md: 'px-lg py-md-sm text-label-medium rounded-pill-medium',
    lg: 'px-xl py-md text-label-medium rounded-pill-large',
    xl: 'px-2xl py-md-lg text-label-medium rounded-pill-xl',
  }[props.size]
  return `${variant} ${size}`
})
</script>

<template>
  <button
    :type="type"
    :disabled="disabled"
    :class="classes"
    class="inline-flex cursor-pointer items-center justify-center gap-sm font-medium transition-all duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-50"
  >
    <slot />
  </button>
</template>
