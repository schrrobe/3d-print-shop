<script setup lang="ts">
import { ref } from 'vue'

export interface MediaOption {
  url: string
  alt?: string | null
}

/**
 * Grid picker for post media: toggles product images in/out of the selection,
 * optionally accepts new uploads (emits the file, the parent uploads it and
 * extends `options`).
 */
const props = withDefaults(
  defineProps<{
    options: MediaOption[]
    label?: string
    allowUpload?: boolean
    disabled?: boolean
    error?: string
  }>(),
  { allowUpload: false, disabled: false },
)

/** Selected media URLs, in selection order. */
const model = defineModel<string[]>({ default: () => [] })

const emit = defineEmits<{ upload: [file: File] }>()

const fileInput = ref<HTMLInputElement | null>(null)

function toggle(url: string) {
  if (props.disabled) return
  model.value = model.value.includes(url)
    ? model.value.filter((u) => u !== url)
    : [...model.value, url]
}

function onFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (file) emit('upload', file)
  input.value = ''
}
</script>

<template>
  <div class="flex flex-col gap-xs" data-testid="media-picker">
    <p v-if="label" class="text-caption text-secondary">{{ label }}</p>
    <p v-if="options.length === 0" class="rounded-card border border-subtle p-md text-body-regular text-secondary">
      Keine Medien verfügbar — Produkt wählen oder Bild hochladen.
    </p>
    <ul v-else class="grid grid-cols-3 gap-sm sm:grid-cols-4" role="listbox" aria-label="Medienauswahl" aria-multiselectable="true">
      <li v-for="option in options" :key="option.url">
        <button
          type="button"
          role="option"
          :aria-selected="model.includes(option.url)"
          :disabled="disabled"
          class="relative block w-full cursor-pointer overflow-hidden rounded-card border-2 transition-colors focus-visible:outline-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-50"
          :class="model.includes(option.url) ? 'border-brand' : 'border-subtle hover:border-brand/50'"
          data-testid="media-option"
          :data-url="option.url"
          :data-selected="model.includes(option.url) ? 'true' : 'false'"
          @click="toggle(option.url)"
        >
          <img :src="option.url" :alt="option.alt ?? ''" class="aspect-square w-full bg-surface-elevated object-cover" />
          <span
            v-if="model.includes(option.url)"
            class="absolute right-xs top-xs flex size-5 items-center justify-center rounded-full-pill bg-brand text-caption text-on-brand"
            aria-hidden="true"
          >
            ✓
          </span>
        </button>
      </li>
    </ul>
    <div v-if="allowUpload">
      <input ref="fileInput" type="file" accept=".jpg,.jpeg,.png,.webp" class="sr-only" data-testid="media-upload-input" @change="onFileChange" />
      <button
        type="button"
        :disabled="disabled"
        class="cursor-pointer rounded-card border border-dashed border-subtle px-md py-sm text-caption text-secondary transition-colors hover:border-brand hover:text-primary focus-visible:outline-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-50"
        data-testid="media-upload"
        @click="fileInput?.click()"
      >
        + Bild hochladen (JPG, PNG, WebP)
      </button>
    </div>
    <p v-if="error" class="text-caption text-red-500" role="alert">{{ error }}</p>
  </div>
</template>
