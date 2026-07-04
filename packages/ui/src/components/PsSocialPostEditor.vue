<script setup lang="ts">
import type { SocialPlatform } from '@print-shop/types'
import { SOCIAL_PLATFORMS } from '@print-shop/types'
import { formatCents } from '@print-shop/utils'
import { computed, reactive, watch } from 'vue'
import { SOCIAL_PLATFORM_LABELS } from '../social.js'
import PsButton from './PsButton.vue'
import PsMediaPicker, { type MediaOption } from './PsMediaPicker.vue'
import PsScheduledDateTimePicker from './PsScheduledDateTimePicker.vue'
import PsSocialPostPreview from './PsSocialPostPreview.vue'
import PsTextarea from './PsTextarea.vue'

export interface SocialEditorProduct {
  id: string
  slug: string
  name: string
  description: string
  priceCents: number
  images: MediaOption[]
}

export interface SocialEditorValue {
  platforms: SocialPlatform[]
  caption: string
  mediaUrls: string[]
  productId: string | null
  scheduledAt: string | null
}

const CAPTION_MAX = 2200

/**
 * Presentational post editor: platform targets, product prefill, caption,
 * media, schedule time (local input, UTC model) and live preview. Data
 * loading/persisting stays in the page (emits saveDraft/schedule/cancel).
 */
const props = withDefaults(
  defineProps<{
    products: SocialEditorProduct[]
    /** Zusätzliche (hochgeladene) Medien neben den Produktbildern */
    extraMedia?: MediaOption[]
    initial?: Partial<SocialEditorValue>
    /** edit = eine bestehende Post-Zeile: Plattform fixiert */
    mode?: 'create' | 'edit'
    busy?: boolean
    /** Basis-URL des Shops für Produktlinks in der Vorschau/Caption */
    siteUrl?: string
    error?: string
  }>(),
  { mode: 'create', busy: false, siteUrl: '', extraMedia: () => [], error: '' },
)

const emit = defineEmits<{
  saveDraft: [value: SocialEditorValue]
  schedule: [value: SocialEditorValue]
  cancel: []
  upload: [file: File]
}>()

const form = reactive<SocialEditorValue>({
  platforms: props.initial?.platforms?.length ? [...props.initial.platforms] : ['instagram'],
  caption: props.initial?.caption ?? '',
  mediaUrls: props.initial?.mediaUrls ? [...props.initial.mediaUrls] : [],
  productId: props.initial?.productId ?? null,
  scheduledAt: props.initial?.scheduledAt ?? null,
})

const selectedProduct = computed(
  () => props.products.find((p) => p.id === form.productId) ?? null,
)

function productUrl(product: SocialEditorProduct): string {
  return `${props.siteUrl.replace(/\/$/, '')}/products/${product.slug}`
}

/** Vorbefüllung bei Produktwahl: Name, Beschreibung, Preis, Link + erstes Bild. */
watch(
  () => form.productId,
  (productId, previous) => {
    if (!productId || productId === previous) return
    const product = props.products.find((p) => p.id === productId)
    if (!product) return
    if (!form.caption.trim()) {
      form.caption = `${product.name}\n\n${product.description}\n\n${formatCents(product.priceCents)} · ${productUrl(product)}`
    }
    if (form.mediaUrls.length === 0 && product.images[0]) {
      form.mediaUrls = [product.images[0].url]
    }
  },
)

const mediaOptions = computed<MediaOption[]>(() => {
  const fromProduct = selectedProduct.value?.images ?? []
  const known = new Set([...fromProduct, ...props.extraMedia].map((m) => m.url))
  // keep already-selected urls visible even if the product changed
  const orphaned = form.mediaUrls.filter((url) => !known.has(url)).map((url) => ({ url }))
  return [...fromProduct, ...props.extraMedia, ...orphaned]
})

function togglePlatform(platform: SocialPlatform) {
  if (props.mode === 'edit') return
  form.platforms = form.platforms.includes(platform)
    ? form.platforms.filter((p) => p !== platform)
    : [...form.platforms, platform]
}

const captionCount = computed(() => `${form.caption.length}/${CAPTION_MAX}`)

const validationError = computed(() => {
  if (form.platforms.length === 0) return 'Mindestens eine Plattform wählen.'
  if (!form.caption.trim()) return 'Caption darf nicht leer sein.'
  if (form.caption.length > CAPTION_MAX) return `Caption ist zu lang (max. ${CAPTION_MAX} Zeichen).`
  return ''
})

const scheduleError = computed(() => {
  if (validationError.value) return validationError.value
  if (!form.scheduledAt) return 'Zum Planen wird ein Zeitpunkt benötigt.'
  if (form.platforms.includes('instagram') && form.mediaUrls.length === 0) {
    return 'Instagram-Posts benötigen mindestens ein Bild.'
  }
  return ''
})

function snapshot(): SocialEditorValue {
  return {
    platforms: [...form.platforms],
    caption: form.caption.trim(),
    mediaUrls: [...form.mediaUrls],
    productId: form.productId,
    scheduledAt: form.scheduledAt,
  }
}
</script>

<template>
  <div class="grid gap-lg lg:grid-cols-[1fr_auto]" data-testid="social-post-editor">
    <form class="flex min-w-0 flex-col gap-md" @submit.prevent>
      <fieldset class="flex flex-col gap-xs">
        <legend class="text-caption text-secondary">Plattformen<span class="text-brand"> *</span></legend>
        <div class="flex gap-md">
          <label
            v-for="platform in SOCIAL_PLATFORMS"
            :key="platform"
            class="flex items-center gap-sm text-body-regular"
            :class="mode === 'edit' && !form.platforms.includes(platform) ? 'opacity-40' : 'cursor-pointer'"
          >
            <input
              type="checkbox"
              :checked="form.platforms.includes(platform)"
              :disabled="mode === 'edit' || busy"
              :data-testid="`social-platform-${platform}`"
              @change="togglePlatform(platform)"
            />
            {{ SOCIAL_PLATFORM_LABELS[platform] }}
          </label>
        </div>
        <p v-if="mode === 'create'" class="text-caption text-secondary">
          „Beide" erzeugt einen eigenen Post pro Plattform.
        </p>
      </fieldset>

      <div class="flex flex-col gap-xs">
        <label for="social-product" class="text-caption text-secondary">Produkt (optional)</label>
        <select
          id="social-product"
          v-model="form.productId"
          :disabled="busy"
          class="w-full rounded-card border border-subtle bg-surface-elevated px-md py-md-sm text-body-regular text-primary focus:border-brand focus:outline-none disabled:opacity-50"
          data-testid="social-product-select"
        >
          <option :value="null">Kein Produkt</option>
          <option v-for="product in products" :key="product.id" :value="product.id">
            {{ product.name }} ({{ formatCents(product.priceCents) }})
          </option>
        </select>
        <p v-if="selectedProduct" class="text-caption text-secondary">
          Link: {{ productUrl(selectedProduct) }}
        </p>
      </div>

      <div class="flex flex-col gap-xs">
        <PsTextarea
          v-model="form.caption"
          label="Caption"
          required
          :rows="6"
          :disabled="busy"
          name="caption"
          data-testid="social-caption"
        />
        <p class="text-right text-caption" :class="form.caption.length > CAPTION_MAX ? 'text-red-500' : 'text-secondary'">
          {{ captionCount }}
        </p>
      </div>

      <PsMediaPicker
        v-model="form.mediaUrls"
        :options="mediaOptions"
        label="Medien"
        allow-upload
        :disabled="busy"
        @upload="emit('upload', $event)"
      />

      <PsScheduledDateTimePicker
        v-model="form.scheduledAt"
        label="Veröffentlichung (Datum & Uhrzeit)"
        :disabled="busy"
      />

      <p v-if="error" class="text-body-regular text-red-500" role="alert" data-testid="social-editor-error">
        {{ error }}
      </p>

      <div class="flex flex-wrap items-center gap-sm">
        <PsButton
          variant="secondary"
          :disabled="busy || Boolean(validationError)"
          data-testid="social-save-draft"
          @click="emit('saveDraft', snapshot())"
        >
          Als Entwurf speichern
        </PsButton>
        <PsButton
          :disabled="busy || Boolean(scheduleError)"
          :title="scheduleError || undefined"
          data-testid="social-schedule"
          @click="emit('schedule', snapshot())"
        >
          Planen
        </PsButton>
        <PsButton variant="ghost" :disabled="busy" data-testid="social-cancel" @click="emit('cancel')">
          Abbrechen
        </PsButton>
        <p v-if="scheduleError && !validationError" class="text-caption text-secondary">{{ scheduleError }}</p>
        <p v-if="validationError" class="text-caption text-red-500">{{ validationError }}</p>
      </div>
    </form>

    <PsSocialPostPreview
      :platforms="form.platforms"
      :caption="form.caption"
      :media-urls="form.mediaUrls"
      :product-name="selectedProduct?.name"
      :product-url="selectedProduct ? productUrl(selectedProduct) : null"
      :scheduled-at="form.scheduledAt"
    />
  </div>
</template>
