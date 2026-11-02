<script setup lang="ts">
/** Ordered colors (per zone) and print name of an order item — resolved server-side. */
defineProps<{
  colors?: { slot: string; label: string; name: string; hex: string | null }[]
  personalization?: string | null
}>()
</script>

<template>
  <ul
    v-if="colors?.length || personalization"
    class="mt-xs flex flex-col gap-xs text-caption text-secondary"
    data-testid="order-item-colors"
  >
    <li v-for="c in colors" :key="c.slot" class="flex items-center gap-sm">
      <span
        class="inline-block size-3 shrink-0 rounded-full border border-subtle"
        :style="{ backgroundColor: c.hex ?? 'transparent' }"
      />
      {{ c.label }}: {{ c.name }}
    </li>
    <li v-if="personalization">Aufdruck: „{{ personalization }}“</li>
  </ul>
</template>
