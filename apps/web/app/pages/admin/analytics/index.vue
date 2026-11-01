<script setup lang="ts">
import { PsCard } from '@print-shop/ui'
import { formatCents } from '@print-shop/utils'
import { computed, ref, watch } from 'vue'

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
interface TopRow {
  key: string
  count: number
}
interface EventRow {
  id: string
  name: string
  source: 'client' | 'server'
  occurredAt: string
  path: string | null
  valueCents: number | null
  visitor: string | null
  channel: string | null
  origin: string | null
}
interface Overview {
  range: { from: string; to: string }
  current: {
    kpis: Kpis
    funnel: { stage: string; sessions: number }[]
    timeseries: { day: string; sessions: number; purchases: number; revenueCents: number }[]
    channels: { channel: string; campaign: string; orders: number; revenueCents: number }[]
    uniqueVisitors: number
    topPages: TopRow[]
    topReferrers: TopRow[]
    topUtmSources: TopRow[]
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

const eventName = ref('')
const page = ref(1)
watch([query, eventName], () => (page.value = 1))
const { data: events } = await useFetch<{
  items: EventRow[]
  total: number
  page: number
  pageSize: number
}>('/api/admin/tracking/events', {
  credentials: 'include',
  server: false,
  query: computed(() => ({
    from: query.value.from,
    to: query.value.to,
    name: eventName.value || undefined,
    page: page.value,
  })),
})
const pages = computed(() =>
  events.value ? Math.max(1, Math.ceil(events.value.total / events.value.pageSize)) : 1,
)

const EVENT_LABELS: Record<string, string> = {
  page_view: 'Seitenaufruf',
  view_item: 'Produktansicht',
  view_cart: 'Warenkorb angesehen',
  add_to_cart: 'In den Warenkorb',
  remove_from_cart: 'Aus dem Warenkorb',
  begin_checkout: 'Checkout gestartet',
  add_shipping_info: 'Versand gewählt',
  add_payment_info: 'Zahlung gewählt',
  add_to_wishlist: 'Merkliste',
  voucher_applied: 'Gutschein eingelöst',
  order_created: 'Bestellung angelegt',
  purchase: 'Kauf',
  refund: 'Rückerstattung',
  order_cancelled: 'Storno',
}
const FUNNEL_LABELS: Record<string, string> = {
  page_view: 'Seitenaufrufe',
  view_item: 'Produktansichten',
  add_to_cart: 'In den Warenkorb',
  begin_checkout: 'Checkout gestartet',
  purchase: 'Kauf',
}
const funnelCategories = { sessions: { name: 'Sessions', color: 'var(--color-brand)' } }
const seriesCategories = {
  sessions: { name: 'Sessions', color: 'var(--color-brand)' },
  purchases: { name: 'Käufe', color: '#f59e0b' },
}
const revenueCategories = { revenue: { name: 'Umsatz (€)', color: 'var(--color-brand)' } }
const revenueSeries = computed(() =>
  (data.value?.current.timeseries ?? []).map((p) => ({
    day: p.day,
    revenue: p.revenueCents / 100,
  })),
)
const dayLabel = (day: string | undefined) => (day ? `${day.slice(8, 10)}.${day.slice(5, 7)}.` : '')
// Horizontal bars draw index 0 at the bottom: reverse so page views sit on top.
const funnelBars = computed(() => [...(data.value?.current.funnel ?? [])].reverse())
const funnelBarLabel = (i: number) => funnelLabel(funnelBars.value.length - 1 - i)
const funnelLabel = (i: number) => {
  const stages = data.value?.current.funnel ?? []
  const s = stages[i]
  if (!s) return ''
  const prev = i > 0 ? stages[i - 1]?.sessions : 0
  return `${FUNNEL_LABELS[s.stage] ?? s.stage}${prev ? ` (${Math.round((s.sessions / prev) * 100)} %)` : ''}`
}
const tops = computed(() => {
  const c = data.value?.current
  return c
    ? [
        { title: 'Top-Seiten', empty: 'Noch keine Seitenaufrufe.', rows: c.topPages },
        {
          title: 'Herkunft (Referrer)',
          empty: 'Keine fremden Herkunftsseiten.',
          rows: c.topReferrers,
        },
        {
          title: 'Kampagnen (utm_source)',
          empty: 'Keine Aufrufe mit utm_source.',
          rows: c.topUtmSources,
        },
      ]
    : []
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
    { label: 'Eindeutige Besucher', value: String(data.value!.current.uniqueVisitors), d: null },
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
        <div class="mt-md" role="img" aria-label="Conversion-Funnel (Diagramm)">
          <BarChart
            :data="funnelBars"
            :height="240"
            :categories="funnelCategories"
            :y-axis="['sessions']"
            :orientation="Orientation.Horizontal"
            :y-formatter="funnelBarLabel"
            :x-num-ticks="5"
            :radius="4"
            hide-legend
            x-grid-line
          />
        </div>
        <table class="sr-only">
          <caption>
            Conversion-Funnel
          </caption>
          <tr>
            <th scope="col">Stufe</th>
            <th scope="col">Sessions</th>
          </tr>
          <tr v-for="(f, i) in data.current.funnel" :key="f.stage">
            <td>{{ funnelLabel(i) }}</td>
            <td>{{ f.sessions }}</td>
          </tr>
        </table>
      </PsCard>

      <div class="grid gap-lg lg:grid-cols-2">
        <PsCard>
          <p class="text-caption text-secondary">Sessions & Käufe pro Tag</p>
          <div
            v-if="data.current.timeseries.length"
            class="mt-md"
            role="img"
            aria-label="Sessions und Käufe pro Tag (Diagramm)"
          >
            <LineChart
              :data="data.current.timeseries"
              :height="260"
              :categories="seriesCategories"
              :x-formatter="(i: number) => dayLabel(data!.current.timeseries[i]?.day)"
              :x-num-ticks="7"
              :y-num-ticks="4"
              y-grid-line
            />
          </div>
          <p v-else class="mt-md text-caption text-secondary">Keine Daten im Zeitraum.</p>
        </PsCard>
        <PsCard>
          <p class="text-caption text-secondary">Umsatz pro Tag</p>
          <div
            v-if="revenueSeries.length"
            class="mt-md"
            role="img"
            aria-label="Umsatz pro Tag (Diagramm)"
          >
            <BarChart
              :data="revenueSeries"
              :height="260"
              :categories="revenueCategories"
              :y-axis="['revenue']"
              :x-formatter="(i: number) => dayLabel(revenueSeries[i]?.day)"
              :y-formatter="(v: number) => `${v} €`"
              :x-num-ticks="7"
              :y-num-ticks="4"
              :radius="4"
              hide-legend
              y-grid-line
            />
          </div>
          <p v-else class="mt-md text-caption text-secondary">Keine Daten im Zeitraum.</p>
        </PsCard>
        <table v-if="data.current.timeseries.length" class="sr-only">
          <caption>
            Sessions, Käufe und Umsatz pro Tag
          </caption>
          <tr>
            <th scope="col">Tag</th>
            <th scope="col">Sessions</th>
            <th scope="col">Käufe</th>
            <th scope="col">Umsatz</th>
          </tr>
          <tr v-for="p in data.current.timeseries" :key="p.day">
            <td>{{ p.day }}</td>
            <td>{{ p.sessions }}</td>
            <td>{{ p.purchases }}</td>
            <td>{{ formatCents(p.revenueCents) }}</td>
          </tr>
        </table>
      </div>

      <div class="grid gap-lg md:grid-cols-3">
        <PsCard v-for="t in tops" :key="t.title">
          <p class="text-caption text-secondary">{{ t.title }}</p>
          <p v-if="!t.rows.length" class="mt-md text-body-regular text-secondary">{{ t.empty }}</p>
          <ol v-else class="mt-sm text-body-regular">
            <li
              v-for="r in t.rows"
              :key="r.key"
              class="flex items-baseline gap-sm border-t border-subtle py-xs first:border-t-0"
            >
              <span class="min-w-0 flex-1 truncate" :title="r.key">{{ r.key }}</span>
              <span class="tabular-nums">{{ r.count.toLocaleString('de-DE') }}</span>
            </li>
          </ol>
        </PsCard>
      </div>

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

    <PsCard>
      <div class="flex flex-wrap items-center justify-between gap-md">
        <p class="text-caption text-secondary">Einzelne Events</p>
        <select
          v-model="eventName"
          class="rounded-card border border-subtle bg-surface-elevated px-md py-sm text-body-regular"
          aria-label="Event filtern"
        >
          <option value="">Alle Events</option>
          <option v-for="(label, key) in EVENT_LABELS" :key="key" :value="key">{{ label }}</option>
        </select>
      </div>
      <div class="mt-md overflow-x-auto">
        <table class="w-full text-body-regular">
          <thead>
            <tr class="text-left text-caption text-secondary">
              <th class="py-xs pr-md">Zeit</th>
              <th class="py-xs pr-md">Event</th>
              <th class="py-xs pr-md">Seite</th>
              <th class="py-xs pr-md">Herkunft</th>
              <th class="py-xs pr-md text-right">Wert</th>
              <th class="py-xs">Besucher</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="e in events?.items ?? []" :key="e.id" class="border-t border-subtle">
              <td class="whitespace-nowrap py-xs pr-md tabular-nums">
                {{ new Date(e.occurredAt).toLocaleString('de-DE') }}
              </td>
              <td class="py-xs pr-md">{{ EVENT_LABELS[e.name] ?? e.name }}</td>
              <td class="max-w-56 truncate py-xs pr-md" :title="e.path ?? ''">
                {{ e.path ?? '—' }}
              </td>
              <td class="max-w-48 truncate py-xs pr-md text-secondary">
                {{ e.origin ?? (e.channel ? (CHANNEL_LABELS[e.channel] ?? e.channel) : '—') }}
              </td>
              <td class="py-xs pr-md text-right">
                {{ e.valueCents != null ? formatCents(e.valueCents) : '—' }}
              </td>
              <td class="py-xs font-mono text-secondary">
                {{ e.visitor ?? (e.source === 'server' ? 'Server' : 'anonym') }}
              </td>
            </tr>
            <tr v-if="events && !events.items.length">
              <td colspan="6" class="py-sm text-secondary">Keine Events im Zeitraum.</td>
            </tr>
          </tbody>
        </table>
      </div>
      <nav
        v-if="events && pages > 1"
        class="mt-md flex items-center justify-between gap-md"
        aria-label="Seiten"
      >
        <button
          type="button"
          class="rounded border border-subtle px-md py-xs"
          :disabled="page <= 1"
          @click="page--"
        >
          Zurück
        </button>
        <span class="text-caption text-secondary tabular-nums" aria-live="polite"
          >Seite {{ page }} von {{ pages }} · {{ events.total }} Events</span
        >
        <button
          type="button"
          class="rounded border border-subtle px-md py-xs"
          :disabled="page >= pages"
          @click="page++"
        >
          Weiter
        </button>
      </nav>
    </PsCard>
  </div>
</template>
