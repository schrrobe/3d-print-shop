<script setup lang="ts">
import { PsButton, PsCard, PsDialog, PsQcChecklist, PsQualityCheckCard, PsTextarea, useToast } from '@print-shop/ui'
import { QC_STATUSES } from '@print-shop/types'
import type { QcStatus } from '@print-shop/types'

definePageMeta({ layout: 'admin', middleware: 'admin-auth' })

const toast = useToast()
const auth = useAdminAuthStore()

interface Checklist {
  colorOk: boolean
  surfaceOk: boolean
  dimensionsOk: boolean
  stabilityOk: boolean
  completenessOk: boolean
  packagingOk: boolean
}
interface QcRecord extends Checklist {
  id: string
  status: QcStatus
  note: string | null
  overrideReason: string | null
  approvedBy: { name: string } | null
  approvedAt: string | null
  createdAt: string
  printerJob: {
    id: string
    status: string
    order: { orderNumber: string }
    orderItem: { name: string; quantity: number } | null
    printer: { name: string } | null
  }
  attachments: { id: string }[]
}
interface JobInQc {
  id: string
  status: string
  order: { orderNumber: string }
  orderItem: { name: string; quantity: number } | null
  qcRecords: QcRecord[]
}

const statusFilter = ref('')
const { data, refresh } = await useFetch<{ records: QcRecord[]; jobsInQc: JobInQc[] }>('/api/admin/qc', {
  credentials: 'include',
  server: false,
  query: computed(() => (statusFilter.value ? { status: statusFilter.value } : {})),
})
watch(statusFilter, () => refresh())

const canOverride = computed(() => auth.can('qc:override'))

const CHECK_FIELDS: (keyof Checklist)[] = [
  'colorOk',
  'surfaceOk',
  'dimensionsOk',
  'stabilityOk',
  'completenessOk',
  'packagingOk',
]
function emptyChecklist(): Checklist {
  return { colorOk: false, surfaceOk: false, dimensionsOk: false, stabilityOk: false, completenessOk: false, packagingOk: false }
}
function checkedCount(r: Checklist): number {
  return CHECK_FIELDS.filter((f) => r[f]).length
}

// Local checklist state keyed by open-record id
const drafts = reactive<Record<string, Checklist>>({})

const openRecordByJob = (job: JobInQc): QcRecord | null =>
  job.qcRecords[0]?.status === 'open' ? job.qcRecords[0] : null

// Jobs in QC paired with their open record (if any) — stable references for the template
const openQcJobs = computed(() =>
  (data.value?.jobsInQc ?? []).map((job) => ({ job, record: openRecordByJob(job) })),
)

// Seed a draft for every open record whenever the data (re)loads
watchEffect(() => {
  for (const { record } of openQcJobs.value) {
    if (record && !drafts[record.id]) {
      drafts[record.id] = {
        colorOk: record.colorOk,
        surfaceOk: record.surfaceOk,
        dimensionsOk: record.dimensionsOk,
        stabilityOk: record.stabilityOk,
        completenessOk: record.completenessOk,
        packagingOk: record.packagingOk,
      }
    }
  }
})
function draftFor(record: QcRecord): Checklist {
  return drafts[record.id] ?? emptyChecklist()
}
/** All six checklist items ticked for the given open record's draft. */
function draftComplete(recordId: string): boolean {
  const draft = drafts[recordId]
  return draft ? checkedCount(draft) === 6 : false
}

async function startCheck(jobId: string) {
  try {
    await $fetch('/api/admin/qc', { method: 'POST', body: { printerJobId: jobId }, credentials: 'include' })
    toast.show('Prüfung gestartet', { variant: 'success' })
    await refresh()
  } catch (err) {
    toast.show((err as { data?: { message?: string } })?.data?.message ?? 'Fehler', { variant: 'error' })
  }
}

async function saveChecklist(record: QcRecord) {
  try {
    await $fetch(`/api/admin/qc/${record.id}`, {
      method: 'PATCH',
      body: draftFor(record),
      credentials: 'include',
    })
    toast.show('Checkliste gespeichert', { variant: 'success' })
    await refresh()
  } catch {
    toast.show('Speichern fehlgeschlagen', { variant: 'error' })
  }
}

async function setStatus(record: QcRecord, status: 'passed' | 'failed' | 'reprint_required') {
  try {
    // Persist the checklist first so "passed" sees the ticked boxes
    if (status === 'passed') await saveChecklistSilent(record)
    await $fetch(`/api/admin/qc/${record.id}/status`, {
      method: 'POST',
      body: { status },
      credentials: 'include',
    })
    toast.show(`QC → ${status}`, { variant: 'success' })
    await refresh()
  } catch (err) {
    toast.show((err as { data?: { message?: string } })?.data?.message ?? 'Fehler', { variant: 'error' })
  }
}
async function saveChecklistSilent(record: QcRecord) {
  await $fetch(`/api/admin/qc/${record.id}`, {
    method: 'PATCH',
    body: draftFor(record),
    credentials: 'include',
  }).catch(() => {})
}

async function uploadPhoto(record: QcRecord, event: Event) {
  const input = event.target as HTMLInputElement
  if (!input.files?.length) return
  const form = new FormData()
  for (const file of Array.from(input.files).slice(0, 5)) form.append('photos', file)
  try {
    await $fetch(`/api/admin/qc/${record.id}/photos`, { method: 'POST', body: form, credentials: 'include' })
    toast.show('Foto hochgeladen', { variant: 'success' })
    await refresh()
  } catch {
    toast.show('Upload fehlgeschlagen', { variant: 'error' })
  }
}

// Override dialog
const overrideOpen = ref(false)
const overrideRecordId = ref('')
const overrideReason = ref('')
function openOverride(recordId: string) {
  overrideRecordId.value = recordId
  overrideReason.value = ''
  overrideOpen.value = true
}
async function submitOverride() {
  try {
    await $fetch(`/api/admin/qc/${overrideRecordId.value}/override`, {
      method: 'POST',
      body: { overrideReason: overrideReason.value },
      credentials: 'include',
    })
    toast.show('QC überschrieben', { variant: 'success' })
    overrideOpen.value = false
    await refresh()
  } catch (err) {
    toast.show((err as { data?: { message?: string } })?.data?.message ?? 'Fehler', { variant: 'error' })
  }
}
</script>

<template>
  <div class="flex flex-col gap-xl" data-testid="admin-qc">
    <!-- Jobs currently in quality check -->
    <section>
      <h2 class="mb-md text-label-medium">Jobs in Qualitätsprüfung</h2>
      <p v-if="!data?.jobsInQc.length" class="text-body-regular text-secondary">Keine offenen Prüfungen.</p>
      <div class="flex flex-col gap-md">
        <PsCard v-for="entry in openQcJobs" :key="entry.job.id" :data-job-id="entry.job.id" data-testid="qc-job">
          <div class="flex flex-wrap items-center justify-between gap-md">
            <div>
              <span class="text-label-medium">{{ entry.job.order.orderNumber }}</span>
              <span class="ml-sm text-body-regular text-secondary">{{ entry.job.orderItem?.name }}</span>
            </div>
            <PsButton
              v-if="!entry.record"
              size="sm"
              data-testid="qc-start"
              @click="startCheck(entry.job.id)"
            >
              Prüfung starten
            </PsButton>
          </div>

          <div v-if="entry.record && drafts[entry.record.id]" class="mt-md flex flex-col gap-md border-t border-subtle pt-md">
            <PsQcChecklist
              :model-value="drafts[entry.record.id]!"
              data-testid="qc-checklist"
              @update:model-value="(value) => { if (entry.record) drafts[entry.record.id] = value }"
            />
            <div class="flex flex-wrap items-center gap-sm">
              <PsButton variant="secondary" size="sm" @click="saveChecklist(entry.record)">
                Checkliste speichern
              </PsButton>
              <label class="cursor-pointer text-caption text-brand hover:underline">
                Foto hinzufügen
                <input type="file" accept="image/*" multiple class="hidden" data-testid="qc-photo-input" @change="(e) => uploadPhoto(entry.record!, e)" />
              </label>
              <PsButton
                size="sm"
                data-testid="qc-pass"
                :disabled="!draftComplete(entry.record.id)"
                @click="setStatus(entry.record, 'passed')"
              >
                Bestanden
              </PsButton>
              <PsButton variant="secondary" size="sm" data-testid="qc-fail" @click="setStatus(entry.record, 'failed')">
                Fehlgeschlagen
              </PsButton>
            </div>
          </div>
        </PsCard>
      </div>
    </section>

    <!-- History -->
    <section>
      <div class="mb-md flex items-center gap-md">
        <h2 class="text-label-medium">Historie</h2>
        <select
          v-model="statusFilter"
          class="rounded-card border border-subtle bg-surface-elevated px-md py-sm text-body-regular"
          data-testid="qc-status-filter"
        >
          <option value="">Alle Status</option>
          <option v-for="s in QC_STATUSES" :key="s" :value="s">{{ s }}</option>
        </select>
      </div>
      <div class="flex flex-col gap-md">
        <PsQualityCheckCard
          v-for="record in data?.records ?? []"
          :key="record.id"
          :order-number="record.printerJob.order.orderNumber"
          :item-name="record.printerJob.orderItem?.name ?? '—'"
          :printer-name="record.printerJob.printer?.name ?? null"
          :status="record.status"
          :checked-count="checkedCount(record)"
          :note-text="record.note"
          :override-reason="record.overrideReason"
          data-testid="qc-record"
        >
          <template #actions>
            <PsButton
              v-if="record.status === 'failed'"
              variant="secondary"
              size="sm"
              data-testid="qc-reprint"
              @click="setStatus(record, 'reprint_required')"
            >
              Neudruck anfordern
            </PsButton>
            <PsButton
              v-if="canOverride && (record.status === 'open' || record.status === 'failed')"
              variant="ghost"
              size="sm"
              data-testid="qc-override-open"
              @click="openOverride(record.id)"
            >
              Überschreiben
            </PsButton>
          </template>
        </PsQualityCheckCard>
      </div>
    </section>

    <PsDialog v-model:open="overrideOpen" title="QC überschreiben" description="Bewusstes Freigeben trotz fehlgeschlagener Prüfung. Grund wird protokolliert.">
      <div class="flex flex-col gap-md">
        <PsTextarea v-model="overrideReason" label="Begründung (min. 10 Zeichen)" name="overrideReason" :rows="3" data-testid="qc-override-reason" />
        <PsButton :disabled="overrideReason.trim().length < 10" data-testid="qc-override-submit" @click="submitOverride">
          Überschreiben
        </PsButton>
      </div>
    </PsDialog>
  </div>
</template>
