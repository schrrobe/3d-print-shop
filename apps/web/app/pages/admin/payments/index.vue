<script setup lang="ts">
import { PsAdminTable, PsBadge, PsPrice } from '@print-shop/ui'

definePageMeta({ layout: 'admin', middleware: 'admin-auth' })

interface AdminPayment {
  id: string
  method: string
  status: string
  amountCents: number
  createdAt: string
  order: { orderNumber: string }
  bitcoinPayment: { confirmations: number; status: string } | null
}

const { data } = await useFetch<{ payments: AdminPayment[] }>('/api/admin/payments', {
  credentials: 'include',
  server: false,
})

const columns = [
  { key: 'order', label: 'Bestellung' },
  { key: 'method', label: 'Methode' },
  { key: 'status', label: 'Status' },
  { key: 'amountCents', label: 'Betrag', align: 'right' as const },
]
</script>

<template>
  <PsAdminTable
    :columns="columns"
    :rows="data?.payments ?? []"
    empty="Keine Zahlungen"
    data-testid="admin-payments"
  >
    <template #cell-order="{ row }">
      {{ (row as unknown as AdminPayment).order.orderNumber }}
    </template>
    <template #cell-method="{ row }">
      {{ (row as unknown as AdminPayment).method }}
      <span v-if="(row as unknown as AdminPayment).bitcoinPayment" class="text-caption text-secondary">
        ({{ (row as unknown as AdminPayment).bitcoinPayment!.confirmations }} conf.)
      </span>
    </template>
    <template #cell-status="{ value }">
      <PsBadge :variant="value === 'paid' ? 'brand' : value === 'failed' ? 'danger' : 'warning'">
        {{ value }}
      </PsBadge>
    </template>
    <template #cell-amountCents="{ value }">
      <PsPrice :cents="Number(value)" size="sm" />
    </template>
  </PsAdminTable>
</template>
