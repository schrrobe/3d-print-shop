<script setup lang="ts">
import { PsAdminTable, PsBadge, PsButton, PsCard, PsInput } from '@print-shop/ui'
import { formatCents } from '@print-shop/utils'

definePageMeta({ layout: 'admin', middleware: 'admin-auth' })

interface Provider {
  id: string
  name: string
  contactName: string | null
  email: string
  /** basis points (1500 = 15 %) */
  defaultRateBp: number
  notes: string | null
  active: boolean
  orders: number
  baseCents: number
  payoutCents: number
  ownCents: number
  openPayoutCents: number
}

const auth = useAdminAuthStore()
const selectClass =
  'rounded-card border border-subtle bg-surface-elevated px-md py-sm text-body-regular'

const period = ref<'this' | 'last' | 'year' | 'all'>('this')
const range = computed(() => adminPeriodRange(period.value))

const { data, error, refresh } = await useFetch<{
  providers: Provider[]
  shopRevenueCents: number
}>('/api/admin/providers', { credentials: 'include', server: false, query: range })

const providers = computed(() => data.value?.providers ?? [])
const shopRevenue = computed(() => data.value?.shopRevenueCents ?? 0)
const percent = (part: number, whole: number) =>
  whole > 0
    ? `${((part / whole) * 100).toLocaleString('de-DE', { maximumFractionDigits: 1 })} %`
    : '—'
const totals = computed(() =>
  providers.value.reduce(
    (a, p) => ({
      orders: a.orders + p.orders,
      baseCents: a.baseCents + p.baseCents,
      payoutCents: a.payoutCents + p.payoutCents,
      ownCents: a.ownCents + p.ownCents,
      openPayoutCents: a.openPayoutCents + p.openPayoutCents,
    }),
    { orders: 0, baseCents: 0, payoutCents: 0, ownCents: 0, openPayoutCents: 0 },
  ),
)

const form = ref<{
  id?: string
  name: string
  contactName: string
  email: string
  /** percent, converted to basis points on submit */
  rate: string
  notes: string
  active: boolean
} | null>(null)

function open(p?: Provider) {
  form.value = p
    ? {
        id: p.id,
        name: p.name,
        contactName: p.contactName ?? '',
        email: p.email,
        rate: String(p.defaultRateBp / 100),
        notes: p.notes ?? '',
        active: p.active,
      }
    : { name: '', contactName: '', email: '', rate: '15', notes: '', active: true }
}

const { run, pending: saving } = useAdminAction({ refresh })
async function save() {
  const f = form.value
  if (!f) return
  const body = {
    name: f.name,
    contactName: f.contactName.trim() || null,
    email: f.email,
    defaultRateBp: Math.round(Number(f.rate) * 100),
    notes: f.notes.trim() || null,
    active: f.active,
  }
  const ok = await run(
    () =>
      $fetch(f.id ? `/api/admin/providers/${f.id}` : '/api/admin/providers', {
        method: f.id ? 'PUT' : 'POST',
        credentials: 'include',
        body,
      }),
    {
      success: f.id ? 'Anbieter gespeichert' : 'Anbieter angelegt',
      error: 'Speichern fehlgeschlagen',
    },
  )
  // Only close the form that was submitted; another provider may have been opened meanwhile.
  if (ok && form.value === f) form.value = null
}

const columns = [
  { key: 'name', label: 'Anbieter' },
  { key: 'rate', label: 'Satz', sortValue: (r: Provider) => r.defaultRateBp },
  { key: 'orders', label: 'Aufträge', align: 'right' as const },
  { key: 'baseCents', label: 'Warenwert', align: 'right' as const },
  { key: 'payoutCents', label: 'Vergütung', align: 'right' as const },
  { key: 'ownCents', label: 'Dein Anteil', align: 'right' as const },
  { key: 'openPayoutCents', label: 'Offen', align: 'right' as const },
  { key: 'active', label: 'Status' },
  { key: 'actions', label: '' },
]
</script>

<template>
  <div class="flex flex-col gap-lg" data-testid="admin-providers">
    <div class="flex flex-wrap items-center gap-md">
      <select
        v-model="period"
        :class="selectClass"
        aria-label="Zeitraum"
        data-testid="provider-period"
      >
        <option value="this">Dieser Monat</option>
        <option value="last">Letzter Monat</option>
        <option value="year">Dieses Jahr</option>
        <option value="all">Gesamt</option>
      </select>
      <PsButton v-if="auth.can('providers:write')" data-testid="new-provider" @click="open()">
        Neuer Anbieter
      </PsButton>
    </div>
    <p class="text-caption text-secondary">
      Gezählt werden fertig gemeldete und eingegangene Aufträge, die im Zeitraum vergeben wurden.
      „Offen“ = noch nicht ausgezahlte Vergütung (unabhängig vom Zeitraum).
    </p>

    <p v-if="error" class="text-body-regular text-red-500" role="alert">
      Anbieter konnten nicht geladen werden.
    </p>

    <div class="grid gap-lg sm:grid-cols-2 lg:grid-cols-5">
      <PsCard>
        <p class="text-caption text-secondary">Warenwert extern</p>
        <p class="mt-sm text-heading-small" data-testid="providers-base">
          {{ formatCents(totals.baseCents) }}
        </p>
      </PsCard>
      <PsCard>
        <p class="text-caption text-secondary">Vergütung Anbieter</p>
        <p class="mt-sm text-heading-small" data-testid="providers-payout">
          {{ formatCents(totals.payoutCents) }}
        </p>
      </PsCard>
      <PsCard>
        <p class="text-caption text-secondary">Dein Anteil</p>
        <p class="mt-sm text-heading-small text-brand" data-testid="providers-own">
          {{ formatCents(totals.ownCents) }}
        </p>
      </PsCard>
      <PsCard>
        <p class="text-caption text-secondary">Offene Auszahlungen</p>
        <p class="mt-sm text-heading-small" data-testid="providers-open">
          {{ formatCents(totals.openPayoutCents) }}
        </p>
      </PsCard>
      <PsCard>
        <p class="text-caption text-secondary">Anteil am Shop-Umsatz</p>
        <p class="mt-sm text-heading-small" data-testid="providers-share">
          {{ percent(totals.baseCents, shopRevenue) }}
        </p>
      </PsCard>
    </div>

    <PsCard v-if="form">
      <form
        class="flex max-w-[36rem] flex-col gap-md"
        data-testid="provider-form"
        @submit.prevent="save"
      >
        <PsInput v-model="form.name" label="Name" required data-testid="provider-name" />
        <PsInput v-model="form.contactName" label="Ansprechperson" data-testid="provider-contact" />
        <PsInput
          v-model="form.email"
          label="E-Mail"
          type="email"
          required
          data-testid="provider-email"
        />
        <PsInput
          v-model="form.rate"
          label="Standard-Anteil vom Warenwert (%)"
          type="number"
          min="0"
          max="100"
          step="0.01"
          required
          data-testid="provider-rate"
        />
        <label class="flex flex-col gap-xs text-caption text-secondary">
          Notiz
          <textarea v-model="form.notes" rows="2" maxlength="2000" :class="selectClass" />
        </label>
        <label class="flex cursor-pointer items-center gap-sm text-body-regular">
          <input v-model="form.active" type="checkbox" data-testid="provider-active" />
          Aktiv (inaktive Anbieter stehen nicht zur Auswahl)
        </label>
        <p v-if="form.id" class="text-caption text-secondary">
          Satzänderungen gelten nur für neue Aufträge.
        </p>
        <div class="flex gap-md">
          <PsButton type="submit" :disabled="saving" data-testid="save-provider"
            >Speichern</PsButton
          >
          <PsButton type="button" variant="ghost" @click="form = null">Abbrechen</PsButton>
        </div>
      </form>
    </PsCard>

    <PsAdminTable :columns="columns" :rows="providers" empty="Noch keine Anbieter">
      <template #cell-name="{ row }">
        <NuxtLink
          :to="`/admin/providers/${(row as Provider).id}`"
          class="text-brand hover:underline"
          data-testid="provider-row-name"
          >{{ (row as Provider).name }}</NuxtLink
        >
        <span class="ml-sm text-caption text-secondary">{{ (row as Provider).email }}</span>
      </template>
      <template #cell-rate="{ row }">
        {{ ((row as Provider).defaultRateBp / 100).toLocaleString('de-DE') }} %
      </template>
      <template #cell-baseCents="{ value }">{{ formatCents(Number(value)) }}</template>
      <template #cell-payoutCents="{ value }">{{ formatCents(Number(value)) }}</template>
      <template #cell-ownCents="{ value }">{{ formatCents(Number(value)) }}</template>
      <template #cell-openPayoutCents="{ value }">{{ formatCents(Number(value)) }}</template>
      <template #cell-active="{ value }">
        <PsBadge :variant="value ? 'external' : 'default'">{{
          value ? 'aktiv' : 'inaktiv'
        }}</PsBadge>
      </template>
      <template #cell-actions="{ row }">
        <PsButton
          v-if="auth.can('providers:write')"
          variant="ghost"
          size="sm"
          data-testid="edit-provider"
          @click="open(row as Provider)"
          >Bearbeiten</PsButton
        >
      </template>
    </PsAdminTable>
  </div>
</template>
