<script setup lang="ts">
import { PsAdminTable, PsBadge, PsButton } from '@print-shop/ui'
import { formatCents } from '@print-shop/utils'

definePageMeta({ layout: 'admin', middleware: 'admin-auth' })

interface AdminVoucher {
  id: string
  code: string
  type: 'percent' | 'fixed'
  value: number
  active: boolean
  validFrom: string | null
  validUntil: string | null
  maxRedemptions: number | null
  redemptionCount: number
  minOrderCents: number
  _count: { orders: number }
}

const auth = useAdminAuthStore()
const { data } = await useFetch<{ vouchers: AdminVoucher[] }>('/api/admin/vouchers', {
  credentials: 'include',
  server: false,
})

function formatValue(voucher: AdminVoucher): string {
  return voucher.type === 'percent' ? `${voucher.value} %` : formatCents(voucher.value)
}

function formatDate(iso: string | null): string {
  return iso ? new Date(iso).toLocaleDateString('de-DE') : '—'
}

const columns = [
  { key: 'code', label: 'Code' },
  { key: 'type', label: 'Typ' },
  { key: 'value', label: 'Wert', align: 'right' as const },
  { key: 'minOrderCents', label: 'Mindestbestellwert', align: 'right' as const },
  { key: 'redemptions', label: 'Eingelöst', align: 'right' as const },
  { key: 'validUntil', label: 'Gültig bis' },
  { key: 'active', label: 'Status' },
]
</script>

<template>
  <div data-testid="admin-vouchers">
    <div v-if="auth.can('vouchers:write')" class="mb-lg">
      <NuxtLink to="/admin/vouchers/new">
        <PsButton data-testid="new-voucher">Neuer Gutschein</PsButton>
      </NuxtLink>
    </div>

    <PsAdminTable :columns="columns" :rows="data?.vouchers ?? []" empty="Keine Gutscheine">
      <template #cell-code="{ row }">
        <NuxtLink
          :to="`/admin/vouchers/${(row as unknown as AdminVoucher).id}`"
          class="font-mono text-brand hover:underline"
          data-testid="voucher-link"
        >
          {{ (row as unknown as AdminVoucher).code }}
        </NuxtLink>
      </template>
      <template #cell-type="{ value }">
        {{ value === 'percent' ? 'Prozent' : 'Festbetrag' }}
      </template>
      <template #cell-value="{ row }">
        {{ formatValue(row as unknown as AdminVoucher) }}
      </template>
      <template #cell-minOrderCents="{ value }">
        {{ Number(value) > 0 ? formatCents(Number(value)) : '—' }}
      </template>
      <template #cell-redemptions="{ row }">
        {{ (row as unknown as AdminVoucher).redemptionCount }} /
        {{ (row as unknown as AdminVoucher).maxRedemptions ?? '∞' }}
      </template>
      <template #cell-validUntil="{ value }">
        {{ formatDate(value as string | null) }}
      </template>
      <template #cell-active="{ value }">
        <PsBadge :variant="value ? 'brand' : 'default'">{{ value ? 'aktiv' : 'inaktiv' }}</PsBadge>
      </template>
    </PsAdminTable>
  </div>
</template>
