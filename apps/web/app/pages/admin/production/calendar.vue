<script setup lang="ts">
import { PsButton, PsCard, PsDialog, PsInput, PsSelect, PsWeekCalendar, useToast } from '@print-shop/ui'
import type { WeekCalendarEvent } from '@print-shop/ui'

definePageMeta({ layout: 'admin', middleware: 'admin-auth' })

const toast = useToast()

interface CalendarJob {
  id: string
  status: string
  plannedStartAt: string | null
  plannedEndAt: string | null
  printerId: string | null
  printer: { id: string; name: string } | null
  order: { orderNumber: string; status: string }
  orderItem: { name: string; quantity: number } | null
}
interface MaintenanceWindow {
  id: string
  printerId: string
  printer: { id: string; name: string }
  title: string
  startsAt: string
  endsAt: string
  notes: string | null
}
interface CalendarResponse {
  jobs: CalendarJob[]
  unscheduledJobs: CalendarJob[]
  maintenanceWindows: MaintenanceWindow[]
  printers: { id: string; name: string; status: string }[]
}

// Week starts on the Monday of the current week
function startOfWeek(ref: Date): Date {
  const d = new Date(ref)
  const day = (d.getDay() + 6) % 7 // 0 = Monday
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - day)
  return d
}
const weekStart = ref(startOfWeek(new Date()))

const range = computed(() => {
  const from = new Date(weekStart.value)
  const to = new Date(weekStart.value)
  to.setDate(to.getDate() + 7)
  return { from: from.toISOString(), to: to.toISOString() }
})

const { data, refresh } = await useFetch<CalendarResponse>('/api/admin/production/calendar', {
  credentials: 'include',
  server: false,
  query: computed(() => range.value),
})
watch(weekStart, () => refresh())

function localDate(iso: string): string {
  const d = new Date(iso)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
function timeLabel(iso: string): string {
  return new Date(iso).toLocaleTimeString('de', { hour: '2-digit', minute: '2-digit' })
}

const days = computed(() =>
  Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart.value)
    d.setDate(d.getDate() + i)
    return {
      date: localDate(d.toISOString()),
      label: d.toLocaleDateString('de', { weekday: 'short', day: '2-digit', month: '2-digit' }),
    }
  }),
)
const resources = computed(() => (data.value?.printers ?? []).map((p) => ({ id: p.id, name: p.name })))
const events = computed<WeekCalendarEvent[]>(() => {
  const jobEvents: WeekCalendarEvent[] = (data.value?.jobs ?? [])
    .filter((j) => j.plannedStartAt && j.printerId)
    .map((j) => ({
      id: `job-${j.id}`,
      resourceId: j.printerId!,
      date: localDate(j.plannedStartAt!),
      title: j.order.orderNumber,
      subtitle: j.orderItem?.name,
      timeLabel: `${timeLabel(j.plannedStartAt!)}–${timeLabel(j.plannedEndAt!)}`,
      kind: 'job',
      status: j.status,
    }))
  const maintEvents: WeekCalendarEvent[] = (data.value?.maintenanceWindows ?? []).map((m) => ({
    id: `maint-${m.id}`,
    resourceId: m.printerId,
    date: localDate(m.startsAt),
    title: m.title,
    timeLabel: `${timeLabel(m.startsAt)}–${timeLabel(m.endsAt)}`,
    kind: 'maintenance',
  }))
  return [...jobEvents, ...maintEvents]
})

function shiftWeek(delta: number) {
  const d = new Date(weekStart.value)
  d.setDate(d.getDate() + delta * 7)
  weekStart.value = d
}

// ---- Schedule dialog ----
const scheduleOpen = ref(false)
const scheduleJobId = ref('')
const schedulePrinterId = ref('')
const scheduleStart = ref('')
const scheduleEnd = ref('')
interface ConflictDetails {
  jobs: { jobId: string; orderNumber: string; startsAt: string; endsAt: string }[]
  maintenance: { maintenanceId: string; title: string; startsAt: string; endsAt: string }[]
}
const conflicts = ref<ConflictDetails | null>(null)

function isoToLocalInput(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function openScheduleForJob(job: CalendarJob) {
  scheduleJobId.value = job.id
  schedulePrinterId.value = job.printerId ?? resources.value[0]?.id ?? ''
  scheduleStart.value = isoToLocalInput(job.plannedStartAt)
  scheduleEnd.value = isoToLocalInput(job.plannedEndAt)
  conflicts.value = null
  scheduleOpen.value = true
}
function onSelectEvent(eventId: string) {
  if (eventId.startsWith('job-')) {
    const job = data.value?.jobs.find((j) => `job-${j.id}` === eventId)
    if (job) openScheduleForJob(job)
  }
}

async function submitSchedule(force = false) {
  if (!scheduleStart.value || !scheduleEnd.value) return
  try {
    await $fetch(`/api/admin/production/${scheduleJobId.value}/schedule`, {
      method: 'POST',
      body: {
        printerId: schedulePrinterId.value || undefined,
        plannedStartAt: new Date(scheduleStart.value).toISOString(),
        plannedEndAt: new Date(scheduleEnd.value).toISOString(),
        force,
      },
      credentials: 'include',
    })
    toast.show('Job geplant', { variant: 'success' })
    scheduleOpen.value = false
    conflicts.value = null
    await refresh()
  } catch (err) {
    const e = err as { data?: { error?: string; details?: ConflictDetails; message?: string } }
    if (e.data?.error === 'conflict' && e.data.details) {
      conflicts.value = e.data.details
    } else {
      toast.show(e.data?.message ?? 'Fehler', { variant: 'error' })
    }
  }
}
async function removeFromCalendar() {
  try {
    await $fetch(`/api/admin/production/${scheduleJobId.value}/schedule`, { method: 'DELETE', credentials: 'include' })
    toast.show('Aus Kalender entfernt', { variant: 'success' })
    scheduleOpen.value = false
    await refresh()
  } catch {
    toast.show('Fehler', { variant: 'error' })
  }
}

// ---- Maintenance dialog ----
const maintOpen = ref(false)
const maintForm = reactive({ printerId: '', title: '', startsAt: '', endsAt: '' })
async function createMaintenance() {
  try {
    await $fetch(`/api/admin/production/printers/${maintForm.printerId}/maintenance`, {
      method: 'POST',
      body: {
        title: maintForm.title,
        startsAt: new Date(maintForm.startsAt).toISOString(),
        endsAt: new Date(maintForm.endsAt).toISOString(),
      },
      credentials: 'include',
    })
    toast.show('Wartungsfenster angelegt', { variant: 'success' })
    maintOpen.value = false
    await refresh()
  } catch (err) {
    toast.show((err as { data?: { message?: string } })?.data?.message ?? 'Fehler', { variant: 'error' })
  }
}
async function deleteMaintenance(id: string) {
  try {
    await $fetch(`/api/admin/production/maintenance/${id}`, { method: 'DELETE', credentials: 'include' })
    toast.show('Wartungsfenster gelöscht', { variant: 'success' })
    await refresh()
  } catch {
    toast.show('Fehler', { variant: 'error' })
  }
}
</script>

<template>
  <div class="flex flex-col gap-lg" data-testid="admin-calendar">
    <div class="flex flex-wrap items-center justify-between gap-md">
      <div class="flex items-center gap-sm">
        <PsButton variant="secondary" size="sm" data-testid="calendar-prev" @click="shiftWeek(-1)">←</PsButton>
        <span class="text-label-medium">{{ days[0]?.label }} – {{ days[6]?.label }}</span>
        <PsButton variant="secondary" size="sm" data-testid="calendar-next" @click="shiftWeek(1)">→</PsButton>
      </div>
      <PsButton size="sm" data-testid="maintenance-create" @click="maintOpen = true">Wartungsfenster</PsButton>
    </div>

    <PsWeekCalendar
      :days="days"
      :resources="resources"
      :events="events"
      @select-event="onSelectEvent"
    />

    <!-- Unscheduled jobs -->
    <PsCard>
      <h3 class="text-label-medium">Ungeplante Jobs</h3>
      <p v-if="!data?.unscheduledJobs.length" class="mt-sm text-body-regular text-secondary">Alle Jobs sind eingeplant.</p>
      <div class="mt-sm flex flex-col gap-sm">
        <div
          v-for="job in data?.unscheduledJobs ?? []"
          :key="job.id"
          class="flex items-center justify-between rounded-card border border-subtle p-md text-body-regular"
          data-testid="unscheduled-job"
        >
          <span>{{ job.order.orderNumber }} · {{ job.orderItem?.name }}</span>
          <PsButton variant="secondary" size="sm" data-testid="unscheduled-plan" @click="openScheduleForJob(job)">
            Planen
          </PsButton>
        </div>
      </div>
    </PsCard>

    <!-- Maintenance list -->
    <PsCard v-if="data?.maintenanceWindows.length">
      <h3 class="text-label-medium">Wartungsfenster</h3>
      <ul class="mt-sm flex flex-col gap-sm">
        <li
          v-for="m in data.maintenanceWindows"
          :key="m.id"
          class="flex items-center justify-between text-body-regular"
        >
          <span>{{ m.printer.name }} · {{ m.title }} · {{ new Date(m.startsAt).toLocaleString('de') }}</span>
          <PsButton variant="ghost" size="sm" data-testid="maintenance-delete" @click="deleteMaintenance(m.id)">Löschen</PsButton>
        </li>
      </ul>
    </PsCard>

    <!-- Schedule dialog -->
    <PsDialog v-model:open="scheduleOpen" title="Job planen">
      <div class="flex flex-col gap-md">
        <PsSelect
          v-model="schedulePrinterId"
          label="Drucker"
          :options="resources.map((r) => ({ value: r.id, label: r.name }))"
          data-testid="schedule-printer"
        />
        <label class="flex flex-col gap-xs text-caption">Start
          <input v-model="scheduleStart" type="datetime-local" class="rounded-card border border-subtle bg-surface px-sm py-xs" data-testid="schedule-start" />
        </label>
        <label class="flex flex-col gap-xs text-caption">Ende
          <input v-model="scheduleEnd" type="datetime-local" class="rounded-card border border-subtle bg-surface px-sm py-xs" data-testid="schedule-end" />
        </label>

        <div v-if="conflicts" class="rounded-card border border-red-500/40 bg-red-500/5 p-md text-caption" data-testid="schedule-conflicts">
          <p class="font-medium text-red-500">Konflikte auf diesem Drucker:</p>
          <ul class="mt-xs">
            <li v-for="c in conflicts.jobs" :key="c.jobId">Job {{ c.orderNumber }} ({{ new Date(c.startsAt).toLocaleString('de') }})</li>
            <li v-for="c in conflicts.maintenance" :key="c.maintenanceId">Wartung: {{ c.title }}</li>
          </ul>
        </div>

        <div class="flex flex-wrap gap-sm">
          <PsButton data-testid="schedule-save" @click="submitSchedule(false)">Speichern</PsButton>
          <PsButton v-if="conflicts" variant="secondary" data-testid="schedule-force" @click="submitSchedule(true)">
            Trotzdem buchen
          </PsButton>
          <PsButton variant="ghost" data-testid="schedule-remove" @click="removeFromCalendar">Aus Kalender entfernen</PsButton>
        </div>
      </div>
    </PsDialog>

    <!-- Maintenance dialog -->
    <PsDialog v-model:open="maintOpen" title="Wartungsfenster anlegen">
      <div class="flex flex-col gap-md">
        <PsSelect
          v-model="maintForm.printerId"
          label="Drucker"
          :options="resources.map((r) => ({ value: r.id, label: r.name }))"
          data-testid="maintenance-printer"
        />
        <PsInput v-model="maintForm.title" label="Titel" name="maintTitle" data-testid="maintenance-title" />
        <label class="flex flex-col gap-xs text-caption">Start
          <input v-model="maintForm.startsAt" type="datetime-local" class="rounded-card border border-subtle bg-surface px-sm py-xs" data-testid="maintenance-start" />
        </label>
        <label class="flex flex-col gap-xs text-caption">Ende
          <input v-model="maintForm.endsAt" type="datetime-local" class="rounded-card border border-subtle bg-surface px-sm py-xs" data-testid="maintenance-end" />
        </label>
        <PsButton data-testid="maintenance-save" @click="createMaintenance">Anlegen</PsButton>
      </div>
    </PsDialog>
  </div>
</template>
