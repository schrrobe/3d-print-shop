<script setup lang="ts">
withDefaults(defineProps<{ size?: number }>(), { size: 64 })
</script>

<template>
  <div class="text-secondary" aria-hidden="true">
    <svg
      :width="size"
      :height="size"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.2"
      stroke-linejoin="round"
    >
      <path d="M12 2 3 7v10l9 5 9-5V7l-9-5Z" />
      <path d="M3 7l9 5 9-5" />
      <path d="M12 12v10" />
    </svg>
  </div>
</template>
