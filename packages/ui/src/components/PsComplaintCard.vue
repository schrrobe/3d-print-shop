<script setup lang="ts">
import type { ComplaintStatus } from '@print-shop/types'
import PsCard from './PsCard.vue'
import PsComplaintStatusBadge from './PsComplaintStatusBadge.vue'

defineProps<{
  complaintNumber: string
  orderNumber: string
  status: ComplaintStatus
  /** Bereits übersetztes Label des Reklamationsgrunds. */
  reason: string
  description: string
  createdAtLabel?: string
  itemCount?: number
}>()
</script>

<template>
  <PsCard data-testid="complaint-card" :data-status="status">
    <div class="flex flex-col gap-sm">
      <div class="flex items-start justify-between gap-md">
        <span class="text-label-medium text-primary">{{ complaintNumber }}</span>
        <PsComplaintStatusBadge :status="status" />
      </div>
      <div class="flex flex-wrap items-center gap-x-md gap-y-xs text-caption text-secondary">
        <span>Bestellung {{ orderNumber }}</span>
        <span aria-hidden="true">·</span>
        <span>{{ reason }}</span>
        <template v-if="createdAtLabel">
          <span aria-hidden="true">·</span>
          <span>{{ createdAtLabel }}</span>
        </template>
        <template v-if="itemCount !== undefined">
          <span aria-hidden="true">·</span>
          <span>{{ itemCount }} {{ itemCount === 1 ? 'Position' : 'Positionen' }}</span>
        </template>
      </div>
      <p class="line-clamp-2 text-body-regular text-secondary">{{ description }}</p>
      <div v-if="$slots.actions" class="flex items-center gap-sm">
        <slot name="actions" />
      </div>
    </div>
  </PsCard>
</template>
