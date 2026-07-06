<script setup lang="ts">
import { computed } from 'vue'

export interface WeekCalendarDay {
  /** ISO date (YYYY-MM-DD) */
  date: string
  /** Display label, e.g. "Mo 06.07." */
  label: string
}

export interface WeekCalendarResource {
  id: string
  name: string
}

export interface WeekCalendarEvent {
  id: string
  resourceId: string
  /** ISO date (YYYY-MM-DD) */
  date: string
  title: string
  subtitle?: string
  timeLabel?: string
  kind: 'job' | 'maintenance'
  status?: string
}

/**
 * Produktionskalender-Wochenansicht: Drucker als Zeilen, Tage als Spalten.
 * Rein präsentational – Zeiten und Labels kommen fertig von außen.
 */
const props = withDefaults(
  defineProps<{
    days: WeekCalendarDay[]
    resources: WeekCalendarResource[]
    events: WeekCalendarEvent[]
    selectedEventId?: string | null
  }>(),
  { selectedEventId: null },
)

const emit = defineEmits<{
  'select-event': [id: string]
  'select-cell': [payload: { resourceId: string; date: string }]
}>()

const isEmpty = computed(() => props.resources.length === 0 || props.days.length === 0)

const gridStyle = computed(() => ({
  gridTemplateColumns: `minmax(8rem, 12rem) repeat(${props.days.length}, minmax(6rem, 1fr))`,
}))

const eventsByCell = computed(() => {
  const map = new Map<string, WeekCalendarEvent[]>()
  for (const event of props.events) {
    const key = `${event.resourceId}|${event.date}`
    const list = map.get(key) ?? []
    list.push(event)
    map.set(key, list)
  }
  return map
})

function cellEvents(resourceId: string, date: string): WeekCalendarEvent[] {
  return eventsByCell.value.get(`${resourceId}|${date}`) ?? []
}
</script>

<template>
  <div data-testid="week-calendar">
    <p v-if="isEmpty" class="text-body-regular text-secondary" data-testid="week-calendar-empty">
      Keine Drucker
    </p>

    <div v-else class="overflow-x-auto">
      <div class="grid min-w-[48rem] gap-px rounded-card border border-subtle bg-surface" :style="gridStyle" role="grid" aria-label="Produktionskalender">
        <!-- Header row (display: contents keeps the CSS grid flat while giving axe the required grid > row > cell structure) -->
        <div class="contents" role="row">
          <div class="bg-surface-elevated px-sm py-sm text-caption uppercase text-secondary" role="columnheader">
            Drucker
          </div>
          <div
            v-for="day in days"
            :key="day.date"
            class="bg-surface-elevated px-sm py-sm text-center text-caption uppercase text-secondary"
            role="columnheader"
          >
            {{ day.label }}
          </div>
        </div>

        <!-- Resource rows -->
        <div v-for="resource in resources" :key="resource.id" class="contents" role="row">
          <div class="flex items-start bg-surface-elevated px-sm py-sm text-label-medium text-primary" role="rowheader">
            {{ resource.name }}
          </div>
          <div
            v-for="day in days"
            :key="`${resource.id}|${day.date}`"
            class="relative min-h-[4.5rem] bg-surface-elevated p-xs"
            role="gridcell"
          >
            <button
              type="button"
              class="absolute inset-0 cursor-pointer focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand hover:bg-brand/5"
              :aria-label="`Drucker ${resource.name}, Tag ${day.label}`"
              data-testid="calendar-cell"
              @click="emit('select-cell', { resourceId: resource.id, date: day.date })"
            />
            <div class="pointer-events-none relative flex flex-col gap-xs">
              <button
                v-for="event in cellEvents(resource.id, day.date)"
                :key="event.id"
                type="button"
                class="pointer-events-auto flex w-full cursor-pointer flex-col items-start rounded-pill-small px-sm py-xs text-left text-caption focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand"
                :class="[
                  event.kind === 'maintenance'
                    ? 'pill-maintenance text-amber-500'
                    : 'bg-brand/15 text-brand hover:bg-brand/25',
                  selectedEventId === event.id ? 'outline-2 outline-offset-1 outline-brand' : '',
                ]"
                :data-kind="event.kind"
                :data-status="event.status"
                :aria-pressed="selectedEventId === event.id"
                data-testid="calendar-event"
                @click.stop="emit('select-event', event.id)"
              >
                <span class="font-medium">
                  <template v-if="event.timeLabel">{{ event.timeLabel }} · </template>{{ event.title }}
                </span>
                <span v-if="event.subtitle" class="text-secondary">{{ event.subtitle }}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.pill-maintenance {
  background-color: color-mix(in srgb, #f59e0b 12%, transparent);
  background-image: repeating-linear-gradient(
    -45deg,
    color-mix(in srgb, #f59e0b 18%, transparent) 0,
    color-mix(in srgb, #f59e0b 18%, transparent) 4px,
    transparent 4px,
    transparent 8px
  );
  opacity: 0.85;
}
</style>
