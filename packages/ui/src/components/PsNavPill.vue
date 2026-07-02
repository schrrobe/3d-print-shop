<script setup lang="ts">
defineProps<{
  active?: boolean
  as?: 'a' | 'button'
  href?: string
}>()
</script>

<template>
  <component
    :is="as ?? 'button'"
    :href="href"
    class="inline-flex cursor-pointer items-center gap-sm rounded-full-pill px-md py-sm text-caption transition-colors duration-200"
    :class="
      active
        ? 'bg-brand text-on-brand'
        : 'bg-white-translucent text-primary hover:bg-surface-elevated'
    "
    :aria-current="active ? 'page' : undefined"
  >
    <slot />
  </component>
</template>
