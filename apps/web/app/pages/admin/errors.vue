<script setup lang="ts">
import { PsAdminTable } from '@print-shop/ui'

definePageMeta({ layout: 'admin', middleware: 'admin-auth' })

interface ErrorRow {
  id: string
  level: 'warn' | 'error'
  context: string | null
  message: string
  stack: string | null
  createdAt: string
}

const level = ref('')
const { data } = await useFetch<{ errors: ErrorRow[] }>('/api/admin/errors', {
  credentials: 'include',
  server: false,
  query: computed(() => ({ level: level.value || undefined })),
})

const columns = [
  { key: 'createdAt', label: 'Zeitpunkt' },
  { key: 'level', label: 'Level' },
  { key: 'context', label: 'Kontext' },
  { key: 'message', label: 'Nachricht' },
]
</script>

<template>
  <div data-testid="admin-errors">
    <div class="mb-lg flex flex-wrap items-center gap-md">
      <select
        v-model="level"
        class="rounded-card border border-subtle bg-surface-elevated px-md py-sm text-body-regular"
        aria-label="Level"
      >
        <option value="">Alle</option>
        <option value="error">Nur Fehler</option>
        <option value="warn">Nur Warnungen</option>
      </select>
      <p class="text-caption text-secondary">
        Warnungen und Fehler der API der letzten 14 Tage. E-Mail-Adressen sind geschwärzt.
      </p>
    </div>
    <PsAdminTable :columns="columns" :rows="data?.errors ?? []" empty="Keine Einträge">
      <template #cell-createdAt="{ value }">
        <span class="whitespace-nowrap">{{ new Date(String(value)).toLocaleString('de-DE') }}</span>
      </template>
      <template #cell-level="{ value }">
        {{ value === 'error' ? 'Fehler' : 'Warnung' }}
      </template>
      <template #cell-context="{ value }">
        <span class="font-mono">{{ value ?? '—' }}</span>
      </template>
      <template #cell-message="{ row }">
        <details v-if="(row as unknown as ErrorRow).stack">
          <summary class="cursor-pointer whitespace-pre-wrap break-words">
            {{ (row as unknown as ErrorRow).message }}
          </summary>
          <pre class="mt-sm max-h-96 overflow-auto whitespace-pre-wrap break-words font-mono text-caption text-secondary">{{
            (row as unknown as ErrorRow).stack
          }}</pre>
        </details>
        <span v-else class="whitespace-pre-wrap break-words">{{ (row as unknown as ErrorRow).message }}</span>
      </template>
    </PsAdminTable>
  </div>
</template>
