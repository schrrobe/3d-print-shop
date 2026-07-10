<script setup lang="ts">
import { PsAdminTable, PsBadge } from '@print-shop/ui'

definePageMeta({ layout: 'admin', middleware: 'admin-auth' })

interface RequestRow {
  id: string
  name: string
  email: string
  status: string
  quantity: number
  createdAt: string
  files: { originalName: string }[]
}

const { data } = await useFetch<{ requests: RequestRow[] }>('/api/admin/quote-requests', {
  credentials: 'include',
  server: false,
})

const columns = [
  { key: 'name', label: 'Kunde' },
  { key: 'files', label: 'Dateien' },
  { key: 'status', label: 'Status' },
  { key: 'actions', label: '' },
]
</script>

<template>
  <PsAdminTable
    :columns="columns"
    :rows="data?.requests ?? []"
    empty="Keine Upload-Anfragen"
    data-testid="admin-uploads"
  >
    <template #cell-files="{ row }">
      {{ (row as unknown as RequestRow).files.map((f) => f.originalName).join(', ') }}
    </template>
    <template #cell-status="{ value }">
      <PsBadge
        :variant="
          value === 'new'
            ? 'warning'
            : value === 'quoted'
              ? 'info'
              : value === 'accepted'
                ? 'brand'
                : 'default'
        "
      >
        {{ value }}
      </PsBadge>
    </template>
    <template #cell-actions="{ row }">
      <NuxtLink
        :to="`/admin/uploads/${(row as unknown as RequestRow).id}`"
        class="text-caption text-brand hover:underline"
        data-testid="upload-detail-link"
        >Prüfen</NuxtLink
      >
    </template>
  </PsAdminTable>
</template>
