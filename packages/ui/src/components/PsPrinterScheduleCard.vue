<script setup lang="ts">
import PsBadge from './PsBadge.vue'
import PsCard from './PsCard.vue'

export interface PrinterScheduleEntry {
  id: string
  title: string
  timeLabel: string
  kind: 'job' | 'maintenance'
  subtitle?: string
  conflict?: boolean
}

/**
 * Tagesplan eines Druckers als Liste. Rein präsentational –
 * Einträge und Zeit-Labels kommen fertig von außen.
 */
defineProps<{
  printerName: string
  entries: PrinterScheduleEntry[]
}>()

const emit = defineEmits<{ select: [id: string] }>()
</script>

<template>
  <PsCard data-testid="printer-schedule">
    <div class="flex flex-col gap-sm">
      <h3 class="text-label-medium text-primary">{{ printerName }}</h3>

      <p v-if="entries.length === 0" class="text-body-regular text-secondary" data-testid="schedule-empty">
        Keine geplanten Jobs
      </p>

      <ul v-else class="flex flex-col gap-xs" role="list">
        <li v-for="entry in entries" :key="entry.id">
          <button
            type="button"
            class="flex w-full cursor-pointer items-start justify-between gap-md rounded-card border p-sm text-left transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
            :class="
              entry.conflict
                ? 'border-red-500 hover:bg-red-500/10'
                : 'border-subtle hover:border-brand'
            "
            :data-kind="entry.kind"
            data-testid="schedule-entry"
            @click="emit('select', entry.id)"
          >
            <span class="flex flex-col">
              <span class="text-caption text-secondary">{{ entry.timeLabel }}</span>
              <span class="text-body-regular text-primary">{{ entry.title }}</span>
              <span v-if="entry.subtitle" class="text-caption text-secondary">{{ entry.subtitle }}</span>
            </span>
            <span class="flex shrink-0 items-center gap-xs">
              <PsBadge v-if="entry.kind === 'maintenance'" variant="warning">Wartung</PsBadge>
              <PsBadge v-if="entry.conflict" variant="danger">Konflikt</PsBadge>
            </span>
          </button>
        </li>
      </ul>
    </div>
  </PsCard>
</template>
