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
const form = reactive({ name: '', hex: '#31a871', material: 'PLA', manufacturer: 'Bambu Lab' })
const { run } = useAdminAction({ refresh })

async function createColor() {
  const ok = await run(
    () =>
      $fetch('/api/admin/colors', {
        method: 'POST',
        credentials: 'include',
        body: { ...form, active: true },
      }),
    { success: 'Farbe angelegt', error: 'Anlegen fehlgeschlagen' },
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
      <PsButton data-testid="new-color" @click="dialogOpen = true">Neue Farbe</PsButton>
    </div>

    <PsAdminTable :columns="columns" :rows="data?.colors ?? []" empty="Keine Farben">
      <template #cell-hex="{ value }">
        <PsColorSwatch :hex="String(value)" :name="String(value)" size="sm" />
      </template>
      <template #cell-active="{ value }">
        <PsBadge :variant="value ? 'brand' : 'default'">{{ value ? 'aktiv' : 'inaktiv' }}</PsBadge>
      </template>
      <template #cell-actions="{ row }">
        <PsButton
          v-if="auth.can('colors:write')"
          variant="ghost"
          size="sm"
          data-testid="toggle-color"
          @click="toggleActive(row as unknown as AdminColor)"
        >
          {{ (row as unknown as AdminColor).active ? 'Deaktivieren' : 'Aktivieren' }}
        </PsButton>
      </template>
    </PsAdminTable>

    <PsDialog v-model:open="dialogOpen" title="Neue Farbe">
      <form class="flex flex-col gap-md" data-testid="color-form" @submit.prevent="createColor">
        <PsInput v-model="form.name" label="Name" required />
        <PsInput v-model="form.hex" label="Hex-Wert" required placeholder="#31a871" />
        <PsInput v-model="form.material" label="Material" required />
        <PsInput v-model="form.manufacturer" label="Hersteller" required />
        <PsButton type="submit" data-testid="save-color">Anlegen</PsButton>
      </form>
    </PsDialog>
  </div>
</template>
