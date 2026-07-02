<script setup lang="ts">
import { PsButton, PsCard, PsDialog, PsInput, PsProductionQueueItem, PsSelect, useToast } from '@print-shop/ui'
import { PRODUCTION_STATUS_TRANSITIONS } from '@print-shop/utils'
import type { ProductionStatus } from '@print-shop/types'

definePageMeta({ layout: 'admin', middleware: 'admin-auth' })

interface QueueJob {
  id: string
  status: ProductionStatus
  printDurationMinutes: number | null
  order: { orderNumber: string }
  orderItem: { name: string; quantity: number } | null
  printer: { id: string; name: string } | null
}

interface QueueResponse {
  jobs: QueueJob[]
  etaByPrinter: Record<string, number>
}

const toast = useToast()
const auth = useAdminAuthStore()
const { data, refresh } = await useFetch<QueueResponse>('/api/admin/production/queue', {
  credentials: 'include',
  server: false,
})
const { data: printersData } = await useFetch<{ printers: { id: string; name: string }[] }>(
  '/api/admin/printers',
  { credentials: 'include', server: false },
)

const assignJob = ref<QueueJob | null>(null)
const assignPrinterId = ref('')
const assignDuration = ref('120')
const spoolNotes = ref('')

function openAssign(job: QueueJob) {
  assignJob.value = job
  assignPrinterId.value = printersData.value?.printers[0]?.id ?? ''
  spoolNotes.value = ''
}

async function submitAssign() {
  if (!assignJob.value) return
  try {
    await $fetch(`/api/admin/production/${assignJob.value.id}/assign`, {
      method: 'POST',
      credentials: 'include',
      body: {
        printerId: assignPrinterId.value,
        printDurationMinutes: Number(assignDuration.value),
        spoolNotes: spoolNotes.value || undefined,
      },
    })
    toast.show('Auftrag zugewiesen', { variant: 'success' })
    assignJob.value = null
    await refresh()
  } catch {
    toast.show('Zuweisung fehlgeschlagen', { variant: 'error' })
  }
}

async function setStatus(job: QueueJob, status: ProductionStatus) {
  try {
    await $fetch(`/api/admin/production/${job.id}/status`, {
      method: 'POST',
      credentials: 'include',
      body: { status },
    })
    toast.show(`Status → ${status}`, { variant: 'success' })
    await refresh()
  } catch {
    toast.show('Statuswechsel ungültig', { variant: 'error' })
  }
}

function nextStatuses(job: QueueJob): ProductionStatus[] {
  return [...(PRODUCTION_STATUS_TRANSITIONS[job.status] ?? [])].filter((s) => s !== 'assigned')
}

function etaLabel(job: QueueJob): string {
  if (!job.printer) return ''
  const ms = data.value?.etaByPrinter[job.printer.id]
  if (!ms) return ''
  return `ETA ${Math.round(ms / 60000)} min`
}
</script>

<template>
  <div class="flex flex-col gap-md" data-testid="production-queue">
    <PsCard v-for="job in data?.jobs ?? []" :key="job.id" :padded="true" data-testid="production-job">
      <PsProductionQueueItem
        :order-number="job.order.orderNumber"
        :item-name="job.orderItem ? `${job.orderItem.quantity}× ${job.orderItem.name}` : '—'"
        :status="job.status"
        :printer-name="job.printer?.name"
        :duration-label="etaLabel(job) || (job.printDurationMinutes ? `${job.printDurationMinutes} min` : undefined)"
      >
        <template #actions>
          <template v-if="auth.can('print-jobs:write')">
            <PsButton
              v-if="job.status === 'waiting' || job.status === 'reprint_needed'"
              size="sm"
              data-testid="assign-job"
              @click="openAssign(job)"
            >
              Drucker zuweisen
            </PsButton>
            <PsButton
              v-for="status in nextStatuses(job)"
              :key="status"
              variant="secondary"
              size="sm"
              :data-testid="`job-status-${status}`"
              @click="setStatus(job, status)"
            >
              → {{ status }}
            </PsButton>
          </template>
        </template>
      </PsProductionQueueItem>
    </PsCard>
    <p v-if="(data?.jobs ?? []).length === 0" class="text-secondary">Queue ist leer.</p>

    <PsDialog
      :open="assignJob !== null"
      title="Druckauftrag zuweisen"
      @update:open="(v: boolean) => !v && (assignJob = null)"
    >
      <form class="flex flex-col gap-md" data-testid="assign-form" @submit.prevent="submitAssign">
        <PsSelect
          v-model="assignPrinterId"
          label="Drucker"
          :options="(printersData?.printers ?? []).map((p) => ({ value: p.id, label: p.name }))"
        />
        <PsInput v-model="assignDuration" label="Druckzeit (Minuten)" type="number" required />
        <PsInput v-model="spoolNotes" label="AMS-/Spulenbelegung" placeholder="Slot 1: Brand Green …" />
        <PsButton type="submit" data-testid="confirm-assign">Zuweisen</PsButton>
      </form>
    </PsDialog>
  </div>
</template>
