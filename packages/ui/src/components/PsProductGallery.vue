<script setup lang="ts">
import { computed, ref, watch } from 'vue'

export interface PsProductGalleryImage {
  url: string
  alt?: string | null
  srcset?: string
  sizes?: string
  thumbUrl?: string
}

const props = withDefaults(
  defineProps<{
    images: PsProductGalleryImage[]
    placeholderLabel?: string
  }>(),
  { placeholderLabel: '' },
)

const activeIndex = ref(0)
// Clamp so the main image stays valid if `images` shrinks (e.g. after a delete).
const safeIndex = computed(() => Math.min(activeIndex.value, Math.max(props.images.length - 1, 0)))
const activeImage = computed(() => props.images[safeIndex.value] ?? null)

// Reset to the first photo when the image list is swapped (e.g. navigating between
// products, where Nuxt reuses the same page component instance).
watch(
  () => props.images,
  () => {
    activeIndex.value = 0
  },
)
</script>

<template>
  <div data-testid="product-gallery">
    <!-- Main image -->
    <div
      class="relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-card border border-subtle bg-surface"
    >
      <img
        v-if="activeImage"
        :src="activeImage.url"
        :srcset="activeImage.srcset"
        :sizes="activeImage.sizes"
        :alt="activeImage.alt ?? ''"
        class="size-full object-cover"
        fetchpriority="high"
        data-testid="product-gallery-main"
      />
      <div
        v-else
        class="flex flex-col items-center gap-sm text-secondary"
        data-testid="product-gallery-placeholder"
      >
        <svg
          width="72"
          height="72"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.2"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path d="M12 2 3 7v10l9 5 9-5V7l-9-5Z" />
          <path d="M3 7l9 5 9-5" />
          <path d="M12 12v10" />
        </svg>
        <span v-if="placeholderLabel" class="text-caption">{{ placeholderLabel }}</span>
      </div>
    </div>

    <!-- Thumbnails (only when there is more than one photo) -->
    <div
      v-if="images.length > 1"
      class="mt-sm flex flex-wrap gap-sm"
      data-testid="product-gallery-thumbs"
    >
      <button
        v-for="(image, index) in images"
        :key="index"
        type="button"
        class="size-16 overflow-hidden rounded-card border transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        :class="index === safeIndex ? 'border-brand' : 'border-subtle hover:border-brand'"
        :aria-current="index === safeIndex ? 'true' : undefined"
        :aria-label="image.alt ?? `Bild ${index + 1}`"
        data-testid="product-gallery-thumb"
        @click="activeIndex = index"
      >
        <img
          :src="image.thumbUrl ?? image.url"
          :alt="image.alt ?? ''"
          class="size-full object-cover"
          loading="lazy"
        />
      </button>
    </div>
  </div>
</template>
