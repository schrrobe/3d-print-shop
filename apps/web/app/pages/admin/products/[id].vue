<script setup lang="ts">
import {
  PsBadge,
  PsButton,
  PsCard,
  PsDialog,
  PsInput,
  PsSelect,
  PsTabs,
  PsTextarea,
  PsUploadDropzone,
  useToast,
} from '@print-shop/ui'
import { COLOR_ZONE_SLOTS, LOCALES, MAX_PRODUCT_IMAGES } from '@print-shop/types'
import type { AdminColorDto, AdminProductDetailDto, ColorZoneSlot, Locale } from '@print-shop/types'

definePageMeta({ layout: 'admin', middleware: 'admin-auth' })

const route = useRoute()
const toast = useToast()
const auth = useAdminAuthStore()
const productId = String(route.params.id)

const { data, refresh } = await useFetch<{ product: AdminProductDetailDto }>(
  `/api/admin/products/${productId}`,
  { credentials: 'include', server: false },
)
const { data: colorData } = await useFetch<{ colors: AdminColorDto[] }>('/api/admin/colors', {
  credentials: 'include',
  server: false,
})

const product = computed(() => data.value?.product)
const glbAsset = computed(() => product.value?.assets.find((a) => a.type === 'glb_preview'))

const form = reactive({ slug: '', priceEuros: '', active: false })

type TranslationForm = {
  name: string
  description: string
  seoTitle: string
  seoDescription: string
}
const emptyTranslation = (): TranslationForm => ({
  name: '',
  description: '',
  seoTitle: '',
  seoDescription: '',
})
const translations = reactive(
  Object.fromEntries(LOCALES.map((l) => [l, emptyTranslation()])) as Record<
    Locale,
    TranslationForm
  >,
)

const ZONE_DEFAULT_LABELS: Record<ColorZoneSlot, string> = {
  zone_1_main: 'Hauptfarbe',
  zone_2_accent: 'Akzentfarbe',
  zone_3_detail: 'Detailfarbe',
  zone_4_text: 'Textfarbe',
}
type SlotForm = { enabled: boolean; label: string; defaultColorId: string }
// 'none' sentinel: Radix SelectItem forbids empty-string values
const NO_DEFAULT_COLOR = 'none'
const slots = reactive(
  Object.fromEntries(
    COLOR_ZONE_SLOTS.map((s) => [
      s,
      { enabled: false, label: '', defaultColorId: NO_DEFAULT_COLOR },
    ]),
  ) as Record<ColorZoneSlot, SlotForm>,
)

watch(
  product,
  (p) => {
    if (!p) return
    form.slug = p.slug
    form.priceEuros = (p.priceCents / 100).toFixed(2).replace('.', ',')
    form.active = p.active
    for (const locale of LOCALES) {
      const t = p.translations.find((x) => x.locale === locale)
      translations[locale] = {
        name: t?.name ?? '',
        description: t?.description ?? '',
        seoTitle: t?.seoTitle ?? '',
        seoDescription: t?.seoDescription ?? '',
      }
    }
    for (const zone of COLOR_ZONE_SLOTS) {
      const s = p.colorSlots.find((x) => x.slot === zone)
      slots[zone] = {
        enabled: Boolean(s),
        label: s?.label ?? '',
        defaultColorId: s?.defaultColorId ?? NO_DEFAULT_COLOR,
      }
    }
  },
  { immediate: true },
)

function onZoneToggle(zone: ColorZoneSlot) {
  if (slots[zone].enabled && !slots[zone].label.trim()) {
    slots[zone].label = ZONE_DEFAULT_LABELS[zone]
  }
}

const localeTabs = computed(() =>
  LOCALES.map((l) => ({
    value: l,
    label: `${l.toUpperCase()}${translations[l].name.trim() ? ' ●' : ''}`,
  })),
)
const activeLocaleTab = ref<string>('de')

const colorOptions = computed(() => [
  { value: NO_DEFAULT_COLOR, label: '– kein Standard –' },
  ...(colorData.value?.colors ?? []).map((c) => ({ value: c.id, label: c.name })),
])

const { run, pending: saving } = useAdminAction({ refresh })

async function save() {
  if (!translations.de.name.trim()) {
    toast.show('Deutscher Name ist Pflicht', { variant: 'error' })
    activeLocaleTab.value = 'de'
    return
  }
  const priceCents = Math.round(Number(form.priceEuros.replace(',', '.')) * 100)
  if (!Number.isFinite(priceCents) || priceCents < 0) {
    toast.show('Ungültiger Preis', { variant: 'error' })
    return
  }
  const payload = {
    slug: form.slug,
    priceCents,
    active: form.active,
    translations: LOCALES.filter((l) => translations[l].name.trim() !== '').map((l) => ({
      locale: l,
      name: translations[l].name.trim(),
      description: translations[l].description,
      seoTitle: translations[l].seoTitle.trim() || null,
      seoDescription: translations[l].seoDescription.trim() || null,
    })),
    colorSlots: COLOR_ZONE_SLOTS.filter((z) => slots[z].enabled).map((z) => ({
      slot: z,
      label: slots[z].label.trim() || ZONE_DEFAULT_LABELS[z],
      defaultColorId: slots[z].defaultColorId === NO_DEFAULT_COLOR ? null : slots[z].defaultColorId,
    })),
  }
  await run(
    () =>
      $fetch(`/api/admin/products/${productId}`, {
        method: 'PATCH',
        credentials: 'include',
        body: payload,
      }),
    { success: 'Gespeichert', error: 'Speichern fehlgeschlagen (Slug bereits vergeben?)' },
  )
}

async function uploadModel(files: File[]) {
  const file = files[0]
  if (!file) return
  const body = new FormData()
  body.append('file', file)
  await run(
    () =>
      $fetch(`/api/admin/products/${productId}/model`, {
        method: 'POST',
        credentials: 'include',
        body,
      }),
    { success: '3D-Modell hochgeladen', error: 'Upload fehlgeschlagen' },
  )
}

type ProductImageAsset = AdminProductDetailDto['assets'][number]
const imageAssets = computed<ProductImageAsset[]>(() =>
  [...(product.value?.assets.filter((a) => a.type === 'image') ?? [])].sort(
    (a, b) => a.sortOrder - b.sortOrder,
  ),
)

async function uploadImages(files: File[]) {
  const remaining = MAX_PRODUCT_IMAGES - imageAssets.value.length
  if (remaining <= 0) {
    toast.show(`Maximal ${MAX_PRODUCT_IMAGES} Fotos`, { variant: 'error' })
    return
  }
  if (files.length > remaining) {
    toast.show(`Nur noch ${remaining} Foto(s) möglich`, { variant: 'error' })
  }
  const body = new FormData()
  for (const file of files.slice(0, remaining)) body.append('files', file)
  await run(
    () =>
      $fetch(`/api/admin/products/${productId}/images`, {
        method: 'POST',
        credentials: 'include',
        body,
      }),
    { success: 'Fotos hochgeladen', error: 'Upload fehlgeschlagen' },
  )
}

async function saveAssetAlt(asset: ProductImageAsset) {
  await run(
    () =>
      $fetch(`/api/admin/products/${productId}/assets/${asset.id}`, {
        method: 'PATCH',
        credentials: 'include',
        body: { alt: asset.alt?.trim() || null },
      }),
    { success: 'Alt-Text gespeichert', error: 'Alt-Text speichern fehlgeschlagen' },
  )
}

async function reorderImages(assetIds: string[]) {
  await run(
    () =>
      $fetch(`/api/admin/products/${productId}/images/order`, {
        method: 'PATCH',
        credentials: 'include',
        body: { assetIds },
      }),
    { success: 'Bildreihenfolge gespeichert', error: 'Bildreihenfolge speichern fehlgeschlagen' },
  )
}

async function setCoverPhoto(assetId: string) {
  await reorderImages([
    assetId,
    ...imageAssets.value.filter((asset) => asset.id !== assetId).map((asset) => asset.id),
  ])
}

async function movePhoto(assetId: string, direction: -1 | 1) {
  const ids = imageAssets.value.map((asset) => asset.id)
  const index = ids.indexOf(assetId)
  const nextIndex = index + direction
  if (index < 0 || nextIndex < 0 || nextIndex >= ids.length) return
  const current = ids[index]
  const next = ids[nextIndex]
  if (!current || !next) return
  ids[index] = next
  ids[nextIndex] = current
  await reorderImages(ids)
}

function imagePreviewUrl(url: string): string {
  return url.startsWith('/api/product-images/') ? `${url}?w=320` : url
}

// Confirm before deleting a photo — the DELETE also unlinks the file server-side.
const pendingDeleteAssetId = ref<string | null>(null)

async function deleteAsset() {
  const assetId = pendingDeleteAssetId.value
  if (!assetId) return
  const ok = await run(
    () =>
      $fetch(`/api/admin/products/${productId}/assets/${assetId}`, {
        method: 'DELETE',
        credentials: 'include',
      }),
    { success: 'Foto entfernt', error: 'Entfernen fehlgeschlagen' },
  )
  if (ok) pendingDeleteAssetId.value = null
}

const deleteDialogOpen = ref(false)

async function deleteProduct() {
  const ok = await run(
    () =>
      $fetch(`/api/admin/products/${productId}`, {
        method: 'DELETE',
        credentials: 'include',
      }),
    { success: 'Produkt gelöscht', error: 'Löschen fehlgeschlagen', refresh: false },
  )
  if (!ok) return
  // close the modal before navigating — the Radix portal otherwise outlives the page
  deleteDialogOpen.value = false
  await nextTick()
  await navigateTo('/admin/products')
}
</script>

<template>
  <div v-if="product" class="flex flex-col gap-lg" data-testid="admin-product-detail">
    <div class="flex flex-wrap items-center gap-md">
      <h2 class="text-heading-small">{{ translations.de.name || product.slug }}</h2>
      <PsBadge :variant="form.active ? 'brand' : 'default'">
        {{ form.active ? 'aktiv' : 'inaktiv' }}
      </PsBadge>
    </div>

    <PsCard>
      <h3 class="text-label-medium">Stammdaten</h3>
      <div class="mt-md grid gap-md sm:grid-cols-2">
        <div>
          <PsInput
            v-model="form.slug"
            label="Slug (kebab-case)"
            name="slug"
            :disabled="!auth.can('products:write')"
          />
          <p class="mt-xs text-caption text-secondary">Achtung: ändert die öffentliche URL.</p>
        </div>
        <PsInput
          v-model="form.priceEuros"
          label="Preis (EUR)"
          name="priceEuros"
          :disabled="!auth.can('products:write')"
        />
      </div>
      <label class="mt-md flex items-center gap-sm text-body-regular">
        <input
          v-model="form.active"
          type="checkbox"
          :disabled="!auth.can('products:write')"
          data-testid="product-active"
        />
        Im Shop sichtbar
      </label>
    </PsCard>

    <PsCard>
      <h3 class="text-label-medium">Übersetzungen</h3>
      <p class="mt-xs text-caption text-secondary">
        Deutsch ist Pflicht. Leere Sprachen fallen im Shop auf Deutsch zurück.
      </p>
      <div class="mt-md">
        <PsTabs v-model="activeLocaleTab" :tabs="localeTabs">
          <template v-for="locale in LOCALES" :key="locale" #[locale]>
            <div class="flex flex-col gap-md">
              <PsInput
                v-model="translations[locale].name"
                :label="`Name (${locale})`"
                :name="`name-${locale}`"
                :required="locale === 'de'"
                :disabled="!auth.can('products:write')"
              />
              <PsTextarea
                v-model="translations[locale].description"
                :label="`Beschreibung (${locale})`"
                :name="`description-${locale}`"
                :rows="4"
                :disabled="!auth.can('products:write')"
              />
              <div class="grid gap-md sm:grid-cols-2">
                <PsInput
                  v-model="translations[locale].seoTitle"
                  :label="`SEO-Titel (${locale}, optional)`"
                  :name="`seoTitle-${locale}`"
                  :disabled="!auth.can('products:write')"
                />
                <PsInput
                  v-model="translations[locale].seoDescription"
                  :label="`SEO-Beschreibung (${locale}, optional)`"
                  :name="`seoDescription-${locale}`"
                  :disabled="!auth.can('products:write')"
                />
              </div>
            </div>
          </template>
        </PsTabs>
      </div>
    </PsCard>

    <PsCard>
      <h3 class="text-label-medium">Farbzonen</h3>
      <p class="mt-xs text-caption text-secondary">
        Zonen entsprechen den Mesh-Namen im GLB (zone_1_main …). Max. 4.
      </p>
      <div class="mt-md flex flex-col gap-md">
        <div
          v-for="zone in COLOR_ZONE_SLOTS"
          :key="zone"
          class="grid items-end gap-md sm:grid-cols-[auto_1fr_1fr]"
        >
          <label class="flex items-center gap-sm pb-sm text-body-regular">
            <input
              v-model="slots[zone].enabled"
              type="checkbox"
              :data-testid="`slot-enable-${zone}`"
              :disabled="!auth.can('products:write')"
              @change="onZoneToggle(zone)"
            />
            <code class="text-caption">{{ zone }}</code>
          </label>
          <PsInput
            v-model="slots[zone].label"
            label="Bezeichnung"
            :name="`slot-label-${zone}`"
            :data-testid="`slot-label-${zone}`"
            :disabled="!slots[zone].enabled || !auth.can('products:write')"
          />
          <PsSelect
            v-model="slots[zone].defaultColorId"
            label="Standardfarbe"
            :options="colorOptions"
            :data-testid="`slot-default-${zone}`"
            :disabled="!slots[zone].enabled || !auth.can('products:write')"
          />
        </div>
      </div>
    </PsCard>

    <PsCard>
      <h3 class="text-label-medium">Produktfotos (max. 4)</h3>
      <p class="mt-xs text-caption text-secondary">
        Werden oben auf der Produktseite und im Shop-Listing angezeigt. JPG, PNG oder WebP, je max.
        10 MB.
      </p>
      <div
        v-if="imageAssets.length"
        class="mt-md grid grid-cols-[repeat(auto-fill,minmax(8rem,1fr))] gap-md"
        data-testid="product-photos"
      >
        <div
          v-for="(asset, index) in imageAssets"
          :key="asset.id"
          class="flex flex-col gap-xs"
          data-testid="product-photo"
        >
          <PsBadge v-if="index === 0" variant="brand">Cover</PsBadge>
          <img
            :src="imagePreviewUrl(asset.url)"
            :alt="asset.alt ?? ''"
            class="aspect-square w-full rounded-card border border-subtle object-cover"
          />
          <PsInput
            :model-value="asset.alt ?? ''"
            label="Alt-Text"
            :name="`photo-alt-${asset.id}`"
            data-testid="photo-alt"
            :disabled="!auth.can('assets:write')"
            @update:model-value="(value: string) => (asset.alt = value)"
          />
          <div v-if="auth.can('assets:write')" class="grid grid-cols-3 gap-xs">
            <PsButton
              variant="ghost"
              size="sm"
              data-testid="set-cover-photo"
              :disabled="index === 0"
              @click="setCoverPhoto(asset.id)"
            >
              Cover
            </PsButton>
            <PsButton
              variant="ghost"
              size="sm"
              data-testid="move-photo-up"
              :disabled="index === 0"
              @click="movePhoto(asset.id, -1)"
            >
              Hoch
            </PsButton>
            <PsButton
              variant="ghost"
              size="sm"
              data-testid="move-photo-down"
              :disabled="index === imageAssets.length - 1"
              @click="movePhoto(asset.id, 1)"
            >
              Runter
            </PsButton>
          </div>
          <PsButton
            v-if="auth.can('assets:write')"
            variant="ghost"
            data-testid="save-photo-alt"
            @click="saveAssetAlt(asset)"
          >
            Alt-Text speichern
          </PsButton>
          <PsButton
            v-if="auth.can('assets:write')"
            variant="ghost"
            data-testid="delete-photo"
            @click="pendingDeleteAssetId = asset.id"
          >
            Entfernen
          </PsButton>
        </div>
      </div>
      <p v-else class="mt-sm text-body-regular text-secondary" data-testid="product-photos-empty">
        Noch keine Fotos — der Shop zeigt einen Platzhalter.
      </p>
      <div
        v-if="auth.can('assets:write') && imageAssets.length < MAX_PRODUCT_IMAGES"
        class="mt-md"
        data-testid="photo-upload"
      >
        <PsUploadDropzone
          accept=".jpg,.jpeg,.png,.webp"
          :multiple="true"
          :max-size-bytes="10485760"
          @files="uploadImages"
          @error="(msg: string) => toast.show(msg, { variant: 'error' })"
        />
      </div>
      <p v-else-if="auth.can('assets:write')" class="mt-md text-caption text-secondary">
        Maximum von {{ MAX_PRODUCT_IMAGES }} Fotos erreicht.
      </p>
    </PsCard>

    <PsCard>
      <h3 class="text-label-medium">3D-Modell (GLB)</h3>
      <p v-if="glbAsset" class="mt-sm text-body-regular" data-testid="model-asset-url">
        Aktuelles Modell: <code class="text-caption">{{ glbAsset.url }}</code>
      </p>
      <p v-else class="mt-sm text-body-regular text-secondary" data-testid="model-asset-missing">
        Kein Modell hochgeladen — der Shop zeigt ein Fallback-Modell.
      </p>
      <div v-if="auth.can('assets:write')" class="mt-md" data-testid="model-upload">
        <PsUploadDropzone
          accept=".glb"
          :multiple="false"
          @files="uploadModel"
          @error="(msg: string) => toast.show(msg, { variant: 'error' })"
        />
      </div>
    </PsCard>

    <div
      v-if="auth.can('products:write')"
      class="flex flex-wrap items-center justify-between gap-md"
    >
      <PsButton data-testid="save-product-detail" :disabled="saving" @click="save">
        Speichern
      </PsButton>
      <PsButton variant="ghost" data-testid="delete-product" @click="deleteDialogOpen = true">
        Produkt löschen
      </PsButton>
    </div>

    <PsDialog v-model:open="deleteDialogOpen" title="Produkt löschen">
      <p class="text-body-regular">
        „{{ translations.de.name || product.slug }}“ endgültig löschen? Bestellungen behalten ihren
        Namens-Snapshot, offene Warenkörbe verlieren die Position.
      </p>
      <div class="mt-lg flex justify-end gap-md">
        <PsButton variant="ghost" @click="deleteDialogOpen = false">Abbrechen</PsButton>
        <PsButton data-testid="confirm-delete-product" @click="deleteProduct">Löschen</PsButton>
      </div>
    </PsDialog>

    <PsDialog
      :open="pendingDeleteAssetId !== null"
      title="Foto entfernen"
      @update:open="
        (open: boolean) => {
          if (!open) pendingDeleteAssetId = null
        }
      "
    >
      <p class="text-body-regular">Dieses Foto wirklich entfernen? Die Datei wird gelöscht.</p>
      <div class="mt-lg flex justify-end gap-md">
        <PsButton variant="ghost" @click="pendingDeleteAssetId = null">Abbrechen</PsButton>
        <PsButton data-testid="confirm-delete-photo" @click="deleteAsset">Entfernen</PsButton>
      </div>
    </PsDialog>
  </div>
</template>
