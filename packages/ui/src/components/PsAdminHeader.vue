<script setup lang="ts">
defineProps<{
  title: string
  userName?: string
  roleLabel?: string
}>()
</script>

<template>
  <header
    class="flex items-center justify-between gap-md border-b border-subtle bg-surface px-lg py-md"
    data-testid="admin-header"
  >
    <h1 class="text-heading-small text-primary">{{ title }}</h1>
    <div class="flex items-center gap-md">
      <slot name="actions" />
      <div v-if="userName" class="flex flex-col items-end">
        <span class="text-label-medium text-primary">{{ userName }}</span>
        <span v-if="roleLabel" class="text-caption text-secondary">{{ roleLabel }}</span>
      </div>
    </div>
  </header>
</template>
