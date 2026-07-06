<script setup lang="ts">
import {
  PsAmsSlotCard,
  PsButton,
  PsCard,
  PsDialog,
  PsFilamentSpoolCard,
  PsInput,
  PsSelect,
} from '@print-shop/ui'
import type { AmsSlotStatus } from '@print-shop/types'

definePageMeta({ layout: 'admin', middleware: 'admin-auth' })

interface Color {
  id: string
  name: string
  hex: string
}
interface Spool {
  id: string
  material: string
  manufacturer: string | null
  label: string | null
  colorId: string | null
  color: Color | null
  remainingGrams: number | null
  totalGrams: number | null
  minRemainingGrams: number | null
  storageLocation: string | null
  active: boolean
  reorder: boolean
  amsSlotAssignment: { id: string; slotIndex: number; amsUnit: { name: string; printer: { name: string } } } | null
}
interface Slot {
  id: string
  slotIndex: number
  status: AmsSlotStatus
  notes: string | null
  spool: (Spool & { color: Color | null }) | null
}
interface AmsUnit {
  id: string
  name: string
  position: number
  printer: { id: string; name: string; status: string }
  slots: Slot[]
}
interface Alerts {
  lowSpools: Spool[]
  lowColors: { color: Color & { minStockGrams: number | null }; status: string; totalRemainingGrams: number }[]
}
interface ShoppingRow {
  spoolId: string
  label: string | null
  material: string
  manufacturer: string | null
  colorName: string | null
  colorHex: string | null
  remainingGrams: number | null
  minRemainingGrams: number | null
  reorderFlag: boolean
}

const tab = ref<'spulen' | 'ams' | 'warnungen' | 'einkaufsliste'>('spulen')

const { data: spoolData, refresh: refreshSpools } = await useFetch<{ spools: Spool[] }>(
  '/api/admin/filament/spools',
  { credentials: 'include', server: false },
)
const { data: amsData, refresh: refreshAms } = await useFetch<{ units: AmsUnit[] }>(
  '/api/admin/filament/ams-units',
  { credentials: 'include', server: false },
)
const { data: alertData, refresh: refreshAlerts } = await useFetch<Alerts>('/api/admin/filament/alerts', {
  credentials: 'include',
  server: false,
})
const { data: shoppingData, refresh: refreshShopping } = await useFetch<{ shoppingList: ShoppingRow[] }>(
  '/api/admin/filament/shopping-list',
  { credentials: 'include', server: false },
)
const { data: colorData } = await useFetch<{ colors: Color[] }>('/api/admin/colors', {
  credentials: 'include',
  server: false,
})
const { data: printerData } = await useFetch<{ printers: { id: string; name: string }[] }>(
  '/api/admin/printers',
  { credentials: 'include', server: false },
)

const colorOptions = computed(() => [
  { value: '', label: '— Keine Farbe —' },
  ...(colorData.value?.colors ?? []).map((c) => ({ value: c.id, label: c.name })),
])

async function refreshAll() {
  await Promise.all([refreshSpools(), refreshAms(), refreshAlerts(), refreshShopping()])
}

const { run } = useAdminAction({ refresh: refreshAll })
const { run: runAms } = useAdminAction({ refresh: refreshAms })
const { run: runAlerts } = useAdminAction({ refresh: refreshAlerts })

// ---- Spool create/edit ----
const spoolOpen = ref(false)
const editingSpoolId = ref<string | null>(null)
const spoolForm = reactive({
  material: 'PLA',
  manufacturer: '',
  label: '',
  colorId: '',
  totalGrams: 1000 as number | null,
  remainingGrams: 1000 as number | null,
  minRemainingGrams: 200 as number | null,
  storageLocation: '',
  active: true,
  reorder: false,
})
function openCreate() {
  editingSpoolId.value = null
  Object.assign(spoolForm, {
    material: 'PLA',
    manufacturer: '',
    label: '',
    colorId: '',
    totalGrams: 1000,
    remainingGrams: 1000,
    minRemainingGrams: 200,
    storageLocation: '',
    active: true,
    reorder: false,
  })
  spoolOpen.value = true
}
function openEdit(spool: Spool) {
  editingSpoolId.value = spool.id
  Object.assign(spoolForm, {
    material: spool.material,
    manufacturer: spool.manufacturer ?? '',
    label: spool.label ?? '',
    colorId: spool.colorId ?? '',
    totalGrams: spool.totalGrams,
    remainingGrams: spool.remainingGrams,
    minRemainingGrams: spool.minRemainingGrams,
    storageLocation: spool.storageLocation ?? '',
    active: spool.active,
    reorder: spool.reorder,
  })
  spoolOpen.value = true
}
async function saveSpool() {
  const body = {
    material: spoolForm.material,
    manufacturer: spoolForm.manufacturer || undefined,
    label: spoolForm.label || undefined,
    colorId: spoolForm.colorId || null,
    totalGrams: spoolForm.totalGrams,
    remainingGrams: spoolForm.remainingGrams,
    minRemainingGrams: spoolForm.minRemainingGrams,
    storageLocation: spoolForm.storageLocation || undefined,
    active: spoolForm.active,
    reorder: spoolForm.reorder,
  }
  const ok = await run(
    () =>
      editingSpoolId.value
        ? $fetch(`/api/admin/filament/spools/${editingSpoolId.value}`, { method: 'PATCH', body, credentials: 'include' })
        : $fetch('/api/admin/filament/spools', { method: 'POST', body, credentials: 'include' }),
    { success: 'Spule gespeichert', error: 'Fehler' },
  )
  if (ok) spoolOpen.value = false
}
function deleteSpool(id: string) {
  return run(
    () => $fetch(`/api/admin/filament/spools/${id}`, { method: 'DELETE', credentials: 'include' }),
    { success: 'Spule gelöscht', error: 'Fehler' },
  )
}

// ---- AMS slot assignment ----
const slotOpen = ref(false)
const editingSlot = ref<Slot | null>(null)
const slotSpoolId = ref('')
const slotStatus = ref<AmsSlotStatus>('loaded')
const spoolOptions = computed(() => [
  { value: '', label: '— Leer —' },
  ...(spoolData.value?.spools ?? [])
    .filter((s) => s.active)
    .map((s) => ({ value: s.id, label: `${s.label ?? s.material} ${s.color ? `(${s.color.name})` : ''}` })),
])
function openSlot(slot: Slot) {
  editingSlot.value = slot
  slotSpoolId.value = slot.spool?.id ?? ''
  slotStatus.value = slot.status
  slotOpen.value = true
}
async function saveSlot() {
  const slot = editingSlot.value
  if (!slot) return
  const ok = await run(
    () =>
      $fetch(`/api/admin/filament/ams-slots/${slot.id}`, {
        method: 'PATCH',
        body: { spoolId: slotSpoolId.value || null, status: slotStatus.value },
        credentials: 'include',
      }),
    { success: 'Slot aktualisiert', error: 'Fehler' },
  )
  if (ok) slotOpen.value = false
}

// ---- AMS unit create ----
const unitOpen = ref(false)
const unitForm = reactive({ printerId: '', name: 'AMS 2 Pro', position: 1 })
async function createUnit() {
  const ok = await runAms(
    () =>
      $fetch('/api/admin/filament/ams-units', {
        method: 'POST',
        body: { printerId: unitForm.printerId, name: unitForm.name, position: unitForm.position },
        credentials: 'include',
      }),
    { success: 'AMS-Einheit angelegt', error: 'Fehler' },
  )
  if (ok) unitOpen.value = false
}
function deleteUnit(id: string) {
  return runAms(
    () => $fetch(`/api/admin/filament/ams-units/${id}`, { method: 'DELETE', credentials: 'include' }),
    { success: 'AMS-Einheit gelöscht', error: 'Löschen fehlgeschlagen' },
  )
}

// ---- Color availability ----
function setColorAvailability(colorId: string, patch: { active?: boolean; outOfStock?: boolean }) {
  return runAlerts(
    () =>
      $fetch(`/api/admin/filament/colors/${colorId}/availability`, {
        method: 'POST',
        body: patch,
        credentials: 'include',
      }),
    { success: 'Farbverfügbarkeit aktualisiert', error: 'Aktualisierung fehlgeschlagen' },
  )
}

const tabs = [
  { key: 'spulen', label: 'Spulen' },
  { key: 'ams', label: 'AMS' },
  { key: 'warnungen', label: 'Warnungen' },
  { key: 'einkaufsliste', label: 'Einkaufsliste' },
] as const
</script>

<template>
  <div data-testid="admin-filament">
    <div class="mb-lg flex gap-sm border-b border-subtle">
      <button
        v-for="tabItem in tabs"
        :key="tabItem.key"
        type="button"
        class="border-b-2 px-md py-sm text-body-regular"
        :class="tab === tabItem.key ? 'border-brand text-primary' : 'border-transparent text-secondary'"
        :data-testid="`filament-tab-${tabItem.key}`"
        @click="tab = tabItem.key"
      >
        {{ tabItem.label }}
      </button>
    </div>

    <!-- Spulen -->
    <section v-if="tab === 'spulen'">
      <PsButton size="sm" class="mb-md" data-testid="spool-create" @click="openCreate">Spule anlegen</PsButton>
      <div class="grid gap-md sm:grid-cols-2 lg:grid-cols-3">
        <PsFilamentSpoolCard
          v-for="spool in spoolData?.spools ?? []"
          :key="spool.id"
          :label="spool.label"
          :material="spool.material"
          :manufacturer="spool.manufacturer"
          :color-name="spool.color?.name"
          :color-hex="spool.color?.hex"
          :remaining-grams="spool.remainingGrams"
          :total-grams="spool.totalGrams"
          :min-remaining-grams="spool.minRemainingGrams"
          :storage-location="spool.storageLocation"
          :active="spool.active"
          :reorder="spool.reorder"
          :ams-location-label="spool.amsSlotAssignment ? `${spool.amsSlotAssignment.amsUnit.name} · Slot ${spool.amsSlotAssignment.slotIndex}` : null"
          data-testid="spool-card"
        >
          <template #actions>
            <PsButton variant="ghost" size="sm" data-testid="spool-edit" @click="openEdit(spool)">Bearbeiten</PsButton>
            <PsButton variant="ghost" size="sm" data-testid="spool-delete" @click="deleteSpool(spool.id)">Löschen</PsButton>
          </template>
        </PsFilamentSpoolCard>
      </div>
    </section>

    <!-- AMS -->
    <section v-else-if="tab === 'ams'">
      <PsButton size="sm" class="mb-md" data-testid="ams-unit-create" @click="unitOpen = true">AMS-Einheit anlegen</PsButton>
      <div class="flex flex-col gap-lg">
        <PsCard v-for="unit in amsData?.units ?? []" :key="unit.id">
          <div class="flex items-center justify-between">
            <h3 class="text-label-medium">{{ unit.name }} · {{ unit.printer.name }}</h3>
            <PsButton variant="ghost" size="sm" @click="deleteUnit(unit.id)">Entfernen</PsButton>
          </div>
          <div class="mt-md grid grid-cols-2 gap-sm sm:grid-cols-4">
            <PsAmsSlotCard
              v-for="slot in unit.slots"
              :key="slot.id"
              :slot-index="slot.slotIndex"
              :status="slot.status"
              :spool-label="slot.spool?.label ?? slot.spool?.material"
              :color-name="slot.spool?.color?.name"
              :color-hex="slot.spool?.color?.hex"
              :remaining-grams="slot.spool?.remainingGrams"
              :notes="slot.notes"
            >
              <template #actions>
                <PsButton variant="ghost" size="sm" data-testid="ams-slot-edit" @click="openSlot(slot)">Belegen</PsButton>
              </template>
            </PsAmsSlotCard>
          </div>
        </PsCard>
      </div>
    </section>

    <!-- Warnungen -->
    <section v-else-if="tab === 'warnungen'" class="flex flex-col gap-lg">
      <PsCard>
        <h3 class="text-label-medium">Spulen unter Mindestbestand</h3>
        <p v-if="!alertData?.lowSpools.length" class="mt-sm text-body-regular text-secondary">Keine Warnungen.</p>
        <ul class="mt-sm flex flex-col gap-sm">
          <li v-for="s in alertData?.lowSpools ?? []" :key="s.id" class="text-body-regular" data-testid="low-spool">
            {{ s.label ?? s.material }} — {{ s.remainingGrams }} g / min. {{ s.minRemainingGrams }} g
          </li>
        </ul>
      </PsCard>
      <PsCard>
        <h3 class="text-label-medium">Farben mit niedrigem Bestand</h3>
        <ul class="mt-sm flex flex-col gap-md">
          <li
            v-for="entry in alertData?.lowColors ?? []"
            :key="entry.color.id"
            class="flex flex-wrap items-center justify-between gap-sm"
            data-testid="low-color"
          >
            <span class="text-body-regular">
              <span class="mr-sm inline-block h-3 w-3 rounded-full align-middle" :style="{ backgroundColor: entry.color.hex }" />
              {{ entry.color.name }} — {{ entry.totalRemainingGrams }} g
            </span>
            <span class="flex gap-sm">
              <PsButton variant="secondary" size="sm" data-testid="color-set-out-of-stock" @click="setColorAvailability(entry.color.id, { outOfStock: true })">
                Als nicht verfügbar markieren
              </PsButton>
              <PsButton variant="ghost" size="sm" data-testid="color-deactivate" @click="setColorAvailability(entry.color.id, { active: false })">
                Im Shop deaktivieren
              </PsButton>
            </span>
          </li>
        </ul>
      </PsCard>
    </section>

    <!-- Einkaufsliste -->
    <section v-else class="flex flex-col gap-sm">
      <p v-if="!shoppingData?.shoppingList.length" class="text-body-regular text-secondary">Einkaufsliste leer.</p>
      <div
        v-for="row in shoppingData?.shoppingList ?? []"
        :key="row.spoolId"
        class="flex items-center justify-between rounded-card border border-subtle bg-surface-elevated p-md text-body-regular"
        data-testid="shopping-list-row"
      >
        <span>
          {{ row.label ?? row.material }}
          <span v-if="row.colorName" class="text-secondary">· {{ row.colorName }}</span>
        </span>
        <span class="text-caption text-secondary">
          {{ row.remainingGrams ?? '–' }} g<span v-if="row.reorderFlag"> · manuell markiert</span>
        </span>
      </div>
    </section>

    <!-- Spool dialog -->
    <PsDialog v-model:open="spoolOpen" :title="editingSpoolId ? 'Spule bearbeiten' : 'Spule anlegen'">
      <div class="flex flex-col gap-md">
        <PsInput v-model="spoolForm.material" label="Material" name="material" data-testid="spool-form-material" />
        <PsInput v-model="spoolForm.manufacturer" label="Hersteller" name="manufacturer" />
        <PsInput v-model="spoolForm.label" label="Bezeichnung" name="label" />
        <PsSelect v-model="spoolForm.colorId" label="Farbe" :options="colorOptions" />
        <div class="grid grid-cols-3 gap-sm">
          <label class="flex flex-col gap-xs text-caption">Gesamt (g)
            <input v-model.number="spoolForm.totalGrams" type="number" class="rounded-card border border-subtle bg-surface px-sm py-xs" />
          </label>
          <label class="flex flex-col gap-xs text-caption">Rest (g)
            <input v-model.number="spoolForm.remainingGrams" type="number" class="rounded-card border border-subtle bg-surface px-sm py-xs" />
          </label>
          <label class="flex flex-col gap-xs text-caption">Minimum (g)
            <input v-model.number="spoolForm.minRemainingGrams" type="number" class="rounded-card border border-subtle bg-surface px-sm py-xs" />
          </label>
        </div>
        <PsInput v-model="spoolForm.storageLocation" label="Lagerort" name="storageLocation" />
        <label class="flex items-center gap-sm text-body-regular">
          <input v-model="spoolForm.active" type="checkbox" /> Aktiv
        </label>
        <label class="flex items-center gap-sm text-body-regular">
          <input v-model="spoolForm.reorder" type="checkbox" /> Nachbestellen
        </label>
        <PsButton data-testid="spool-form-save" @click="saveSpool">Speichern</PsButton>
      </div>
    </PsDialog>

    <!-- Slot dialog -->
    <PsDialog v-model:open="slotOpen" title="AMS-Slot belegen">
      <div class="flex flex-col gap-md">
        <PsSelect v-model="slotSpoolId" label="Spule" :options="spoolOptions" data-testid="ams-slot-spool" />
        <PsSelect
          v-model="slotStatus"
          label="Status"
          :options="[
            { value: 'loaded', label: 'Geladen' },
            { value: 'low', label: 'Fast leer' },
            { value: 'empty', label: 'Leer' },
            { value: 'error', label: 'Fehler' },
            { value: 'disabled', label: 'Deaktiviert' },
          ]"
        />
        <PsButton data-testid="ams-slot-save" @click="saveSlot">Speichern</PsButton>
      </div>
    </PsDialog>

    <!-- Unit dialog -->
    <PsDialog v-model:open="unitOpen" title="AMS-Einheit anlegen">
      <div class="flex flex-col gap-md">
        <PsSelect
          v-model="unitForm.printerId"
          label="Drucker"
          :options="(printerData?.printers ?? []).map((p) => ({ value: p.id, label: p.name }))"
          data-testid="ams-unit-printer"
        />
        <PsInput v-model="unitForm.name" label="Name" name="unitName" />
        <label class="flex flex-col gap-xs text-caption">Position
          <input v-model.number="unitForm.position" type="number" min="1" max="4" class="rounded-card border border-subtle bg-surface px-sm py-xs" />
        </label>
        <PsButton data-testid="ams-unit-save" @click="createUnit">Anlegen</PsButton>
      </div>
    </PsDialog>
  </div>
</template>
