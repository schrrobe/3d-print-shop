<script setup lang="ts">
/** Admin dashboard: widget grid (after storylo), reorder by drag & drop or arrows, order kept per browser. */
import { PsCard, PsPrinterStatusCard, useDragging } from '@print-shop/ui'
import { formatCents } from '@print-shop/utils'
import type { PrinterStatus } from '@print-shop/types'

definePageMeta({ layout: 'admin', middleware: 'admin-auth' })

interface Dashboard {
  ordersByStatus: Record<string, number>
  revenueCents: number
  openQuoteRequests: number
  openTickets: number
  printers: { id: string; name: string; status: PrinterStatus }[]
  productionWaiting: number
  buyerLocations: { lat: number; lon: number; count: number }[]
  buyerCountries: string[]
  paymentMethods: { method: string; count: number; amountCents: number }[]
  /** null when the role lacks tracking:read */
  returningVisitors: { returning: number; total: number; days: number } | null
}

const PAYMENT_LABELS: Record<string, string> = {
  stripe: 'Karte / Stripe',
  stripe_payment_link: 'Stripe-Zahlungslink',
  bank_transfer: 'Vorkasse (Überweisung)',
  bitcoin: 'Bitcoin',
}

const { data } = await useFetch<Dashboard>('/api/admin/dashboard', {
  credentials: 'include',
  server: false,
})

const TOP_PRODUCT_PERIODS = [
  { days: 7, label: 'Letzte 7 Tage' },
  { days: 30, label: 'Letzte 30 Tage' },
  { days: 90, label: 'Letzte 90 Tage' },
  { days: 365, label: 'Letzte 12 Monate' },
] as const
// Cookie-backed so the chosen period survives reloads, like the analytics range.
const topDays = useCookie<number>('admin-dashboard-top-days', { maxAge: 60 * 60 * 24 * 365, sameSite: 'lax', default: () => 30 })
if (!TOP_PRODUCT_PERIODS.some((p) => p.days === topDays.value)) topDays.value = 30
const { data: topProducts } = await useFetch<{
  total: number
  products: { productId: string; name: string; quantity: number }[]
}>('/api/admin/dashboard/top-products', {
  credentials: 'include',
  server: false,
  query: computed(() => ({ days: topDays.value })),
})

const ROW_PX = 120
const GAP_PX = 16

/** Fixed size per widget; `rows` must match the row-span class (Unovis needs a pixel height). */
const WIDGETS = {
  revenue: { title: 'Umsatz (bezahlt)', rows: 1, class: 'row-span-1' },
  quoteRequests: { title: 'Offene Upload-Anfragen', rows: 1, class: 'row-span-1' },
  productionWaiting: { title: 'Produktionsqueue (wartet)', rows: 1, class: 'row-span-1' },
  openTickets: { title: 'Offene Support-Tickets', rows: 1, class: 'row-span-1' },
  returningVisitors: { title: 'Wiederkehrende Besucher', rows: 1, class: 'row-span-1' },
  ordersByStatus: { title: 'Bestellungen', rows: 2, class: 'row-span-2' },
  buyerMap: { title: 'Käufer-Heatmap', rows: 3, class: 'row-span-3 md:col-span-2' },
  paymentMethods: { title: 'Zahlungsmethoden', rows: 2, class: 'row-span-2' },
  topProducts: { title: 'Beliebteste Artikel', rows: 3, class: 'row-span-3' },
  printers: { title: 'Drucker', rows: 2, class: 'row-span-2 md:col-span-4' },
} as const
type WidgetId = keyof typeof WIDGETS
const DEFAULT_ORDER = Object.keys(WIDGETS) as WidgetId[]
const STORAGE_KEY = 'admin-dashboard-widgets'

const order = ref<WidgetId[]>([...DEFAULT_ORDER])

onMounted(() => {
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')
    const known = (Array.isArray(saved) ? saved : []).filter((id): id is WidgetId => id in WIDGETS)
    // widgets added later are appended
    order.value = [...new Set([...known, ...DEFAULT_ORDER])]
  } catch {
    // corrupt or blocked storage → default order
  }
})

watch(order, (o) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(o))
  } catch {
    // storage blocked → order just isn't remembered
  }
})

function swap(a: WidgetId, b: WidgetId) {
  const next = [...order.value]
  const i = next.indexOf(a)
  const j = next.indexOf(b)
  if (i === -1 || j === -1 || i === j) return
  ;[next[i], next[j]] = [next[j]!, next[i]!]
  order.value = next
}

const announcement = ref('')
// Tracking widget only for roles with tracking:read (API sends null otherwise).
const visible = computed(() => order.value.filter((id) => id !== 'returningVisitors' || data.value?.returningVisitors))

function move(id: WidgetId, delta: -1 | 1) {
  const target = visible.value[visible.value.indexOf(id) + delta]
  if (!target) return
  swap(id, target)
  announcement.value = `${WIDGETS[id].title}: Position ${visible.value.indexOf(id) + 1} von ${visible.value.length}`
}

// Drag over the visible widgets only, so indices match what is rendered; hidden ones stay in the stored order.
const { items, draggedItem, handleDragStart, handleDragOver, handleDrop, handleDragEnd } = useDragging(visible, (next) => {
  order.value = [...next, ...order.value.filter((id) => !next.includes(id))]
})

const paymentTotal = computed(() => data.value?.paymentMethods.reduce((sum, p) => sum + p.count, 0) ?? 0)

const buyerCount = computed(() => data.value?.buyerLocations.reduce((sum, p) => sum + p.count, 0) ?? 0)
const mapHeight = WIDGETS.buyerMap.rows * ROW_PX + (WIDGETS.buyerMap.rows - 1) * GAP_PX - 110
</script>

<template>
  <div v-if="data" class="flex flex-col gap-md" data-testid="admin-dashboard">
    <div class="flex justify-end">
      <button type="button" class="text-caption text-secondary hover:text-primary" @click="order = [...DEFAULT_ORDER]">
        Layout zurücksetzen
      </button>
    </div>

    <TransitionGroup
      tag="div"
      move-class="transition-transform duration-200 ease-out motion-reduce:transition-none"
      role="group"
      aria-label="Dashboard-Widgets"
      class="grid grid-flow-row-dense grid-cols-1 md:grid-cols-4"
      :style="{ gridAutoRows: `${ROW_PX}px`, gap: `${GAP_PX}px` }"
      @dragover.prevent
      @drop="handleDrop"
    >
      <PsCard
        v-for="(id, i) in items"
        :key="id"
        :padded="false"
        draggable="true"
        :aria-label="WIDGETS[id].title"
        class="group flex min-h-0 flex-col overflow-hidden p-0!"
        :class="[WIDGETS[id].class, draggedItem === id && 'opacity-50']"
        :data-widget="id"
        @dragstart="handleDragStart($event, i)"
        @dragover="handleDragOver($event, i)"
        @dragend="handleDragEnd"
      >
        <header class="flex items-center gap-xs border-b border-subtle px-md py-xs">
          <span class="cursor-grab text-secondary" aria-hidden="true">⠿</span>
          <h2 class="flex-1 truncate text-caption text-secondary">{{ WIDGETS[id].title }}</h2>
          <div class="flex opacity-100 md:opacity-0 md:group-focus-within:opacity-100 md:group-hover:opacity-100">
            <button
              type="button"
              class="px-xs text-secondary hover:text-primary disabled:opacity-30"
              :disabled="i === 0"
              :aria-label="`${WIDGETS[id].title} nach vorn`"
              @click="move(id, -1)"
            >
              ▲
            </button>
            <button
              type="button"
              class="px-xs text-secondary hover:text-primary disabled:opacity-30"
              :disabled="i === visible.length - 1"
              :aria-label="`${WIDGETS[id].title} nach hinten`"
              @click="move(id, 1)"
            >
              ▼
            </button>
          </div>
        </header>

        <div class="min-h-0 flex-1 overflow-auto px-md py-sm">
          <p v-if="id === 'revenue'" class="text-heading-small text-brand" data-testid="dashboard-revenue">
            {{ formatCents(data.revenueCents) }}
          </p>
          <p v-else-if="id === 'quoteRequests'" class="text-heading-small">{{ data.openQuoteRequests }}</p>
          <NuxtLink
            v-else-if="id === 'openTickets'"
            to="/admin/tickets"
            class="text-heading-small hover:underline"
            data-testid="dashboard-open-tickets"
          >
            {{ data.openTickets }}
          </NuxtLink>
          <template v-else-if="id === 'returningVisitors' && data.returningVisitors">
            <p class="text-heading-small" data-testid="dashboard-returning-visitors">{{ data.returningVisitors.returning }}</p>
            <p class="text-caption text-secondary">
              von {{ data.returningVisitors.total }} Besuchern
              <template v-if="data.returningVisitors.total">
                ({{ Math.round((data.returningVisitors.returning / data.returningVisitors.total) * 100) }} %)
              </template>
              · letzte {{ data.returningVisitors.days }} Tage
            </p>
          </template>
          <p v-else-if="id === 'productionWaiting'" class="text-heading-small">{{ data.productionWaiting }}</p>
          <ul v-else-if="id === 'ordersByStatus'" class="text-body-regular">
            <li v-for="(count, status) in data.ordersByStatus" :key="status" class="flex justify-between">
              <span class="text-secondary">{{ status }}</span><span>{{ count }}</span>
            </li>
          </ul>
          <template v-else-if="id === 'paymentMethods'">
            <p v-if="!paymentTotal" class="text-caption text-secondary">Noch keine bezahlten Zahlungen.</p>
            <ul v-else class="flex flex-col gap-sm text-body-regular" data-testid="dashboard-payment-methods">
              <li v-for="p in data.paymentMethods" :key="p.method">
                <div class="flex justify-between gap-xs">
                  <span>{{ PAYMENT_LABELS[p.method] ?? p.method }}</span>
                  <span>{{ p.count }} · {{ Math.round((p.count / paymentTotal) * 100) }} %</span>
                </div>
                <div class="h-1 rounded-full bg-black/10 dark:bg-white/10" aria-hidden="true">
                  <div class="h-full rounded-full bg-current text-brand" :style="{ width: `${(p.count / paymentTotal) * 100}%` }" />
                </div>
                <p class="text-caption text-secondary">{{ formatCents(p.amountCents) }}</p>
              </li>
            </ul>
          </template>
          <template v-else-if="id === 'topProducts'">
            <div class="flex items-start justify-between gap-xs">
              <div>
                <p class="text-caption text-secondary">Verkaufte Artikel</p>
                <p class="text-heading-small" data-testid="dashboard-top-products-total">{{ topProducts?.total ?? '–' }}</p>
              </div>
              <select
                v-model.number="topDays"
                aria-label="Zeitraum"
                class="rounded-sm border border-subtle bg-transparent px-xs py-1 text-caption"
              >
                <option v-for="p in TOP_PRODUCT_PERIODS" :key="p.days" :value="p.days">{{ p.label }}</option>
              </select>
            </div>
            <p v-if="topProducts && !topProducts.total" class="mt-sm text-caption text-secondary">
              Keine Verkäufe im Zeitraum.
            </p>
            <ol v-else-if="topProducts" class="mt-sm flex flex-col gap-sm text-body-regular" data-testid="dashboard-top-products">
              <li v-for="p in topProducts.products" :key="p.productId">
                <div class="flex justify-between gap-xs">
                  <span class="truncate">{{ p.name }}</span>
                  <span class="shrink-0">{{ p.quantity }} · {{ Math.round((p.quantity / topProducts.total) * 100) }} %</span>
                </div>
                <div class="h-1 rounded-full bg-black/10 dark:bg-white/10" aria-hidden="true">
                  <div class="h-full rounded-full bg-current text-brand" :style="{ width: `${(p.quantity / topProducts.total) * 100}%` }" />
                </div>
              </li>
            </ol>
          </template>
          <template v-else-if="id === 'buyerMap'">
            <p v-if="!data.buyerCountries.length" class="text-caption text-secondary">Noch keine Bestellungen.</p>
            <template v-else>
              <AdminBuyerMap :places="data.buyerLocations" :countries="data.buyerCountries" :height="mapHeight" />
              <p class="mt-xs text-caption text-secondary">
                {{ buyerCount }} {{ buyerCount === 1 ? 'Bestellung' : 'Bestellungen' }} · PLZ-Daten:
                <a href="https://www.geonames.org/" class="underline" rel="noopener">GeoNames</a> (CC BY 4.0)
              </p>
            </template>
          </template>
          <div v-else-if="id === 'printers'" class="grid gap-md sm:grid-cols-2">
            <PsPrinterStatusCard
              v-for="printer in data.printers"
              :key="printer.id"
              :name="printer.name"
              model=""
              :status="printer.status"
            />
          </div>
        </div>
      </PsCard>
    </TransitionGroup>
    <p class="sr-only" aria-live="polite">{{ announcement }}</p>
  </div>
</template>
