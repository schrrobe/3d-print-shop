<script setup lang="ts">
import { COLOR_ZONE_SLOTS, type ColorZoneSlot } from '@print-shop/types'
import {
  PsAdminTable,
  PsBadge,
  PsButton,
  PsCard,
  PsColorSwatch,
  PsDialog,
  PsInput,
  PsSelect,
} from '@print-shop/ui'

definePageMeta({ layout: 'admin', middleware: 'admin-auth' })

interface AdminColor {
  id: string
  name: string
  hex: string
  material: string
  manufacturer: string
  active: boolean
  stockGrams: number | null
  amsSlot: number | null
}

const auth = useAdminAuthStore()
const { data, refresh } = await useFetch<{ colors: AdminColor[] }>('/api/admin/colors', {
  credentials: 'include',
  server: false,
})

const dialogOpen = ref(false)
const editingId = ref<string | null>(null)
const form = reactive({ name: '', hex: '#31a871', material: 'PLA', manufacturer: 'Bambu Lab' })
const { run } = useAdminAction({ refresh })

function openCreate() {
  editingId.value = null
  Object.assign(form, { name: '', hex: '#31a871', material: 'PLA', manufacturer: 'Bambu Lab' })
  dialogOpen.value = true
}

function openEdit(color: AdminColor) {
  editingId.value = color.id
  Object.assign(form, {
    name: color.name,
    hex: color.hex,
    material: color.material,
    manufacturer: color.manufacturer,
  })
  dialogOpen.value = true
}

async function saveColor() {
  const id = editingId.value
  const ok = await run(
    () =>
      id
        ? $fetch(`/api/admin/colors/${id}`, {
            method: 'PATCH',
            credentials: 'include',
            body: { ...form },
          })
        : $fetch('/api/admin/colors', {
            method: 'POST',
            credentials: 'include',
            body: { ...form, active: true },
          }),
    id
      ? { success: 'Farbe gespeichert', error: 'Speichern fehlgeschlagen' }
      : { success: 'Farbe angelegt', error: 'Anlegen fehlgeschlagen' },
  )
  if (ok) dialogOpen.value = false
}

function toggleActive(color: AdminColor) {
  return run(() =>
    $fetch(`/api/admin/colors/${color.id}`, {
      method: 'PATCH',
      credentials: 'include',
      body: { active: !color.active },
    }),
  )
}

// ---------- Shop-wide default color per zone ----------

const ZONE_LABELS: Record<ColorZoneSlot, string> = {
  zone_1_main: 'Hauptfarbe',
  zone_2_accent: 'Akzentfarbe',
  zone_3_detail: 'Detailfarbe',
  zone_4_text: 'Textfarbe',
}
// 'none' sentinel: Radix SelectItem forbids empty-string values
const NO_DEFAULT = 'none'
type Defaults = Partial<Record<ColorZoneSlot, string>>

const { data: defaultsData, refresh: refreshDefaults } = await useFetch<{ defaults: Defaults }>(
  '/api/admin/colors/defaults',
  { credentials: 'include', server: false },
)
const defaults = reactive(
  Object.fromEntries(COLOR_ZONE_SLOTS.map((z) => [z, NO_DEFAULT])) as Record<ColorZoneSlot, string>,
)
watch(
  defaultsData,
  (d) => {
    for (const z of COLOR_ZONE_SLOTS) defaults[z] = d?.defaults[z] ?? NO_DEFAULT
  },
  { immediate: true },
)
const defaultColorOptions = computed(() => [
  { value: NO_DEFAULT, label: '– nicht festgelegt –' },
  ...(data.value?.colors ?? [])
    .filter((c) => c.active)
    .map((c) => ({ value: c.id, label: c.name })),
])
const { run: runDefaults, pending: savingDefaults } = useAdminAction({ refresh: refreshDefaults })

function saveDefaults() {
  return runDefaults(
    () =>
      $fetch('/api/admin/colors/defaults', {
        method: 'PUT',
        credentials: 'include',
        body: {
          defaults: Object.fromEntries(
            COLOR_ZONE_SLOTS.filter((z) => defaults[z] !== NO_DEFAULT).map((z) => [z, defaults[z]]),
          ),
        },
      }),
    { success: 'Standardfarben für alle Produkte gespeichert', error: 'Speichern fehlgeschlagen' },
  )
}

const columns = [
  { key: 'hex', label: '' },
  { key: 'name', label: 'Farbe' },
  { key: 'material', label: 'Material' },
  { key: 'manufacturer', label: 'Hersteller' },
  { key: 'stockGrams', label: 'Bestand (g)', align: 'right' as const },
  { key: 'amsSlot', label: 'AMS', align: 'right' as const },
  { key: 'active', label: 'Status' },
  { key: 'actions', label: '' },
]
</script>

<template>
  <div data-testid="admin-colors">
    <div v-if="auth.can('colors:write')" class="mb-lg">
      <PsButton data-testid="new-color" @click="openCreate">Neue Farbe</PsButton>
    </div>

    <PsCard class="mb-lg" data-testid="default-colors">
      <h3 class="text-label-medium">Standardfarben</h3>
      <p class="mt-xs text-caption text-secondary">
        Gelten für alle Produkte: Speichern überschreibt die Standardfarbe dieser Zone bei jedem
        Produkt, neue Produkte übernehmen sie. Pro Produkt weiterhin anpassbar.
      </p>
      <form class="mt-md grid gap-md sm:grid-cols-2 lg:grid-cols-4" @submit.prevent="saveDefaults">
        <PsSelect
          v-for="zone in COLOR_ZONE_SLOTS"
          :key="zone"
          v-model="defaults[zone]"
          :label="ZONE_LABELS[zone]"
          :options="defaultColorOptions"
          :data-testid="`default-color-${zone}`"
          :disabled="!auth.can('colors:write')"
        />
        <div v-if="auth.can('colors:write')" class="sm:col-span-2 lg:col-span-4">
          <PsButton type="submit" :disabled="savingDefaults" data-testid="save-default-colors">
            Auf alle Produkte anwenden
          </PsButton>
        </div>
      </form>
    </PsCard>

    <PsAdminTable :columns="columns" :rows="data?.colors ?? []" empty="Keine Farben">
      <template #cell-hex="{ value }">
        <PsColorSwatch :hex="String(value)" :name="String(value)" size="sm" />
      </template>
      <template #cell-active="{ value }">
        <PsBadge :variant="value ? 'brand' : 'default'">{{ value ? 'aktiv' : 'inaktiv' }}</PsBadge>
      </template>
      <template #cell-actions="{ row }">
        <span v-if="auth.can('colors:write')" class="flex justify-end gap-xs">
          <PsButton
            variant="ghost"
            size="sm"
            data-testid="edit-color"
            @click="openEdit(row as unknown as AdminColor)"
          >
            Bearbeiten
          </PsButton>
          <PsButton
            variant="ghost"
            size="sm"
            data-testid="toggle-color"
            @click="toggleActive(row as unknown as AdminColor)"
          >
            {{ (row as unknown as AdminColor).active ? 'Deaktivieren' : 'Aktivieren' }}
          </PsButton>
        </span>
      </template>
    </PsAdminTable>

    <PsDialog v-model:open="dialogOpen" :title="editingId ? 'Farbe bearbeiten' : 'Neue Farbe'">
      <form class="flex flex-col gap-md" data-testid="color-form" @submit.prevent="saveColor">
        <PsInput v-model="form.name" label="Name" required />
        <PsInput v-model="form.hex" label="Hex-Wert" required placeholder="#31a871" />
        <PsInput v-model="form.material" label="Material" required />
        <PsInput v-model="form.manufacturer" label="Hersteller" required />
        <PsButton type="submit" data-testid="save-color">{{
          editingId ? 'Speichern' : 'Anlegen'
        }}</PsButton>
      </form>
    </PsDialog>
  </div>
</template>
