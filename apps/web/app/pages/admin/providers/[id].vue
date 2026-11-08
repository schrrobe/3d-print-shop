<script setup lang="ts">
import { PsAdminTable, PsBadge, PsButton, PsCard, PsOrderStatusBadge } from '@print-shop/ui'
import type { OrderStatus } from '@print-shop/types'
import { formatCents } from '@print-shop/utils'

definePageMeta({ layout: 'admin', middleware: 'admin-auth' })

interface Assignment {
  id: string
  status: 'assigned' | 'completed' | 'received' | 'cancelled'
  rateBp: number
  baseCents: number
  payoutCents: number
  shareCustomerData: boolean
  createdAt: string
  paidOutAt: string | null
  order: { id: string; orderNumber: string; status: OrderStatus }
}

const LABELS: Record<Assignment['status'], string> = {
  assigned: 'beauftragt',
  completed: 'fertig gemeldet',
  received: 'eingegangen',
  cancelled: 'storniert',
}
const billable = (a: Assignment) => a.status === 'completed' || a.status === 'received'

const route = useRoute()
const auth = useAdminAuthStore()
const providerId = String(route.params.id)
const selectClass =
  'rounded-card border border-subtle bg-surface-elevated px-md py-sm text-body-regular'

const period = ref<'this' | 'last' | 'year' | 'all'>('all')
const range = computed(() => adminPeriodRange(period.value))
const { data, error, refresh } = await useFetch<{
  provider: { id: string; name: string; email: string; contactName: string | null }
  assignments: Assignment[]
}>(`/api/admin/providers/${providerId}`, { credentials: 'include', server: false, query: range })

const assignments = computed(() => data.value?.assignments ?? [])
const totals = computed(() =>
  assignments.value.filter(billable).reduce(
    (t, a) => ({
      base: t.base + a.baseCents,
      payout: t.payout + a.payoutCents,
      open: t.open + (a.paidOutAt ? 0 : a.payoutCents),
    }),
    { base: 0, payout: 0, open: 0 },
  ),
)

const { run, pending } = useAdminAction({ refresh })
const patch = (id: string, body: { payoutCents?: number; paidOut?: boolean }, success: string) =>
  run(
    () =>
      $fetch(`/api/admin/providers/assignments/${id}`, {
        method: 'PATCH',
        credentials: 'include',
        body,
      }),
    { success, error: 'Speichern fehlgeschlagen' },
  )

function correctPayout(a: Assignment) {
  const input = window.prompt(
    'Vergütung in € (Korrektur wird protokolliert)',
    String(a.payoutCents / 100),
  )
  // Blank input would become 0 and silently wipe the payout; an explicit "0" is allowed.
  if (input === null || input.trim() === '') return
  const cents = Math.round(Number(input.replace(',', '.')) * 100)
  if (!Number.isFinite(cents) || cents < 0) return
  return patch(a.id, { payoutCents: cents }, 'Vergütung korrigiert')
}

/** Paid-out checkbox; on failure the box is reset to the stored value and the data reloaded. */
async function togglePaid(a: Assignment, el: HTMLInputElement) {
  const ok = await patch(a.id, { paidOut: el.checked }, 'Auszahlung gespeichert')
  if (!ok) {
    el.checked = Boolean(a.paidOutAt)
    await refresh()
  }
}

/** Same scope as the "Offen" card: the selected period. */
function payoutAll() {
  return run(
    () =>
      $fetch(`/api/admin/providers/${providerId}/payout`, {
        method: 'POST',
        credentials: 'include',
        body: range.value,
      }),
    {
      success: 'Offene Aufträge im Zeitraum als ausgezahlt markiert',
      error: 'Aktion fehlgeschlagen',
    },
  )
}

const columns = [
  { key: 'order', label: 'Bestellung', sortValue: (a: Assignment) => a.order.orderNumber },
  { key: 'createdAt', label: 'Vergeben' },
  { key: 'status', label: 'Status' },
  { key: 'baseCents', label: 'Warenwert', align: 'right' as const },
  { key: 'rateBp', label: 'Satz', align: 'right' as const },
  { key: 'payoutCents', label: 'Vergütung', align: 'right' as const },
  {
    key: 'own',
    label: 'Dein Anteil',
    align: 'right' as const,
    sortValue: (a: Assignment) => a.baseCents - a.payoutCents,
  },
  { key: 'paidOutAt', label: 'Ausgezahlt' },
]
</script>

<template>
  <div class="flex flex-col gap-lg" data-testid="admin-provider-detail">
    <div class="flex flex-wrap items-center gap-md">
      <NuxtLink to="/admin/providers" class="text-caption text-brand hover:underline"
        >← Anbieter</NuxtLink
      >
      <h2 v-if="data" class="text-heading-small">{{ data.provider.name }}</h2>
      <span v-if="data" class="text-caption text-secondary">{{ data.provider.email }}</span>
    </div>
    <p v-if="error" class="text-body-regular text-red-500" role="alert">
      Anbieter konnte nicht geladen werden.
    </p>

    <div class="flex flex-wrap items-center gap-md">
      <select v-model="period" :class="selectClass" aria-label="Zeitraum">
        <option value="this">Dieser Monat</option>
        <option value="last">Letzter Monat</option>
        <option value="year">Dieses Jahr</option>
        <option value="all">Gesamt</option>
      </select>
      <PsButton
        v-if="auth.can('providers:write') && totals.open > 0"
        variant="secondary"
        :disabled="pending"
        data-testid="payout-all"
        @click="payoutAll"
        >Offene im Zeitraum als ausgezahlt markieren</PsButton
      >
    </div>

    <div class="grid gap-lg sm:grid-cols-3">
      <PsCard>
        <p class="text-caption text-secondary">Warenwert</p>
        <p class="mt-sm text-heading-small">{{ formatCents(totals.base) }}</p>
      </PsCard>
      <PsCard>
        <p class="text-caption text-secondary">Vergütung / dein Anteil</p>
        <p class="mt-sm text-heading-small">
          {{ formatCents(totals.payout) }}
          <span class="text-brand">/ {{ formatCents(totals.base - totals.payout) }}</span>
        </p>
      </PsCard>
      <PsCard>
        <p class="text-caption text-secondary">Offen</p>
        <p class="mt-sm text-heading-small" data-testid="provider-open">
          {{ formatCents(totals.open) }}
        </p>
      </PsCard>
    </div>

    <PsAdminTable :columns="columns" :rows="assignments" empty="Keine Aufträge im Zeitraum">
      <template #cell-order="{ row }">
        <NuxtLink
          :to="`/admin/orders/${(row as Assignment).order.id}`"
          class="text-brand hover:underline"
          >{{ (row as Assignment).order.orderNumber }}</NuxtLink
        >
        <PsOrderStatusBadge class="ml-sm" :status="(row as Assignment).order.status" />
      </template>
      <template #cell-createdAt="{ value }">{{
        new Date(String(value)).toLocaleDateString('de-DE')
      }}</template>
      <template #cell-status="{ row }">
        <PsBadge :variant="(row as Assignment).status === 'cancelled' ? 'default' : 'external'">
          {{ LABELS[(row as Assignment).status] }}
        </PsBadge>
        <span v-if="(row as Assignment).shareCustomerData" class="ml-sm text-caption text-secondary"
          >Direktversand</span
        >
      </template>
      <template #cell-baseCents="{ value }">{{ formatCents(Number(value)) }}</template>
      <template #cell-rateBp="{ value }"
        >{{ (Number(value) / 100).toLocaleString('de-DE') }} %</template
      >
      <template #cell-payoutCents="{ row }">
        <button
          v-if="auth.can('providers:write') && (row as Assignment).status !== 'cancelled'"
          type="button"
          class="hover:underline"
          title="Vergütung korrigieren"
          @click="correctPayout(row as Assignment)"
        >
          {{ formatCents((row as Assignment).payoutCents) }}
        </button>
        <template v-else>{{ formatCents((row as Assignment).payoutCents) }}</template>
      </template>
      <template #cell-own="{ row }">
        {{ formatCents((row as Assignment).baseCents - (row as Assignment).payoutCents) }}
      </template>
      <template #cell-paidOutAt="{ row }">
        <label
          v-if="billable(row as Assignment)"
          class="flex cursor-pointer items-center gap-sm text-caption"
        >
          <input
            type="checkbox"
            :checked="Boolean((row as Assignment).paidOutAt)"
            :disabled="!auth.can('providers:write') || pending"
            @change="togglePaid(row as Assignment, $event.target as HTMLInputElement)"
          />
          {{
            (row as Assignment).paidOutAt
              ? new Date(String((row as Assignment).paidOutAt)).toLocaleDateString('de-DE')
              : 'offen'
          }}
        </label>
        <span v-else class="text-caption text-secondary">–</span>
      </template>
    </PsAdminTable>
  </div>
</template>
