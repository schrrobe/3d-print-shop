<script setup lang="ts">
import type { ShipmentStatus } from '@print-shop/types'
import PsCard from './PsCard.vue'
import PsShipmentStatusBadge from './PsShipmentStatusBadge.vue'

withDefaults(
  defineProps<{
    shipmentNumber: string
    orderNumber: string
    status: ShipmentStatus
    carrierLabel?: string | null
    trackingNumber?: string | null
    /** z. B. '3 Positionen · 5 Stück' */
    itemSummary?: string
    dateLabel?: string
  }>(),
  { carrierLabel: null, trackingNumber: null },
)
</script>

<template>
  <PsCard data-testid="shipment-card" :data-status="status">
    <div class="flex flex-col gap-sm">
      <div class="flex items-start justify-between gap-md">
        <div class="flex flex-col">
          <span class="text-label-medium text-primary">{{ shipmentNumber }}</span>
          <span class="text-caption text-secondary">Bestellung {{ orderNumber }}</span>
        </div>
        <PsShipmentStatusBadge :status="status" />
      </div>
      <div
        v-if="carrierLabel || trackingNumber || itemSummary || dateLabel"
        class="flex flex-wrap items-center gap-x-md gap-y-xs text-caption text-secondary"
      >
        <span v-if="carrierLabel">{{ carrierLabel }}</span>
        <span v-if="trackingNumber" class="text-brand">{{ trackingNumber }}</span>
        <span v-if="itemSummary">{{ itemSummary }}</span>
        <span v-if="dateLabel">{{ dateLabel }}</span>
      </div>
      <div v-if="$slots.actions" class="flex items-center gap-sm">
        <slot name="actions" />
      </div>
    </div>
  </PsCard>
</template>
