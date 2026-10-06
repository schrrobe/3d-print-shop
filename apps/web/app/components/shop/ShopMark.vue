<script setup lang="ts">
/** Wordmark: a two-ring target with one hit, then "kaliberbox". */
const props = defineProps<{ compact?: boolean }>()
</script>

<template>
  <span class="inline-flex items-center gap-2 text-ink">
    <svg width="26" height="26" viewBox="0 0 26 26" aria-hidden="true" focusable="false">
      <circle cx="13" cy="13" r="12" fill="none" stroke="currentColor" stroke-width="1.5" />
      <circle cx="13" cy="13" r="7" fill="currentColor" />
      <circle cx="13" cy="13" r="3.4" fill="none" stroke="var(--kb-paper)" stroke-width="1" />
      <circle cx="14.6" cy="11.6" r="1.9" fill="var(--kb-hit)" />
    </svg>
    <span class="text-[1.25rem] leading-none tracking-[-0.01em]" style="font-stretch: 72%">
      <span class="font-[800]">kaliber</span><span class="font-[400]">box</span
      ><span v-if="!props.compact" class="font-[400] text-ink-2">.de</span>
    </span>
  </span>
</template>
