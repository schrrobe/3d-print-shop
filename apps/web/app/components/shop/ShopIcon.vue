<script setup lang="ts">
/**
 * Shop icon set — 24px grid, 1.75 stroke, currentColor.
 * Paths adapted from Lucide (ISC License, https://lucide.dev).
 * Decorative by default; pass `label` when the icon carries meaning on its own.
 */
const props = defineProps<{
  name:
    | 'cart'
    | 'menu'
    | 'close'
    | 'heart'
    | 'heart-filled'
    | 'arrow-right'
    | 'arrow-left'
    | 'chevron-down'
    | 'check'
    | 'minus'
    | 'plus'
    | 'trash'
    | 'share'
    | 'reset'
    | 'info'
    | 'alert'
    | 'search'
    | 'gift'
    | 'lock'
  size?: number
  label?: string
}>()

const paths: Record<string, string[]> = {
  cart: [
    'M2.5 3h2.2l2.4 11.2a1.6 1.6 0 0 0 1.6 1.3h8.6a1.6 1.6 0 0 0 1.5-1.2L20.8 7H6',
    'M9.5 20.5h.01',
    'M17.5 20.5h.01',
  ],
  menu: ['M3.5 7h17', 'M3.5 12h17', 'M3.5 17h17'],
  close: ['M6 6l12 12', 'M18 6L6 18'],
  heart: [
    'M19 14c1.5-1.5 3-3.2 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.8 0-3 .5-4.5 2-1.5-1.5-2.7-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4 3 5.5l7 7Z',
  ],
  'heart-filled': [
    'M19 14c1.5-1.5 3-3.2 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.8 0-3 .5-4.5 2-1.5-1.5-2.7-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4 3 5.5l7 7Z',
  ],
  'arrow-right': ['M4 12h16', 'M14 6l6 6-6 6'],
  'arrow-left': ['M20 12H4', 'M10 6l-6 6 6 6'],
  'chevron-down': ['M6 9l6 6 6-6'],
  check: ['M4.5 12.5l5 5 10-11'],
  minus: ['M5 12h14'],
  plus: ['M12 5v14', 'M5 12h14'],
  trash: ['M3.5 6h17', 'M8 6V4h8v2', 'M6 6l1 14h10l1-14', 'M10 10.5v6', 'M14 10.5v6'],
  share: ['M12 3v12', 'M7.5 7.5 12 3l4.5 4.5', 'M5 12v8h14v-8'],
  reset: ['M3.5 12a8.5 8.5 0 1 0 2.5-6', 'M3.5 4v5h5'],
  info: ['M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z', 'M12 11v5', 'M12 7.5h.01'],
  alert: ['M12 3 2 20h20L12 3Z', 'M12 10v4', 'M12 17h.01'],
  search: ['M10.5 18a7.5 7.5 0 1 0 0-15 7.5 7.5 0 0 0 0 15Z', 'M16 16l5 5'],
  gift: [
    'M3 8h18v4H3z',
    'M5 12v9h14v-9',
    'M12 8v13',
    'M12 8C10 4 6.5 4 6.5 6.2S9.5 8 12 8c2.5 0 5.5 0 5.5-1.8S14 4 12 8Z',
  ],
  lock: ['M5 11h14v10H5z', 'M8 11V7a4 4 0 0 1 8 0v4'],
}
</script>

<template>
  <svg
    :width="props.size ?? 20"
    :height="props.size ?? 20"
    viewBox="0 0 24 24"
    :fill="name === 'heart-filled' ? 'currentColor' : 'none'"
    stroke="currentColor"
    stroke-width="1.75"
    stroke-linecap="round"
    stroke-linejoin="round"
    :role="label ? 'img' : undefined"
    :aria-label="label"
    :aria-hidden="label ? undefined : 'true'"
    focusable="false"
    class="shrink-0"
  >
    <path v-for="d in paths[name]" :key="d" :d="d" />
  </svg>
</template>
