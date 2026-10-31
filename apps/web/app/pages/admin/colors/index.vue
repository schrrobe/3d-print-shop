<script setup lang="ts">
import { PsAdminTable, PsBadge, PsButton, PsColorSwatch, PsDialog, PsInput } from '@print-shop/ui'

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
