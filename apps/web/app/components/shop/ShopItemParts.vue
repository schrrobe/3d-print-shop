<script setup lang="ts">
import type { Part, PartStatus } from '@print-shop/types'

/** Fertigungsstand der Bauteile einer Position (Bestellseite + Portal). */
defineProps<{ parts: Record<Part, PartStatus> }>()
const { t } = useI18n()
const ICON: Record<PartStatus, string> = { open: '○', in_progress: '◐', done: '●' }
</script>

<template>
  <div class="mt-xs text-caption text-secondary" data-testid="order-item-parts">
    <span class="sr-only">{{ t('order.parts.title') }}: </span>
    <ul class="flex flex-wrap gap-x-md gap-y-xs">
      <li v-for="(status, part) in parts" :key="part" :data-status="status">
        <span aria-hidden="true">{{ ICON[status] }}</span>
        {{ t(`order.parts.${part}`) }}: {{ t(`order.parts.${status}`) }}
      </li>
    </ul>
  </div>
</template>
