<script setup lang="ts">
import { computed, ref } from 'vue'
import type { SocialPostItem } from '../social.js'
import PsButton from './PsButton.vue'
import PsSocialPostCard from './PsSocialPostCard.vue'

/**
 * Month calendar of scheduled/published posts. Posts without scheduledAt
 * (drafts) are listed below the grid. Times shown in the admin's local zone.
 */
const props = defineProps<{
  posts: SocialPostItem[]
  /** Initial month, e.g. "2026-07". Defaults to the current month. */
  initialMonth?: string
}>()

const emit = defineEmits<{ open: [post: SocialPostItem] }>()

function parseMonth(value?: string): { year: number; month: number } {
  const match = value ? /^(\d{4})-(\d{2})$/.exec(value) : null
  if (match) return { year: Number(match[1]), month: Number(match[2]) - 1 }
  const now = new Date()
  return { year: now.getFullYear(), month: now.getMonth() }
}

const current = ref(parseMonth(props.initialMonth))

const monthLabel = computed(() =>
  new Intl.DateTimeFormat('de-DE', { month: 'long', year: 'numeric' }).format(
    new Date(current.value.year, current.value.month, 1),
  ),
)

function shiftMonth(delta: number) {
  const date = new Date(current.value.year, current.value.month + delta, 1)
  current.value = { year: date.getFullYear(), month: date.getMonth() }
}

const WEEKDAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']

interface CalendarDay {
  key: string
  dayOfMonth: number | null
  posts: SocialPostItem[]
  isToday: boolean
}

const weeks = computed<CalendarDay[][]>(() => {
  const { year, month } = current.value
  const first = new Date(year, month, 1)
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const leading = (first.getDay() + 6) % 7 // Monday-first offset
  const today = new Date()

  const byDay = new Map<number, SocialPostItem[]>()
  for (const post of props.posts) {
    if (!post.scheduledAt) continue
    const date = new Date(post.scheduledAt)
    if (date.getFullYear() !== year || date.getMonth() !== month) continue
    const list = byDay.get(date.getDate()) ?? []
    list.push(post)
    byDay.set(date.getDate(), list)
  }

  const cells: CalendarDay[] = []
  for (let i = 0; i < leading; i++) {
    cells.push({ key: `lead-${i}`, dayOfMonth: null, posts: [], isToday: false })
  }
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push({
      key: `day-${day}`,
      dayOfMonth: day,
      posts: byDay.get(day) ?? [],
      isToday:
        today.getFullYear() === year && today.getMonth() === month && today.getDate() === day,
    })
  }
  while (cells.length % 7 !== 0) {
    cells.push({ key: `trail-${cells.length}`, dayOfMonth: null, posts: [], isToday: false })
  }

  const result: CalendarDay[][] = []
  for (let i = 0; i < cells.length; i += 7) result.push(cells.slice(i, i + 7))
  return result
})

const unscheduled = computed(() => props.posts.filter((p) => !p.scheduledAt))
</script>

<template>
  <div class="flex flex-col gap-md" data-testid="social-post-calendar">
    <div class="flex items-center justify-between">
      <PsButton variant="ghost" size="sm" data-testid="calendar-prev" aria-label="Voriger Monat" @click="shiftMonth(-1)">
        ← Zurück
      </PsButton>
      <h2 class="text-subheading text-primary" data-testid="calendar-month">{{ monthLabel }}</h2>
      <PsButton variant="ghost" size="sm" data-testid="calendar-next" aria-label="Nächster Monat" @click="shiftMonth(1)">
        Weiter →
      </PsButton>
    </div>

    <div class="overflow-x-auto">
      <table class="w-full min-w-[48rem] border-collapse">
        <thead>
          <tr>
            <th v-for="day in WEEKDAYS" :key="day" scope="col" class="px-sm py-sm text-caption uppercase text-secondary">
              {{ day }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(week, index) in weeks" :key="index">
            <td
              v-for="cell in week"
              :key="cell.key"
              class="w-[14.28%] border border-subtle p-xs align-top"
              :class="cell.dayOfMonth === null ? 'bg-surface' : ''"
            >
              <template v-if="cell.dayOfMonth !== null">
                <p
                  class="mb-xs text-caption"
                  :class="cell.isToday ? 'font-medium text-brand' : 'text-secondary'"
                >
                  {{ cell.dayOfMonth }}
                </p>
                <div class="flex flex-col gap-xs">
                  <PsSocialPostCard
                    v-for="post in cell.posts"
                    :key="post.id"
                    :post="post"
                    @open="emit('open', $event)"
                  />
                </div>
              </template>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="unscheduled.length > 0" class="flex flex-col gap-xs">
      <p class="text-caption uppercase text-secondary">Ohne Termin (Entwürfe)</p>
      <div class="grid gap-sm sm:grid-cols-2 lg:grid-cols-3">
        <PsSocialPostCard
          v-for="post in unscheduled"
          :key="post.id"
          :post="post"
          @open="emit('open', $event)"
        />
      </div>
    </div>
  </div>
</template>
