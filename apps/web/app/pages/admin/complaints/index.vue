<script setup lang="ts">
import { PsAdminTable, PsComplaintStatusBadge } from '@print-shop/ui'
import { COMPLAINT_STATUSES } from '@print-shop/types'
import type { ComplaintStatus } from '@print-shop/types'

definePageMeta({ layout: 'admin', middleware: 'admin-auth' })

interface AdminComplaint {
  id: string
  complaintNumber: string
  status: ComplaintStatus
  reason: string
  createdAt: string
  order: { orderNumber: string; email: string }
  items: { id: string }[]
}

const statusFilter = ref('')
const { data, refresh } = await useFetch<{ complaints: AdminComplaint[] }>('/api/admin/complaints', {
  credentials: 'include',
  server: false,
  query: computed(() => (statusFilter.value ? { status: statusFilter.value } : {})),
})
watch(statusFilter, () => refresh())

const reasonLabels: Record<string, string> = {
  damaged: 'Beschädigt',
  wrong_item: 'Falscher Artikel',
  quality_issue: 'Qualitätsmangel',
  missing_parts: 'Fehlende Teile',
  color_mismatch: 'Farbabweichung',
  other: 'Sonstiges',
}

const columns = [
  { key: 'complaintNumber', label: 'Nummer' },
  { key: 'order', label: 'Bestellung' },
  { key: 'reason', label: 'Grund' },
  { key: 'status', label: 'Status' },
  { key: 'createdAt', label: 'Eingegangen' },
  { key: 'actions', label: '' },
]
</script>

<template>
  <div data-testid="admin-complaints">
    <select
      v-model="statusFilter"
      class="mb-lg rounded-card border border-subtle bg-surface-elevated px-md py-sm text-body-regular"
      data-testid="complaint-status-filter"
    >
      <option value="">Alle Status</option>
      <option v-for="s in COMPLAINT_STATUSES" :key="s" :value="s">{{ s }}</option>
    </select>

    <PsAdminTable :columns="columns" :rows="data?.complaints ?? []" empty="Keine Reklamationen">
      <template #cell-order="{ row }">
        <div class="flex flex-col">
          <span>{{ (row as unknown as AdminComplaint).order.orderNumber }}</span>
          <span class="text-caption text-secondary">{{ (row as unknown as AdminComplaint).order.email }}</span>
        </div>
      </template>
      <template #cell-reason="{ row }">
        {{ reasonLabels[(row as unknown as AdminComplaint).reason] ?? (row as unknown as AdminComplaint).reason }}
      </template>
      <template #cell-status="{ row }">
        <PsComplaintStatusBadge :status="(row as unknown as AdminComplaint).status" />
      </template>
      <template #cell-createdAt="{ value }">
        {{ new Date(String(value)).toLocaleDateString('de') }}
      </template>
      <template #cell-actions="{ row }">
        <NuxtLink
          :to="`/admin/complaints/${(row as unknown as AdminComplaint).id}`"
          class="text-caption text-brand hover:underline"
          data-testid="complaint-row"
        >
          Details
        </NuxtLink>
      </template>
    </PsAdminTable>
  </div>
</template>
