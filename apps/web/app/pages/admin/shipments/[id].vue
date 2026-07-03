<script setup lang="ts">
import {
  PsButton,
  PsCard,
  PsDialog,
  PsInput,
  PsSelect,
  PsShipmentStatusBadge,
  PsTimeline,
  useToast,
} from '@print-shop/ui'
import { SHIPMENT_STATUS_TRANSITIONS } from '@print-shop/utils'
import type { ShipmentStatus } from '@print-shop/types'

definePageMeta({ layout: 'admin', middleware: 'admin-auth' })

const route = useRoute()
const toast = useToast()
const config = useRuntimeConfig()
const id = String(route.params.id)

interface StatusEvent {
  id: string
  fromStatus: ShipmentStatus | null
  toStatus: ShipmentStatus
  note: string | null
  createdAt: string
  byUser: { name: string } | null
}
interface ShipmentDetail {
  id: string
  shipmentNumber: string
  status: ShipmentStatus
  carrier: string | null
  trackingNumber: string | null
  packedAt: string | null
  shippedAt: string | null
  deliveredAt: string | null
  weightGrams: number | null
  notes: string | null
  order: { id: string; orderNumber: string; status: string; email: string; firstName: string; lastName: string }
  items: { quantity: number; orderItem: { id: string; name: string; quantity: number } }[]
  statusEvents: StatusEvent[]
}
interface QcClearance {
  jobId: string
  cleared: boolean
  latestStatus: string | null
}

const { data, refresh } = await useFetch<{ shipment: ShipmentDetail; qcClearance: QcClearance[] }>(
  `/api/admin/shipments/${id}`,
  { credentials: 'include', server: false },
)
const shipment = computed(() => data.value?.shipment)
const qcClearance = computed(() => data.value?.qcClearance ?? [])
const qcAllCleared = computed(() => qcClearance.value.every((c) => c.cleared))

const statusLabels: Record<ShipmentStatus, string> = {
  waiting_for_qc: 'Wartet auf QC',
  ready_for_shipping: 'Versandbereit',
  packed: 'Verpackt',
  shipped: 'Versendet',
  delivered: 'Zugestellt',
  problem: 'Problem',
}

// Allowed generic transitions (shipping itself goes through the ship dialog)
const nextStatuses = computed(() =>
  shipment.value
    ? SHIPMENT_STATUS_TRANSITIONS[shipment.value.status].filter((s) => s !== 'shipped')
    : [],
)
const canShip = computed(
  () => shipment.value && SHIPMENT_STATUS_TRANSITIONS[shipment.value.status].includes('shipped'),
)

// Events come back ascending; show newest first in the timeline
const timelineEntries = computed(() =>
  [...(shipment.value?.statusEvents ?? [])].reverse().map((e) => ({
    id: e.id,
    title: statusLabels[e.toStatus] ?? e.toStatus,
    timestampLabel: new Date(e.createdAt).toLocaleString('de'),
    note: e.note,
    actor: e.byUser?.name ?? null,
  })),
)

async function setStatus(status: ShipmentStatus) {
  try {
    await $fetch(`/api/admin/shipments/${id}/status`, {
      method: 'POST',
      body: { status },
      credentials: 'include',
    })
    toast.show(`Status → ${statusLabels[status]}`, { variant: 'success' })
    await refresh()
  } catch (err) {
    toast.show((err as { data?: { message?: string } })?.data?.message ?? 'Fehler', { variant: 'error' })
  }
}

// Ship dialog
const shipOpen = ref(false)
const carrier = ref<'dhl' | 'hermes'>('dhl')
const trackingNumber = ref('')
async function submitShip() {
  try {
    await $fetch(`/api/admin/shipments/${id}/ship`, {
      method: 'POST',
      body: { carrier: carrier.value, trackingNumber: trackingNumber.value },
      credentials: 'include',
    })
    toast.show('Sendung versendet', { variant: 'success' })
    shipOpen.value = false
    await refresh()
  } catch (err) {
    toast.show((err as { data?: { message?: string } })?.data?.message ?? 'Fehler', { variant: 'error' })
  }
}

const pdfBase = `${config.public.apiBase}/admin/shipments/${id}`
</script>

<template>
  <div v-if="shipment" class="flex flex-col gap-lg" data-testid="admin-shipment-detail">
    <div class="flex flex-wrap items-center gap-md">
      <h2 class="text-heading-small">{{ shipment.shipmentNumber }}</h2>
      <PsShipmentStatusBadge :status="shipment.status" data-testid="shipment-status" />
      <NuxtLink :to="`/admin/orders/${shipment.order.id}`" class="text-caption text-brand hover:underline">
        {{ shipment.order.orderNumber }}
      </NuxtLink>
    </div>

    <div class="grid gap-lg lg:grid-cols-[2fr_1fr]">
      <div class="flex flex-col gap-lg">
        <PsCard>
          <h3 class="text-label-medium">Positionen</h3>
          <ul class="mt-sm flex flex-col gap-xs text-body-regular">
            <li v-for="(item, i) in shipment.items" :key="i">{{ item.quantity }}× {{ item.orderItem.name }}</li>
          </ul>
        </PsCard>

        <PsCard data-testid="shipment-qc-state">
          <h3 class="text-label-medium">Qualitätskontrolle</h3>
          <p
            v-if="qcClearance.length === 0"
            class="mt-sm text-body-regular text-secondary"
          >
            Keine Druckjobs — QC-Gate nicht erforderlich.
          </p>
          <ul v-else class="mt-sm flex flex-col gap-xs text-body-regular">
            <li v-for="c in qcClearance" :key="c.jobId" :class="c.cleared ? 'text-brand' : 'text-amber-500'">
              {{ c.cleared ? '✓ freigegeben' : `⚠️ offen (${c.latestStatus ?? 'keine Prüfung'})` }}
            </li>
          </ul>
          <p v-if="!qcAllCleared && shipment.status === 'waiting_for_qc'" class="mt-sm text-caption text-amber-500">
            Versandbereit erst nach bestandener QC (oder Admin-Override).
          </p>
        </PsCard>

        <PsCard>
          <h3 class="text-label-medium">Verlauf</h3>
          <div class="mt-sm">
            <PsTimeline :entries="timelineEntries" />
          </div>
        </PsCard>
      </div>

      <div class="flex flex-col gap-lg">
        <PsCard>
          <h3 class="text-label-medium">Aktionen</h3>
          <div class="mt-md flex flex-wrap gap-sm">
            <PsButton
              v-for="status in nextStatuses"
              :key="status"
              variant="secondary"
              size="sm"
              :data-testid="`shipment-status-${status}`"
              @click="setStatus(status)"
            >
              → {{ statusLabels[status] }}
            </PsButton>
          </div>
          <PsButton
            v-if="canShip"
            class="mt-md"
            size="sm"
            data-testid="shipment-ship-open"
            @click="shipOpen = true"
          >
            Versenden
          </PsButton>
        </PsCard>

        <PsCard>
          <h3 class="text-label-medium">Dokumente</h3>
          <div class="mt-md flex flex-col gap-sm">
            <a :href="`${pdfBase}/packing-list.pdf`" target="_blank" rel="noopener" data-testid="shipment-pdf-packing">
              <PsButton variant="ghost" size="sm">Packliste (PDF)</PsButton>
            </a>
            <a :href="`${pdfBase}/delivery-note.pdf`" target="_blank" rel="noopener" data-testid="shipment-pdf-delivery">
              <PsButton variant="ghost" size="sm">Lieferschein (PDF)</PsButton>
            </a>
          </div>
        </PsCard>

        <PsCard v-if="shipment.trackingNumber">
          <h3 class="text-label-medium">Versand</h3>
          <p class="mt-sm text-body-regular">
            {{ shipment.carrier?.toUpperCase() }} · <span class="font-mono">{{ shipment.trackingNumber }}</span>
          </p>
        </PsCard>
      </div>
    </div>

    <PsDialog v-model:open="shipOpen" title="Sendung versenden">
      <div class="flex flex-col gap-md">
        <PsSelect
          v-model="carrier"
          label="Versanddienstleister"
          :options="[
            { value: 'dhl', label: 'DHL' },
            { value: 'hermes', label: 'Hermes' },
          ]"
          data-testid="shipment-carrier"
        />
        <PsInput v-model="trackingNumber" label="Sendungsnummer" name="tracking" data-testid="shipment-tracking" />
        <PsButton :disabled="trackingNumber.trim().length < 4" data-testid="shipment-ship-submit" @click="submitShip">
          Versenden
        </PsButton>
      </div>
    </PsDialog>
  </div>
</template>
