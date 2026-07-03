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
import { COLOR_ZONE_SLOTS, LOCALES } from '@print-shop/types'
import type { ColorZoneSlot, Locale } from '@print-shop/types'

definePageMeta({ layout: 'admin', middleware: 'admin-auth' })

interface AdminProductDetail {
  id: string
  slug: string
  priceCents: number
  active: boolean
  translations: {
    locale: Locale
    name: string
    description: string
    seoTitle: string | null
    seoDescription: string | null
  }[]
  assets: { id: string; type: string; url: string; alt: string | null; sortOrder: number }[]
  colorSlots: { slot: ColorZoneSlot; label: string; defaultColorId: string | null }[]
}

interface AdminColor {
  id: string
  name: string
  hex: string
  active: boolean
}

const route = useRoute()
const toast = useToast()
const auth = useAdminAuthStore()
const productId = String(route.params.id)

const { data, refresh } = await useFetch<{ product: AdminProductDetail }>(
  `/api/admin/products/${productId}`,
  { credentials: 'include', server: false },
)
const { data: colorData } = await useFetch<{ colors: AdminColor[] }>('/api/admin/colors', {
  credentials: 'include',
  server: false,
})

const product = computed(() => data.value?.product)
const glbAsset = computed(() => product.value?.assets.find((a) => a.type === 'glb_preview'))

const form = reactive({ slug: '', priceEuros: '', active: false })

type TranslationForm = { name: string; description: string; seoTitle: string; seoDescription: string }
const emptyTranslation = (): TranslationForm => ({
  name: '',
  description: '',
  seoTitle: '',
  seoDescription: '',
})
const translations = reactive(
  Object.fromEntries(LOCALES.map((l) => [l, emptyTranslation()])) as Record<Locale, TranslationForm>,
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
    COLOR_ZONE_SLOTS.map((s) => [s, { enabled: false, label: '', defaultColorId: NO_DEFAULT_COLOR }]),
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

const saving = ref(false)

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
      defaultColorId:
        slots[z].defaultColorId === NO_DEFAULT_COLOR ? null : slots[z].defaultColorId,
    })),
  }
  saving.value = true
  try {
    await $fetch(`/api/admin/products/${productId}`, {
      method: 'PATCH',
      credentials: 'include',
      body: payload,
    })
    toast.show('Gespeichert', { variant: 'success' })
    await refresh()
  } catch {
    toast.show('Speichern fehlgeschlagen (Slug bereits vergeben?)', { variant: 'error' })
  } finally {
    saving.value = false
  }
}

async function uploadModel(files: File[]) {
  const file = files[0]
  if (!file) return
  const body = new FormData()
  body.append('file', file)
  try {
    await $fetch(`/api/admin/products/${productId}/model`, {
      method: 'POST',
      credentials: 'include',
      body,
    })
    toast.show('3D-Modell hochgeladen', { variant: 'success' })
    await refresh()
  } catch {
    toast.show('Upload fehlgeschlagen', { variant: 'error' })
  }
}

const deleteDialogOpen = ref(false)

async function deleteProduct() {
  try {
    await $fetch(`/api/admin/products/${productId}`, {
      method: 'DELETE',
      credentials: 'include',
    })
    toast.show('Produkt gelöscht', { variant: 'success' })
    // close the modal before navigating — the Radix portal otherwise outlives the page
    deleteDialogOpen.value = false
    await nextTick()
    await navigateTo('/admin/products')
  } catch {
    toast.show('Löschen fehlgeschlagen', { variant: 'error' })
  }
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
          <PsInput v-model="form.slug" label="Slug (kebab-case)" name="slug" :disabled="!auth.can('products:write')" />
          <p class="mt-xs text-caption text-secondary">Achtung: ändert die öffentliche URL.</p>
        </div>
        <PsInput v-model="form.priceEuros" label="Preis (EUR)" name="priceEuros" :disabled="!auth.can('products:write')" />
      </div>
      <label class="mt-md flex items-center gap-sm text-body-regular">
        <input v-model="form.active" type="checkbox" :disabled="!auth.can('products:write')" data-testid="product-active" />
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

    <div v-if="auth.can('products:write')" class="flex flex-wrap items-center justify-between gap-md">
      <PsButton data-testid="save-product-detail" :disabled="saving" @click="save">
        Speichern
      </PsButton>
      <PsButton variant="ghost" data-testid="delete-product" @click="deleteDialogOpen = true">
        Produkt löschen
      </PsButton>
    </div>

    <PsDialog v-model:open="deleteDialogOpen" title="Produkt löschen">
      <p class="text-body-regular">
        „{{ translations.de.name || product.slug }}“ endgültig löschen? Bestellungen behalten
        ihren Namens-Snapshot, offene Warenkörbe verlieren die Position.
      </p>
      <div class="mt-lg flex justify-end gap-md">
        <PsButton variant="ghost" @click="deleteDialogOpen = false">Abbrechen</PsButton>
        <PsButton data-testid="confirm-delete-product" @click="deleteProduct">Löschen</PsButton>
      </div>
    </PsDialog>
  </div>
</template>
