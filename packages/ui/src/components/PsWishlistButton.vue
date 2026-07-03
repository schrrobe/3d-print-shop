<script setup lang="ts">
withDefaults(
  defineProps<{
    active: boolean
    /** Accessible label when the item is not yet on the wishlist (i18n via prop). */
    labelAdd: string
    /** Accessible label when the item is on the wishlist (i18n via prop). */
    labelRemove: string
    size?: 'sm' | 'md'
  }>(),
  { size: 'md' },
)

defineEmits<{ toggle: [] }>()
</script>

<template>
  <button
    type="button"
    :aria-pressed="active"
    :aria-label="active ? labelRemove : labelAdd"
    class="inline-flex shrink-0 cursor-pointer items-center justify-center rounded-full-pill border border-subtle bg-surface-elevated transition-colors duration-200 hover:border-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
    :class="size === 'sm' ? 'size-8' : 'size-10'"
    data-testid="wishlist-button"
    @click="$emit('toggle')"
  >
    <svg
      viewBox="0 0 24 24"
      :class="[size === 'sm' ? 'size-4' : 'size-5', active ? 'text-brand' : 'text-primary']"
      :fill="active ? 'currentColor' : 'none'"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <path
        d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
      />
    </svg>
  </button>
</template>
