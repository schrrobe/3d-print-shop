<script setup lang="ts">
withDefaults(
  defineProps<{
    items: { key: string; label: string; href: string; icon?: string; active?: boolean }[]
    title?: string
  }>(),
  { title: 'Print Shop Admin' },
)
</script>

<template>
  <nav
    class="flex h-full min-h-0 w-64 flex-col gap-lg border-r border-subtle bg-surface-elevated p-md"
    aria-label="Admin-Navigation"
    data-testid="admin-sidebar"
  >
    <span class="px-md text-label-medium text-primary">{{ title }}</span>
    <ul class="flex flex-1 flex-col gap-xs">
      <li v-for="item in items" :key="item.key">
        <a
          :href="item.href"
          class="flex items-center gap-sm rounded-card px-md py-md-sm text-body-regular transition-colors focus-visible:outline-2 focus-visible:outline-brand"
          :class="
            item.active
              ? 'bg-brand text-on-brand'
              : 'text-primary hover:bg-surface'
          "
          :aria-current="item.active ? 'page' : undefined"
          :data-nav-item="item.key"
        >
          <span v-if="item.icon" aria-hidden="true">{{ item.icon }}</span>
          {{ item.label }}
        </a>
      </li>
    </ul>
    <div v-if="$slots.footer" class="border-t border-subtle pt-md">
      <slot name="footer" />
    </div>
  </nav>
</template>
