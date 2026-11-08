<script setup lang="ts">
import { PsAdminTable, PsBadge, PsButton, PsOrderStatusBadge, PsPrice } from '@print-shop/ui'
import type { OrderStatus } from '@print-shop/types'

definePageMeta({ layout: 'admin', middleware: 'admin-auth' })

interface AdminOrder {
  id: string
  orderNumber: string
  status: OrderStatus
  source: 'shop' | 'admin' | 'quote'
  email: string
  totalCents: number
  createdAt: string
  invoice: { number: string } | null
  items: { personalization: string | null }[]
  /** Live (non-cancelled) provider assignment, at most one */
  providerAssignments: { status: string; provider: { id: string; name: string } }[]
}

const externalProvider = (row: unknown) =>
  (row as AdminOrder).providerAssignments[0]?.provider.name ?? null

const personalizations = (row: unknown) =>
  (row as AdminOrder).items
    .map((i) => i.personalization)
    .filter(Boolean)
    .join(', ')

const auth = useAdminAuthStore()
const statusFilter = ref('')
const sourceFilter = ref('')
const fulfillmentFilter = ref('')
const { data: providerOptions } = await useFetch<{ providers: { id: string; name: string }[] }>(
  '/api/admin/providers/options',
  { credentials: 'include', server: false, immediate: auth.can('provider-orders:write') },
)
const { data, refresh } = await useFetch<{ orders: AdminOrder[] }>('/api/admin/orders', {
  credentials: 'include',
  server: false,
  query: computed(() => ({
    ...(statusFilter.value ? { status: statusFilter.value } : {}),
    ...(sourceFilter.value ? { source: sourceFilter.value } : {}),
    ...(fulfillmentFilter.value ? { fulfillment: fulfillmentFilter.value } : {}),
  })),
})
watch([statusFilter, sourceFilter, fulfillmentFilter], () => refresh())

const columns = [
  { key: 'orderNumber', label: 'Bestellnummer' },
  { key: 'email', label: 'Kunde' },
  { key: 'status', label: 'Status' },
  { key: 'personalization', label: 'Personalisiert', sortValue: personalizations },
  { key: 'totalCents', label: 'Summe', align: 'right' as const },
  { key: 'actions', label: '' },
]
</script>

<template>
  <div data-testid="admin-orders">
    <div class="mb-lg flex flex-wrap items-center gap-md">
      <select
        v-model="statusFilter"
        class="rounded-card border border-subtle bg-surface-elevated px-md py-sm text-body-regular"
        data-testid="order-status-filter"
      >
        <option value="">Alle Status</option>
        <option
          v-for="s in [
            'pending',
            'awaiting_payment',
            'awaiting_bank_transfer',
            'paid',
            'in_production',
            'ready_to_ship',
            'shipped',
            'completed',
          ]"
          :key="s"
          :value="s"
        >
          {{ s }}
        </option>
      </select>
      <select
        v-model="sourceFilter"
        class="rounded-card border border-subtle bg-surface-elevated px-md py-sm text-body-regular"
        data-testid="order-source-filter"
      >
        <option value="">Alle Herkünfte</option>
        <option value="shop">Shop</option>
        <option value="admin">Paylink</option>
        <option value="quote">Angebot</option>
      </select>
      <select
        v-model="fulfillmentFilter"
        class="rounded-card border border-subtle bg-surface-elevated px-md py-sm text-body-regular"
        aria-label="Fertigung"
        data-testid="order-fulfillment-filter"
      >
        <option value="">Alle Fertigungen</option>
        <option value="internal">Intern</option>
        <option value="external">Extern</option>
        <option v-for="p in providerOptions?.providers ?? []" :key="p.id" :value="p.id">
          Extern: {{ p.name }}
        </option>
      </select>
      <NuxtLink v-if="auth.can('orders:write')" to="/admin/orders/new" class="ml-auto">
        <PsButton data-testid="create-paylink">Paylink erstellen</PsButton>
      </NuxtLink>
    </div>

    <PsAdminTable
      :columns="columns"
      :rows="data?.orders ?? []"
      :row-class="
        (row) =>
          externalProvider(row)
            ? 'bg-violet-500/5 shadow-[inset_3px_0_0_var(--color-violet-500)]'
            : undefined
      "
      empty="Keine Bestellungen"
    >
      <template #cell-status="{ row }">
        <span class="inline-flex flex-wrap items-center gap-xs">
          <PsOrderStatusBadge :status="(row as unknown as AdminOrder).status" />
          <PsBadge v-if="(row as unknown as AdminOrder).source === 'admin'" variant="info"
            >Paylink</PsBadge
          >
          <PsBadge v-if="externalProvider(row)" variant="external" data-testid="order-external">
            Extern: {{ externalProvider(row) }}
          </PsBadge>
        </span>
      </template>
      <template #cell-personalization="{ row }">
        <span class="text-body-regular" data-testid="order-personalization">{{
          personalizations(row) || '–'
        }}</span>
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
