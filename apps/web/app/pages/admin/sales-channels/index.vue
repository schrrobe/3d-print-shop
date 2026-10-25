<script setup lang="ts">
import { PsAdminTable, PsBadge, PsButton, PsCard, PsInput, useToast } from '@print-shop/ui'
import { formatCents } from '@print-shop/utils'

definePageMeta({ layout: 'admin', middleware: 'admin-auth' })

interface SalesChannel {
  id: string
  code: string
  name: string
  url: string
  productId: string | null
  voucherId: string | null
  voucher: { code: string } | null
  commissionType: 'percent' | 'fixed'
  /** percent: basis points, fixed: cents */
  commissionValue: number
  active: boolean
  clicks: number
  orders: number
  revenueCents: number
  commissionCents: number
}

const auth = useAdminAuthStore()
const toast = useToast()
const selectClass =
  'rounded-card border border-subtle bg-surface-elevated px-md py-sm text-body-regular'

// Period [from, to) in local time — months match a monthly payout.
const period = ref<'this' | 'last' | 'all'>('this')
const range = computed(() => {
  const now = new Date()
  if (period.value === 'all')
    return {
      from: new Date(0).toISOString(),
      to: new Date(now.getTime() + 86_400_000).toISOString(),
    }
  const m = now.getMonth() - (period.value === 'last' ? 1 : 0)
  return {
    from: new Date(now.getFullYear(), m, 1).toISOString(),
    to: new Date(now.getFullYear(), m + 1, 1).toISOString(),
  }
})

const { data, error, refresh } = await useFetch<{
  channels: SalesChannel[]
  shopRevenueCents: number
}>('/api/admin/sales-channels', { credentials: 'include', server: false, query: range })
const { data: products } = await useFetch<{
  products: { id: string; slug: string; translations: { locale: string; name: string }[] }[]
}>('/api/admin/products', { credentials: 'include', server: false })
const { data: vouchers } = await useFetch<{ vouchers: { id: string; code: string }[] }>(
  '/api/admin/vouchers',
  { credentials: 'include', server: false },
)

const channels = computed(() => data.value?.channels ?? [])
const shopRevenue = computed(() => data.value?.shopRevenueCents ?? 0)
const percent = (part: number, whole: number) =>
  whole > 0
    ? `${((part / whole) * 100).toLocaleString('de-DE', { maximumFractionDigits: 1 })} %`
    : '—'

const totals = computed(() =>
  channels.value.reduce(
    (a, c) => ({
      clicks: a.clicks + c.clicks,
      orders: a.orders + c.orders,
      revenueCents: a.revenueCents + c.revenueCents,
      commissionCents: a.commissionCents + c.commissionCents,
    }),
    { clicks: 0, orders: 0, revenueCents: 0, commissionCents: 0 },
  ),
)

function formatRule(c: Pick<SalesChannel, 'commissionType' | 'commissionValue'>): string {
  return c.commissionType === 'percent'
    ? `${(c.commissionValue / 100).toLocaleString('de-DE')} %`
    : `${formatCents(c.commissionValue)} / Bestellung`
}

async function copy(c: SalesChannel) {
  try {
    await navigator.clipboard.writeText(c.url)
    toast.show('Link kopiert', { variant: 'success' })
  } catch {
    toast.show('Kopieren nicht möglich – bitte Link markieren', { variant: 'error' })
  }
}

// Create / edit
const form = ref<{
  id?: string
  code: string
  name: string
  productId: string
  voucherId: string
  commissionType: 'percent' | 'fixed'
  /** percent: %, fixed: € — converted on submit */
  value: string
  active: boolean
} | null>(null)

function open(c?: SalesChannel) {
  form.value = c
    ? {
        id: c.id,
        code: c.code,
        name: c.name,
        productId: c.productId ?? '',
        voucherId: c.voucherId ?? '',
        commissionType: c.commissionType,
        value: String(c.commissionValue / 100),
        active: c.active,
      }
    : {
        code: '',
        name: '',
        productId: '',
        voucherId: '',
        commissionType: 'percent',
        value: '10',
        active: true,
      }
}

// A voucher belongs to at most one channel.
const freeVouchers = computed(() => {
  const taken = new Set(
    channels.value.filter((c) => c.id !== form.value?.id).map((c) => c.voucherId),
  )
  return (vouchers.value?.vouchers ?? []).filter((v) => !taken.has(v.id))
})

const { run, pending: saving } = useAdminAction({ refresh })
async function save() {
  const f = form.value
  if (!f) return
  const body = {
    code: f.code,
    name: f.name,
    productId: f.productId || null,
    voucherId: f.voucherId || null,
    commissionType: f.commissionType,
    // percent → basis points, fixed € → cents; both are value × 100
    commissionValue: Math.round(Number(f.value) * 100),
    active: f.active,
  }
  const ok = await run(
    () =>
      $fetch(f.id ? `/api/admin/sales-channels/${f.id}` : '/api/admin/sales-channels', {
        method: f.id ? 'PUT' : 'POST',
        credentials: 'include',
        body,
      }),
    {
      success: f.id ? 'Verkaufskanal gespeichert' : 'Verkaufskanal angelegt',
      error: 'Speichern fehlgeschlagen',
    },
  )
  if (ok) form.value = null
}

const qr = ref<SalesChannel | null>(null)

const columns = [
  { key: 'name', label: 'Kanal' },
  { key: 'url', label: 'Link' },
  { key: 'rule', label: 'Provision' },
  { key: 'clicks', label: 'Klicks', align: 'right' as const },
  { key: 'orders', label: 'Käufe', align: 'right' as const },
  { key: 'revenueCents', label: 'Umsatz', align: 'right' as const },
  { key: 'share', label: 'Anteil', align: 'right' as const },
  { key: 'commissionCents', label: 'Provision €', align: 'right' as const },
  { key: 'active', label: 'Status' },
  { key: 'actions', label: '' },
]
</script>

<template>
  <div class="flex flex-col gap-lg" data-testid="admin-sales-channels">
    <div class="flex flex-wrap items-center gap-md">
      <select
        v-model="period"
        :class="selectClass"
        aria-label="Zeitraum"
        data-testid="channel-period"
      >
        <option value="this">Dieser Monat</option>
        <option value="last">Letzter Monat</option>
        <option value="all">Gesamt</option>
      </select>
      <PsButton v-if="auth.can('sales-channels:write')" data-testid="new-channel" @click="open()">
        Neuer Verkaufskanal
      </PsButton>
    </div>

    <p v-if="error" class="text-body-regular text-red-500" role="alert">
      Verkaufskanäle konnten nicht geladen werden.
    </p>

    <div class="grid gap-lg sm:grid-cols-2 lg:grid-cols-4">
      <PsCard>
        <p class="text-caption text-secondary">Umsatz über Kanäle</p>
        <p class="mt-sm text-heading-small text-brand" data-testid="channels-revenue">
          {{ formatCents(totals.revenueCents) }}
        </p>
      </PsCard>
      <PsCard>
        <p class="text-caption text-secondary">Anteil am Shop-Umsatz</p>
        <p class="mt-sm text-heading-small" data-testid="channels-share">
          {{ percent(totals.revenueCents, shopRevenue) }}
        </p>
      </PsCard>
      <PsCard>
        <p class="text-caption text-secondary">Provision gesamt</p>
        <p class="mt-sm text-heading-small" data-testid="channels-commission">
          {{ formatCents(totals.commissionCents) }}
        </p>
      </PsCard>
      <PsCard>
        <p class="text-caption text-secondary">Käufe / Klicks</p>
        <p class="mt-sm text-heading-small" data-testid="channels-conversion">
          {{ totals.orders }} / {{ totals.clicks }}
        </p>
      </PsCard>
    </div>

    <PsCard v-if="form">
      <form
        class="flex max-w-[36rem] flex-col gap-md"
        data-testid="channel-form"
        @submit.prevent="save"
      >
        <PsInput
          v-model="form.name"
          label="Name (z. B. Anna – Instagram)"
          required
          data-testid="channel-name"
        />
        <PsInput
          v-model="form.code"
          label="Link-Code"
          placeholder="anna-insta"
          required
          :disabled="Boolean(form.id)"
          data-testid="channel-code"
        />
        <label class="flex flex-col gap-xs text-caption text-secondary">
          Ziel
          <select v-model="form.productId" :class="selectClass" data-testid="channel-product">
            <option value="">Startseite</option>
            <option v-for="p in products?.products ?? []" :key="p.id" :value="p.id">
              {{ p.translations.find((t) => t.locale === 'de')?.name ?? p.slug }}
            </option>
          </select>
        </label>
        <label class="flex flex-col gap-xs text-caption text-secondary">
          Gutschein (Einlösung ordnet die Bestellung diesem Kanal zu)
          <select v-model="form.voucherId" :class="selectClass" data-testid="channel-voucher">
            <option value="">Kein Gutschein</option>
            <option v-for="v in freeVouchers" :key="v.id" :value="v.id">{{ v.code }}</option>
          </select>
        </label>
        <fieldset class="flex gap-lg" role="radiogroup" aria-label="Provisionsart">
          <label class="flex cursor-pointer items-center gap-sm">
            <input
              v-model="form.commissionType"
              type="radio"
              value="percent"
              data-testid="commission-percent"
            />
            <span>Prozent vom Warenwert</span>
          </label>
          <label class="flex cursor-pointer items-center gap-sm">
            <input
              v-model="form.commissionType"
              type="radio"
              value="fixed"
              data-testid="commission-fixed"
            />
            <span>Festbetrag je Bestellung</span>
          </label>
        </fieldset>
        <PsInput
          v-model="form.value"
          :label="form.commissionType === 'percent' ? 'Provision (%)' : 'Provision (€)'"
          type="number"
          min="0"
          :max="form.commissionType === 'percent' ? 100 : undefined"
          required
          data-testid="channel-commission"
        />
        <label class="flex cursor-pointer items-center gap-sm text-body-regular">
          <input v-model="form.active" type="checkbox" data-testid="channel-active" />
          Aktiv (inaktive Links leiten weiter, zählen aber nicht)
        </label>
        <div class="flex gap-md">
          <PsButton type="submit" :disabled="saving" data-testid="save-channel">Speichern</PsButton>
          <PsButton type="button" variant="ghost" @click="form = null">Abbrechen</PsButton>
        </div>
      </form>
    </PsCard>

    <PsCard v-if="qr" data-testid="channel-qr">
      <div class="flex flex-wrap items-center gap-lg">
        <img
          :src="`/api/admin/sales-channels/${qr.id}/qr.svg`"
          :alt="`QR-Code für ${qr.url}`"
          class="size-40"
        />
        <div class="flex flex-col gap-sm">
          <p class="font-mono text-body-regular">{{ qr.url }}</p>
          <a
            :href="`/api/admin/sales-channels/${qr.id}/qr.svg`"
            :download="`qr-${qr.code}.svg`"
            class="text-brand hover:underline"
          >
            SVG herunterladen
          </a>
          <PsButton variant="ghost" size="sm" @click="qr = null">Schließen</PsButton>
        </div>
      </div>
    </PsCard>

    <PsAdminTable :columns="columns" :rows="channels" empty="Noch keine Verkaufskanäle">
      <template #cell-name="{ row }">
        <span data-testid="channel-row-name">{{ (row as SalesChannel).name }}</span>
        <span
          v-if="(row as SalesChannel).voucher"
          class="ml-sm font-mono text-caption text-secondary"
        >
          {{ (row as SalesChannel).voucher?.code }}
        </span>
      </template>
      <template #cell-url="{ row }">
        <button
          type="button"
          class="font-mono text-brand hover:underline"
          title="Link kopieren"
          data-testid="channel-url"
          @click="copy(row as SalesChannel)"
        >
          {{ (row as SalesChannel).url }}
        </button>
      </template>
      <template #cell-rule="{ row }">{{ formatRule(row as SalesChannel) }}</template>
      <template #cell-clicks="{ value }"
        ><span data-testid="channel-clicks">{{ value }}</span></template
      >
      <template #cell-orders="{ value }"
        ><span data-testid="channel-orders">{{ value }}</span></template
      >
      <template #cell-revenueCents="{ value }">
        <span data-testid="channel-revenue">{{ formatCents(Number(value)) }}</span>
      </template>
      <template #cell-share="{ row }">
        <span data-testid="channel-share">{{
          percent((row as SalesChannel).revenueCents, shopRevenue)
        }}</span>
      </template>
      <template #cell-commissionCents="{ value }">
        <span data-testid="channel-commission-amount">{{ formatCents(Number(value)) }}</span>
      </template>
      <template #cell-active="{ value }">
        <PsBadge :variant="value ? 'brand' : 'default'">{{ value ? 'aktiv' : 'inaktiv' }}</PsBadge>
      </template>
      <template #cell-actions="{ row }">
        <div class="flex gap-sm">
          <PsButton variant="ghost" size="sm" @click="qr = row as SalesChannel">QR</PsButton>
          <PsButton
            v-if="auth.can('sales-channels:write')"
            variant="ghost"
            size="sm"
            data-testid="edit-channel"
            @click="open(row as SalesChannel)"
          >
            Bearbeiten
          </PsButton>
        </div>
      </template>
    </PsAdminTable>
  </div>
</template>
