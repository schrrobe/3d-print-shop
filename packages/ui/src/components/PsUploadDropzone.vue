<script setup lang="ts">
import { computed, ref } from 'vue'

const props = withDefaults(
  defineProps<{ accept?: string; multiple?: boolean; maxSizeBytes?: number }>(),
  { accept: '.stl,.3mf', multiple: true, maxSizeBytes: 52428800 },
)

const emit = defineEmits<{ files: [files: File[]]; error: [message: string] }>()

const input = ref<HTMLInputElement | null>(null)
const dragging = ref(false)

const allowedExtensions = computed(() =>
  props.accept
    .split(',')
    .map((ext) => ext.trim().toLowerCase())
    .filter((ext) => ext.startsWith('.')),
)

function formatSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(0)} MB`
  return `${Math.max(1, Math.round(bytes / 1024))} KB`
}

function processFiles(list: FileList | File[] | null): void {
  let files = Array.from(list ?? [])
  if (files.length === 0) return
  if (!props.multiple) files = files.slice(0, 1)

  const valid: File[] = []
  for (const file of files) {
    const extension = `.${file.name.split('.').pop()?.toLowerCase() ?? ''}`
    if (!allowedExtensions.value.includes(extension)) {
      emit('error', `„${file.name}“ hat ein ungültiges Format. Erlaubt: ${props.accept}`)
      continue
    }
    if (file.size > props.maxSizeBytes) {
      emit(
        'error',
        `„${file.name}“ ist zu groß (max. ${formatSize(props.maxSizeBytes)}).`,
      )
      continue
    }
    valid.push(file)
  }
  if (valid.length > 0) emit('files', valid)
}

function onDrop(event: DragEvent): void {
  dragging.value = false
  processFiles(event.dataTransfer?.files ?? null)
}

function onChange(event: Event): void {
  const target = event.target as HTMLInputElement
  processFiles(target.files)
  target.value = ''
}
</script>

<template>
  <button
    type="button"
    class="flex w-full cursor-pointer flex-col items-center justify-center gap-sm rounded-card border-2 border-dashed p-3xl text-center transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
    :class="dragging ? 'border-brand bg-brand/5' : 'border-subtle hover:border-brand'"
    data-testid="upload-dropzone"
    @click="input?.click()"
    @dragover.prevent="dragging = true"
    @dragleave.prevent="dragging = false"
    @drop.prevent="onDrop"
  >
    <input
      ref="input"
      type="file"
      class="sr-only"
      tabindex="-1"
      :accept="accept"
      :multiple="multiple"
      aria-hidden="true"
      @change="onChange"
      @click.stop
    />
    <span class="text-label-medium text-primary">
      <slot>Dateien hierher ziehen oder klicken</slot>
    </span>
    <span class="text-caption text-secondary">
      {{ accept.toUpperCase() }} · max. {{ formatSize(maxSizeBytes) }}
    </span>
  </button>
</template>
