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

interface AdminCorrection {
  id: string
  number: string
  amountCents: number
  issuedAt: string
  invoice: { number: string; order: { id: string; orderNumber: string } }
}

const { data } = await useFetch<{ invoices: AdminInvoice[] }>('/api/admin/invoices', {
  credentials: 'include',
  server: false,
})
const { data: corrections } = await useFetch<{ corrections: AdminCorrection[] }>(
  '/api/admin/refunds/corrections',
  { credentials: 'include', server: false },
)

const columns = [
  { key: 'number', label: 'Rechnungsnummer' },
  { key: 'order', label: 'Bestellung', sortValue: (r: AdminInvoice) => r.order.orderNumber },
  { key: 'paymentMethod', label: 'Zahlungsart' },
  { key: 'totalCents', label: 'Betrag', align: 'right' as const },
  { key: 'actions', label: '' },
]

const correctionColumns = [
  { key: 'number', label: 'Korrekturnummer' },
  { key: 'invoice', label: 'Zur Rechnung', sortValue: (r: AdminCorrection) => r.invoice.number },
  {
    key: 'order',
    label: 'Bestellung',
    sortValue: (r: AdminCorrection) => r.invoice.order.orderNumber,
  },
  { key: 'amountCents', label: 'Betrag', align: 'right' as const },
  { key: 'actions', label: '' },
]
</script>

<template>
  <div class="flex flex-col gap-lg">
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

    <section v-if="corrections?.corrections.length" class="flex flex-col gap-md">
      <h2 class="text-label-medium">Rechnungskorrekturen</h2>
      <PsAdminTable
        :columns="correctionColumns"
        :rows="corrections.corrections"
        empty="Keine Rechnungskorrekturen"
        data-testid="admin-invoice-corrections"
      >
        <template #cell-invoice="{ row }">
          {{ (row as unknown as AdminCorrection).invoice.number }}
        </template>
        <template #cell-order="{ row }">
          <NuxtLink
            :to="`/admin/orders/${(row as unknown as AdminCorrection).invoice.order.id}`"
            class="text-brand hover:underline"
          >
            {{ (row as unknown as AdminCorrection).invoice.order.orderNumber }}
          </NuxtLink>
        </template>
        <template #cell-amountCents="{ value }">
          <PsPrice :cents="-Number(value)" size="sm" />
        </template>
        <template #cell-actions="{ row }">
          <a
            :href="`/api/admin/refunds/corrections/${(row as unknown as AdminCorrection).id}/pdf`"
            class="text-caption text-brand hover:underline"
            data-testid="invoice-correction-pdf"
            download
            >PDF</a
          >
        </template>
      </PsAdminTable>
    </section>
  </div>
</template>
