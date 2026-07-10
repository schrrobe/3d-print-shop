<script setup lang="ts">
import { PsAdminTable, PsButton, PsDialog, PsSelect, PsShipmentStatusBadge } from '@print-shop/ui'
import { SHIPMENT_STATUSES } from '@print-shop/types'
import type { ShipmentStatus } from '@print-shop/types'

definePageMeta({ layout: 'admin', middleware: 'admin-auth' })

interface AdminShipment {
  id: string
  shipmentNumber: string
  status: ShipmentStatus
  carrier: string | null
  trackingNumber: string | null
  createdAt: string
  order: { orderNumber: string; email: string }
  items: { id: string }[]
}
interface OrderOption {
  id: string
  orderNumber: string
  items: { id: string; name: string; quantity: number }[]
}

const statusFilter = ref('')
const { data, refresh } = await useFetch<{ shipments: AdminShipment[] }>('/api/admin/shipments', {
  credentials: 'include',
  server: false,
  query: computed(() => (statusFilter.value ? { status: statusFilter.value } : {})),
})
watch(statusFilter, () => refresh())

const columns = [
  { key: 'shipmentNumber', label: 'Nummer' },
  { key: 'order', label: 'Bestellung' },
  { key: 'status', label: 'Status' },
  { key: 'carrier', label: 'Versand' },
  { key: 'actions', label: '' },
]

// ---- Create dialog ----
const createOpen = ref(false)
const selectedOrderId = ref('')
const { data: orderData } = await useFetch<{ orders: OrderOption[] }>('/api/admin/orders', {
  credentials: 'include',
  server: false,
  query: { status: 'ready_to_ship' },
})
const selectedOrder = computed(() =>
  orderData.value?.orders.find((o) => o.id === selectedOrderId.value),
)
const itemQuantities = reactive<Record<string, number>>({})
watch(selectedOrder, (order) => {
  for (const key of Object.keys(itemQuantities)) delete itemQuantities[key]
  for (const item of order?.items ?? []) itemQuantities[item.id] = item.quantity
})

const { run, pending: creating } = useAdminAction({ refresh })

async function createShipment() {
  const order = selectedOrder.value
  if (!order) return
  const ok = await run(
    () =>
      $fetch('/api/admin/shipments', {
        method: 'POST',
        body: {
          orderId: order.id,
          items: order.items.map((i) => ({
            orderItemId: i.id,
            quantity: itemQuantities[i.id] ?? i.quantity,
          })),
        },
        credentials: 'include',
      }),
    { success: 'Sendung angelegt', error: 'Fehler' },
  )
  if (ok) createOpen.value = false
}
</script>

<template>
  <div data-testid="admin-shipments">
    <div class="mb-lg flex items-center justify-between gap-md">
      <select
        v-model="statusFilter"
        class="rounded-card border border-subtle bg-surface-elevated px-md py-sm text-body-regular"
        data-testid="shipment-status-filter"
      >
        <option value="">Alle Status</option>
        <option v-for="s in SHIPMENT_STATUSES" :key="s" :value="s">{{ s }}</option>
      </select>
      <PsButton size="sm" data-testid="shipment-create" @click="createOpen = true"
        >Sendung anlegen</PsButton
      >
    </div>

    <PsAdminTable :columns="columns" :rows="data?.shipments ?? []" empty="Keine Sendungen">
      <template #cell-order="{ row }">
        {{ (row as unknown as AdminShipment).order.orderNumber }}
      </template>
      <template #cell-status="{ row }">
        <PsShipmentStatusBadge :status="(row as unknown as AdminShipment).status" />
      </template>
      <template #cell-carrier="{ row }">
        <span v-if="(row as unknown as AdminShipment).carrier" class="text-caption">
          {{ (row as unknown as AdminShipment).carrier?.toUpperCase() }} ·
          {{ (row as unknown as AdminShipment).trackingNumber }}
        </span>
        <span v-else class="text-caption text-secondary">—</span>
      </template>
      <template #cell-actions="{ row }">
        <NuxtLink
          :to="`/admin/shipments/${(row as unknown as AdminShipment).id}`"
          class="text-caption text-brand hover:underline"
          data-testid="shipment-row"
        >
          Details
        </NuxtLink>
      </template>
    </PsAdminTable>

    <PsDialog v-model:open="createOpen" title="Sendung anlegen">
      <div class="flex flex-col gap-md">
        <PsSelect
          v-model="selectedOrderId"
          label="Bestellung"
          :options="(orderData?.orders ?? []).map((o) => ({ value: o.id, label: o.orderNumber }))"
          data-testid="shipment-create-order"
        />
        <div v-if="selectedOrder" class="flex flex-col gap-sm">
          <label
            v-for="item in selectedOrder.items"
            :key="item.id"
            class="flex items-center justify-between gap-md rounded-card border border-subtle p-sm text-body-regular"
          >
            <span>{{ item.name }}</span>
            <input
              v-model.number="itemQuantities[item.id]"
              type="number"
              min="1"
              :max="item.quantity"
              class="w-16 rounded-card border border-subtle bg-surface px-sm py-xs"
            />
          </label>
        </div>
        <PsButton
          :disabled="creating || !selectedOrder"
          data-testid="shipment-create-save"
          @click="createShipment"
        >
          Anlegen
        </PsButton>
      </div>
    </PsDialog>
  </div>
</template>
