<script setup lang="ts">
import type { ComplaintStatus } from '@print-shop/types'
import { computed } from 'vue'
import PsBadge from './PsBadge.vue'

const props = defineProps<{
  status: ComplaintStatus
  label?: string
}>()

const STATUS_META: Record<
  ComplaintStatus,
  { variant: 'warning' | 'info' | 'brand' | 'danger'; label: string }
> = {
  submitted: { variant: 'warning', label: 'Eingegangen' },
  in_review: { variant: 'info', label: 'In Prüfung' },
  info_needed: { variant: 'warning', label: 'Info benötigt' },
  approved: { variant: 'brand', label: 'Genehmigt' },
  rejected: { variant: 'danger', label: 'Abgelehnt' },
  replacement_planned: { variant: 'info', label: 'Ersatzdruck geplant' },
  refund_planned: { variant: 'info', label: 'Erstattung geplant' },
  closed: { variant: 'brand', label: 'Geschlossen' },
}

const meta = computed(() => STATUS_META[props.status])
</script>

<template>
  <PsBadge :variant="meta.variant" data-testid="complaint-status" :data-status="status">
    {{ label ?? meta.label }}
  </PsBadge>
</template>
