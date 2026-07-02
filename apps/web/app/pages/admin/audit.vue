<script setup lang="ts">
import { PsAdminTable } from '@print-shop/ui'

definePageMeta({ layout: 'admin', middleware: 'admin-auth' })

interface AuditRow {
  id: string
  action: string
  entityType: string | null
  entityId: string | null
  createdAt: string
  user: { email: string; name: string } | null
}

const { data } = await useFetch<{ logs: AuditRow[] }>('/api/admin/audit-log', {
  credentials: 'include',
  server: false,
})

const columns = [
  { key: 'createdAt', label: 'Zeitpunkt' },
  { key: 'user', label: 'Benutzer' },
  { key: 'action', label: 'Aktion' },
  { key: 'entityType', label: 'Objekt' },
]
</script>

<template>
  <PsAdminTable
    :columns="columns"
    :rows="data?.logs ?? []"
    empty="Keine Einträge"
    data-testid="admin-audit"
  >
    <template #cell-createdAt="{ value }">
      {{ new Date(String(value)).toLocaleString('de-DE') }}
    </template>
    <template #cell-user="{ row }">
      {{ (row as unknown as AuditRow).user?.email ?? 'System' }}
    </template>
    <template #cell-entityType="{ row }">
      {{ (row as unknown as AuditRow).entityType ?? '—' }}
    </template>
  </PsAdminTable>
</template>
