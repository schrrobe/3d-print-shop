<script setup lang="ts">
import { ref, watch } from 'vue'
import PsProductPlaceholder from './PsProductPlaceholder.vue'

export interface PsProductGalleryImage {
  id: string
  url: string
  alt: string | null
}

const props = withDefaults(
  defineProps<{
    images: PsProductGalleryImage[]
    placeholderLabel?: string
    thumbnailLabel?: (index: number) => string
  }>(),
  { placeholderLabel: '', thumbnailLabel: undefined },
)

const activeIndex = ref(0)

watch(
  () => props.images.map((image) => image.id).join('\u0000'),
  () => {
    activeIndex.value = 0
  },
)
</script>

<template>
  <div data-testid="product-gallery">
    <div
      class="flex aspect-square w-full items-center justify-center overflow-hidden rounded-card border border-subtle bg-surface"
    >
      <img
        v-if="images.length > 0"
        :src="images[activeIndex]?.url"
        :alt="images[activeIndex]?.alt ?? ''"
        class="size-full object-cover"
        data-testid="gallery-main-image"
      />
      <div v-else class="flex flex-col items-center gap-sm" data-testid="gallery-placeholder">
        <PsProductPlaceholder :size="96" />
        <span v-if="placeholderLabel" class="text-caption text-secondary">
          {{ placeholderLabel }}
        </span>
      </div>
    </div>
    <div v-if="images.length > 1" class="mt-sm grid grid-cols-4 gap-sm">
      <button
        v-for="(image, index) in images"
        :key="image.id"
        type="button"
        class="overflow-hidden rounded-card border transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        :class="index === activeIndex ? 'border-brand' : 'border-subtle hover:border-brand'"
        :aria-pressed="index === activeIndex"
        :aria-label="thumbnailLabel ? thumbnailLabel(index) : undefined"
        data-testid="gallery-thumb"
        @click="activeIndex = index"
      >
        <img
          :src="image.url"
          :alt="image.alt ?? ''"
          class="aspect-square w-full object-cover"
          loading="lazy"
        />
      </button>
    </div>
  </div>
</template>
