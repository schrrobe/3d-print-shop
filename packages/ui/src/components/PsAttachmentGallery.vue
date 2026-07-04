<script setup lang="ts">
export interface PsAttachmentItem {
  id: string
  url: string
  name?: string
  sizeLabel?: string
}

withDefaults(
  defineProps<{
    attachments: PsAttachmentItem[]
    emptyText?: string
  }>(),
  { emptyText: 'Keine Fotos vorhanden' },
)

defineEmits<{
  select: [id: string]
}>()
</script>

<template>
  <div data-testid="attachment-gallery">
    <p v-if="attachments.length === 0" class="text-caption text-secondary">{{ emptyText }}</p>
    <div v-else class="grid grid-cols-[repeat(auto-fill,minmax(7rem,1fr))] gap-sm">
      <button
        v-for="attachment in attachments"
        :key="attachment.id"
        type="button"
        class="group flex cursor-pointer flex-col gap-xs text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        @click="$emit('select', attachment.id)"
      >
        <img
          :src="attachment.url"
          :alt="attachment.name ?? ''"
          class="aspect-square w-full rounded-card border border-subtle object-cover transition-colors group-hover:border-brand"
          loading="lazy"
        />
        <span v-if="attachment.name" class="truncate text-caption text-secondary">
          {{ attachment.name }}
        </span>
        <span v-if="attachment.sizeLabel" class="text-caption text-secondary">
          {{ attachment.sizeLabel }}
        </span>
      </button>
    </div>
  </div>
</template>
