<script setup lang="ts">
defineProps<{ hover?: boolean; padded?: boolean }>()
</script>

<template>
  <div
    class="rounded-card border border-subtle bg-surface-elevated shadow-card"
    :class="[
      hover ? 'transition-transform duration-300 hover:-translate-y-1 hover:border-brand' : '',
      padded === false ? '' : 'p-lg',
    ]"
  >
    <slot />
  </div>
</template>
