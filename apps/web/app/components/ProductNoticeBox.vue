<script setup lang="ts">
type NoticeIcon = 'production' | 'images' | 'info' | 'warning'

withDefaults(
  defineProps<{
    title: string
    text: string
    icon?: NoticeIcon
  }>(),
  {
    icon: 'info',
  },
)
</script>

<template>
  <aside
    class="rounded-card border border-amber-500/40 bg-amber-500/5 p-md"
    role="note"
  >
    <div class="flex items-center gap-md">
      <span
        class="inline-flex size-10 shrink-0 items-center justify-center rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-300"
        aria-hidden="true"
      >
        <svg
          v-if="icon === 'production'"
          class="size-5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.8"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M5 7.5 12 4l7 3.5-7 3.5-7-3.5Z" />
          <path d="m5 12 7 3.5 7-3.5" />
          <path d="m5 16.5 7 3.5 7-3.5" />
        </svg>
        <svg
          v-else-if="icon === 'images'"
          class="size-5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.8"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <rect x="3.5" y="5" width="17" height="14" rx="2" />
          <circle cx="8.5" cy="9.5" r="1.4" />
          <path d="m6 17 4.2-4.2a1.5 1.5 0 0 1 2.1 0L17 17" />
          <path d="m14.5 14.5 1.2-1.2a1.5 1.5 0 0 1 2.1 0L20.5 16" />
        </svg>
        <svg
          v-else-if="icon === 'warning'"
          class="size-5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.8"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M10.3 4.3 2.7 17.5A2 2 0 0 0 4.4 20h15.2a2 2 0 0 0 1.7-2.5L13.7 4.3a2 2 0 0 0-3.4 0Z" />
          <path d="M12 8.5v4.5" />
          <path d="M12 16.5h.01" />
        </svg>
        <svg
          v-else
          class="size-5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.8"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <circle cx="12" cy="12" r="8.5" />
          <path d="M12 11.5v4.5" />
          <path d="M12 8h.01" />
        </svg>
      </span>

      <div>
        <h2 class="text-label-medium">{{ title }}</h2>
        <p class="mt-sm text-body-regular text-secondary">
          {{ text }}
        </p>
      </div>
    </div>
  </aside>
</template>
