<script setup lang="ts">
import { PsAdminTable, PsPrice } from '@print-shop/ui'

definePageMeta({ layout: 'admin', middleware: 'admin-auth' })

interface AdminInvoice {
  id: string
  number: string
  totalCents: number
  paymentMethod: string
  issuedAt: string
  order: { orderNumber: string; email: string }
}

const { data } = await useFetch<{ invoices: AdminInvoice[] }>('/api/admin/invoices', {
  credentials: 'include',
  server: false,
})

const columns = [
  { key: 'number', label: 'Rechnungsnummer' },
  { key: 'order', label: 'Bestellung' },
  { key: 'paymentMethod', label: 'Zahlungsart' },
  { key: 'totalCents', label: 'Betrag', align: 'right' as const },
  { key: 'actions', label: '' },
]
</script>

<template>
  <PsAdminTable
    :columns="columns"
    :rows="data?.invoices ?? []"
    empty="Keine Rechnungen"
    data-testid="admin-invoices"
  >
    <template #cell-order="{ row }">
      {{ (row as unknown as AdminInvoice).order.orderNumber }}
    </template>
    <template #cell-totalCents="{ value }">
      <PsPrice :cents="Number(value)" size="sm" />
    </template>
    <template #cell-actions="{ row }">
      <a
        :href="`/api/admin/invoices/${(row as unknown as AdminInvoice).id}/pdf`"
        class="text-caption text-brand hover:underline"
        data-testid="invoice-pdf"
        download
        >PDF</a
      >
    </template>
  </PsAdminTable>
</template>
