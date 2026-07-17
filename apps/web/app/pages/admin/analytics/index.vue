<script setup lang="ts">
import { PsCard } from '@print-shop/ui'
import { formatCents } from '@print-shop/utils'
import { computed, ref } from 'vue'

definePageMeta({ layout: 'admin', middleware: 'admin-auth' })

interface Kpis {
  sessions: number
  orders: number
  grossRevenueCents: number
  netRevenueCents: number
  avgOrderValueCents: number
  conversionRate: number
  addToCartRate: number
  checkoutRate: number
  refunds: number
  cancellations: number
}
interface Overview {
  range: { from: string; to: string }
  current: {
    kpis: Kpis
    funnel: { stage: string; sessions: number }[]
    timeseries: { day: string; sessions: number; purchases: number; revenueCents: number }[]
    channels: { channel: string; campaign: string; orders: number; revenueCents: number }[]
  }
  previous: Kpis | null
  meta: { lastEventAt: string | null; note: string }
}

function inputDay(d: Date): string {
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function localBoundary(day: string, endOfDay: boolean): string {
  const date = new Date(`${day}T${endOfDay ? '23:59:59.999' : '00:00:00.000'}`)
  return Number.isNaN(date.getTime()) ? '' : date.toISOString()
}
const today = new Date()
const periodStart = new Date(today)
periodStart.setDate(periodStart.getDate() - 29)
const from = ref(inputDay(periodStart))
const to = ref(inputDay(today))
const compare = ref(true)

const query = computed(() => ({
  from: localBoundary(from.value, false),
  to: localBoundary(to.value, true),
  compare: compare.value ? '1' : '',
}))

const { data, pending, error } = await useFetch<Overview>('/api/admin/tracking/overview', {
  credentials: 'include',
  server: false,
  query,
})

const CHANNEL_LABELS: Record<string, string> = {
  meta_ads: 'Meta Ads',
  tiktok_ads: 'TikTok Ads',
  google_ads: 'Google Ads',
  organic: 'Organisch',
  referral: 'Referral',
  email: 'E-Mail',
  direct: 'Direkt',
}

function pct(n: number): string {
  return `${(n * 100).toFixed(1)} %`
}
function delta(cur: number, prev: number | undefined): { txt: string; up: boolean } | null {
  if (prev == null || prev === 0) return null
  const change = (cur - prev) / prev
  return { txt: `${change >= 0 ? '+' : ''}${(change * 100).toFixed(0)} %`, up: change >= 0 }
}

function csvCell(value: string | number): string {
  let text = String(value)
  // Campaign/source are public UTM input. Neutralize spreadsheet formulas and
  // quote delimiters/newlines before an admin opens the export in Excel/Sheets.
  if (/^\s*[=+\-@]/.test(text)) text = `'${text}`
  return `"${text.replaceAll('"', '""')}"`
}

const kpiCards = computed(() => {
  const k = data.value?.current.kpis
  const p = data.value?.previous ?? undefined
  if (!k) return []
  return [
    { label: 'Sessions', value: String(k.sessions), d: delta(k.sessions, p?.sessions) },
    { label: 'Bestellungen', value: String(k.orders), d: delta(k.orders, p?.orders) },
    {
      label: 'Conversion-Rate',
      value: pct(k.conversionRate),
      d: delta(k.conversionRate, p?.conversionRate),
    },
    {
      label: 'Bruttoumsatz',
      value: formatCents(k.grossRevenueCents),
      d: delta(k.grossRevenueCents, p?.grossRevenueCents),
    },
    {
      label: 'Ø Bestellwert',
      value: formatCents(k.avgOrderValueCents),
      d: delta(k.avgOrderValueCents, p?.avgOrderValueCents),
    },
    {
      label: 'Add-to-Cart-Rate',
      value: pct(k.addToCartRate),
      d: delta(k.addToCartRate, p?.addToCartRate),
    },
    { label: 'Rückerstattungen', value: String(k.refunds), d: null },
    { label: 'Stornierungen', value: String(k.cancellations), d: null },
  ]
})

function exportCsv() {
  const rows = data.value?.current.channels ?? []
  const header = ['channel', 'campaign', 'orders', 'revenue_eur'].map(csvCell).join(',')
  const body = rows
    .map((r) =>
      [r.channel, r.campaign, r.orders, (r.revenueCents / 100).toFixed(2)].map(csvCell).join(','),
    )
    .join('\n')
  const blob = new Blob([`\uFEFF${header}\n${body}`], { type: 'text/csv;charset=utf-8' })
  const a = document.createElement('a')
  const url = URL.createObjectURL(blob)
  a.href = url
  a.download = `analytics-${from.value}_${to.value}.csv`
  a.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 0)
}
</script>

<template>
  <div class="flex flex-col gap-lg" data-testid="admin-analytics">
    <div class="flex flex-wrap items-end gap-md">
      <label class="flex flex-col text-caption text-secondary">
        Von
        <input v-model="from" type="date" class="mt-xs rounded border border-subtle px-sm py-xs" />
      </label>
      <label class="flex flex-col text-caption text-secondary">
        Bis
        <input v-model="to" type="date" class="mt-xs rounded border border-subtle px-sm py-xs" />
      </label>
      <label class="flex items-center gap-xs text-caption text-secondary">
        <input v-model="compare" type="checkbox" /> Vergleich zur Vorperiode
      </label>
      <button
        class="rounded bg-brand px-md py-xs text-body-regular text-on-brand"
        type="button"
        @click="exportCsv"
      >
        CSV-Export (Quellen)
      </button>
    </div>

    <p v-if="data" class="text-caption text-secondary">
      {{ data.meta.note }}
      <template v-if="data.meta.lastEventAt">
        · Letztes Event: {{ new Date(data.meta.lastEventAt).toLocaleString('de-DE') }}
      </template>
    </p>

    <p v-if="error" class="text-body-regular text-danger">Daten konnten nicht geladen werden.</p>
    <p v-else-if="pending" class="text-body-regular text-secondary">Lädt…</p>

    <template v-else-if="data">
      <div class="grid gap-lg sm:grid-cols-2 lg:grid-cols-4">
        <PsCard v-for="card in kpiCards" :key="card.label">
          <p class="text-caption text-secondary">{{ card.label }}</p>
          <p class="mt-sm text-heading-small">{{ card.value }}</p>
          <p
            v-if="card.d"
            class="mt-xs text-caption"
            :class="card.d.up ? 'text-success' : 'text-danger'"
          >
            {{ card.d.txt }} vs. Vorperiode
          </p>
        </PsCard>
      </div>

      <PsCard>
        <p class="text-caption text-secondary">Conversion-Funnel</p>
        <div class="mt-md">
          <TrackingFunnel :stages="data.current.funnel" />
        </div>
      </PsCard>

      <PsCard>
        <p class="text-caption text-secondary">Umsatz & Käufe pro Tag</p>
        <div class="mt-md">
          <TrackingTimeseries :points="data.current.timeseries" />
        </div>
      </PsCard>

      <PsCard>
        <p class="text-caption text-secondary">Umsatz nach Marketingquelle</p>
        <table class="mt-md w-full text-body-regular">
          <thead>
            <tr class="text-left text-caption text-secondary">
              <th class="py-xs">Quelle</th>
              <th class="py-xs">Kampagne</th>
              <th class="py-xs text-right">Bestellungen</th>
              <th class="py-xs text-right">Umsatz</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(c, i) in data.current.channels" :key="i" class="border-t border-subtle">
              <td class="py-xs">{{ CHANNEL_LABELS[c.channel] ?? c.channel }}</td>
              <td class="py-xs text-secondary">{{ c.campaign }}</td>
              <td class="py-xs text-right">{{ c.orders }}</td>
              <td class="py-xs text-right">{{ formatCents(c.revenueCents) }}</td>
            </tr>
            <tr v-if="data.current.channels.length === 0">
              <td colspan="4" class="py-sm text-secondary">
                Noch keine attribuierten Bestellungen.
              </td>
            </tr>
          </tbody>
        </table>
      </PsCard>
    </template>
  </div>
</template>
