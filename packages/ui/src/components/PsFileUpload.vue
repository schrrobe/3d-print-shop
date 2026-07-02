<script setup lang="ts">
import { ref } from 'vue'
import PsButton from './PsButton.vue'

withDefaults(defineProps<{ accept?: string; multiple?: boolean }>(), {
  accept: '.stl,.3mf',
  multiple: false,
})

const emit = defineEmits<{ files: [files: File[]] }>()

const input = ref<HTMLInputElement | null>(null)
const selected = ref<File[]>([])

function formatSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${Math.max(1, Math.round(bytes / 1024))} KB`
}

function onChange(event: Event): void {
  const files = Array.from((event.target as HTMLInputElement).files ?? [])
  if (files.length === 0) return
  selected.value = files
  emit('files', files)
  if (input.value) input.value.value = ''
}

function removeFile(index: number): void {
  selected.value = selected.value.filter((_, i) => i !== index)
  emit('files', selected.value)
}
</script>

<template>
  <div class="flex flex-col gap-sm" data-testid="file-upload">
    <input
      ref="input"
      type="file"
      class="sr-only"
      :accept="accept"
      :multiple="multiple"
      aria-label="Datei auswählen"
      @change="onChange"
    />
    <PsButton variant="secondary" @click="input?.click()">
      <slot>Datei auswählen</slot>
    </PsButton>
    <ul v-if="selected.length > 0" class="flex flex-col gap-xs">
      <li
        v-for="(file, index) in selected"
        :key="`${file.name}-${index}`"
        class="flex items-center justify-between gap-md rounded-card border border-subtle bg-surface-elevated px-md py-sm text-body-regular text-primary"
      >
        <span class="truncate">{{ file.name }}</span>
        <span class="flex shrink-0 items-center gap-sm">
          <span class="text-caption text-secondary">{{ formatSize(file.size) }}</span>
          <button
            type="button"
            class="cursor-pointer rounded-full-pill p-xs text-secondary hover:bg-surface hover:text-primary focus-visible:outline-2 focus-visible:outline-brand"
            :aria-label="`${file.name} entfernen`"
            @click="removeFile(index)"
          >
            ✕
          </button>
        </span>
      </li>
    </ul>
  </div>
</template>
