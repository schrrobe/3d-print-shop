<script setup lang="ts">
/** Admin dashboard: widget grid (after storylo), reorder by drag & drop or arrows, order kept per browser. */
import { PsCard, PsPrinterStatusCard } from '@print-shop/ui'
import { formatCents } from '@print-shop/utils'
import type { PrinterStatus } from '@print-shop/types'

definePageMeta({ layout: 'admin', middleware: 'admin-auth' })

interface Dashboard {
  ordersByStatus: Record<string, number>
  revenueCents: number
  openQuoteRequests: number
  printers: { id: string; name: string; status: PrinterStatus }[]
  productionWaiting: number
  buyerLocations: { lat: number; lon: number; count: number }[]
}

const { data } = await useFetch<Dashboard>('/api/admin/dashboard', {
  credentials: 'include',
  server: false,
})

const ROW_PX = 120
const GAP_PX = 16

/** Fixed size per widget; `rows` must match the row-span class (Unovis needs a pixel height). */
const WIDGETS = {
  revenue: { title: 'Umsatz (bezahlt)', rows: 1, class: 'row-span-1' },
  quoteRequests: { title: 'Offene Upload-Anfragen', rows: 1, class: 'row-span-1' },
  productionWaiting: { title: 'Produktionsqueue (wartet)', rows: 1, class: 'row-span-1' },
  ordersByStatus: { title: 'Bestellungen', rows: 2, class: 'row-span-2' },
  buyerMap: { title: 'Käufer-Heatmap', rows: 3, class: 'row-span-3 md:col-span-2' },
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
function move(id: WidgetId, delta: -1 | 1) {
  const target = order.value[order.value.indexOf(id) + delta]
  if (!target) return
  swap(id, target)
  announcement.value = `${WIDGETS[id].title}: Position ${order.value.indexOf(id) + 1} von ${order.value.length}`
}

const dragged = ref<WidgetId | null>(null)
function onDrop(target: WidgetId) {
  if (dragged.value) swap(dragged.value, target)
  dragged.value = null
}

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

    <div
      role="group"
      aria-label="Dashboard-Widgets"
      class="grid grid-flow-row-dense grid-cols-1 md:grid-cols-4"
      :style="{ gridAutoRows: `${ROW_PX}px`, gap: `${GAP_PX}px` }"
    >
      <PsCard
        v-for="(id, i) in order"
        :key="id"
        :padded="false"
        draggable="true"
        :aria-label="WIDGETS[id].title"
        class="group flex min-h-0 flex-col overflow-hidden p-0!"
        :class="[WIDGETS[id].class, dragged === id && 'opacity-50']"
        :data-widget="id"
        @dragstart="dragged = id"
        @dragend="dragged = null"
        @dragover.prevent
        @drop.prevent="onDrop(id)"
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
              :disabled="i === order.length - 1"
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
          <p v-else-if="id === 'productionWaiting'" class="text-heading-small">{{ data.productionWaiting }}</p>
          <ul v-else-if="id === 'ordersByStatus'" class="text-body-regular">
            <li v-for="(count, status) in data.ordersByStatus" :key="status" class="flex justify-between">
              <span class="text-secondary">{{ status }}</span><span>{{ count }}</span>
            </li>
          </ul>
          <template v-else-if="id === 'buyerMap'">
            <p v-if="!data.buyerLocations.length" class="text-caption text-secondary">Noch keine Bestellungen mit bekannter PLZ.</p>
            <template v-else>
              <AdminBuyerMap :places="data.buyerLocations" :height="mapHeight" />
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
    </div>
    <p class="sr-only" aria-live="polite">{{ announcement }}</p>
  </div>
</template>
