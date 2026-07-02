<script setup lang="ts">
import { PsAdminTable, PsOrderStatusBadge, PsPrice } from '@print-shop/ui'
import type { OrderStatus } from '@print-shop/types'

definePageMeta({ layout: 'admin', middleware: 'admin-auth' })

interface AdminOrder {
  id: string
  orderNumber: string
  status: OrderStatus
  email: string
  totalCents: number
  createdAt: string
  invoice: { number: string } | null
}

const statusFilter = ref('')
const { data, refresh } = await useFetch<{ orders: AdminOrder[] }>('/api/admin/orders', {
  credentials: 'include',
  server: false,
  query: computed(() => (statusFilter.value ? { status: statusFilter.value } : {})),
})
watch(statusFilter, () => refresh())

const columns = [
  { key: 'orderNumber', label: 'Bestellnummer' },
  { key: 'email', label: 'Kunde' },
  { key: 'status', label: 'Status' },
  { key: 'totalCents', label: 'Summe', align: 'right' as const },
  { key: 'actions', label: '' },
]
</script>

<template>
  <div data-testid="admin-orders">
    <select
      v-model="statusFilter"
      class="mb-lg rounded-card border border-subtle bg-surface-elevated px-md py-sm text-body-regular"
      data-testid="order-status-filter"
    >
      <option value="">Alle Status</option>
      <option v-for="s in ['pending', 'awaiting_payment', 'awaiting_bank_transfer', 'paid', 'in_production', 'ready_to_ship', 'shipped', 'completed']" :key="s" :value="s">
        {{ s }}
      </option>
    </select>

    <PsAdminTable :columns="columns" :rows="data?.orders ?? []" empty="Keine Bestellungen">
      <template #cell-status="{ row }">
        <PsOrderStatusBadge :status="(row as unknown as AdminOrder).status" />
      </template>
      <template #cell-totalCents="{ value }">
        <PsPrice :cents="Number(value)" size="sm" />
      </template>
      <template #cell-actions="{ row }">
        <NuxtLink
          :to="`/admin/orders/${(row as unknown as AdminOrder).id}`"
          class="text-caption text-brand hover:underline"
          data-testid="order-detail-link"
          >Details</NuxtLink
        >
      </template>
    </PsAdminTable>
  </div>
</template>
