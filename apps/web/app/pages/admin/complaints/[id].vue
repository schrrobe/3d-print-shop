<script setup lang="ts">
import {
  PsAttachmentGallery,
  PsButton,
  PsCard,
  PsComplaintStatusBadge,
  PsDialog,
  PsSelect,
  PsTextarea,
} from '@print-shop/ui'
import { COMPLAINT_STATUS_TRANSITIONS } from '@print-shop/utils'
import type { ComplaintStatus } from '@print-shop/types'

definePageMeta({ layout: 'admin', middleware: 'admin-auth' })

const route = useRoute()
const auth = useAdminAuthStore()
const id = String(route.params.id)

interface Decision {
  id: string
  resolution: string
  note: string | null
  refundAmountCents: number | null
  voucherCode: string | null
  reprintJob: { id: string; status: string } | null
  decidedBy: { name: string } | null
  decidedAt: string
}
interface ComplaintDetail {
  id: string
  complaintNumber: string
  status: ComplaintStatus
  reason: string
  description: string
  internalNote: string | null
  createdAt: string
  order: {
    id: string
    orderNumber: string
    status: string
    email: string
    firstName: string
    lastName: string
    invoice: { id: string; number: string } | null
  }
  items: {
    quantity: number
    note: string | null
    orderItem: { name: string; quantity: number; product: { slug: string; customMade: boolean } | null }
  }[]
  attachments: { id: string; originalName: string; uploadedBy: string; createdAt: string }[]
  decisions: Decision[]
  ticket: { id: string; ticketNumber: string; status: string; subject: string } | null
}

const { data, refresh } = await useFetch<{ complaint: ComplaintDetail }>(
  `/api/admin/complaints/${id}`,
  { credentials: 'include', server: false },
)
const complaint = computed(() => data.value?.complaint)

const reasonLabels: Record<string, string> = {
  damaged: 'Beschädigt',
  wrong_item: 'Falscher Artikel',
  quality_issue: 'Qualitätsmangel',
  missing_parts: 'Fehlende Teile',
  color_mismatch: 'Farbabweichung',
  other: 'Sonstiges',
}
const resolutionLabels: Record<string, string> = {
  replacement_print: 'Ersatzdruck',
  refund: 'Erstattung',
  voucher: 'Gutschein',
  rejection: 'Ablehnung',
  further_review: 'Weitere Prüfung',
}

const nextStatuses = computed(() =>
  complaint.value ? COMPLAINT_STATUS_TRANSITIONS[complaint.value.status] : [],
)
const attachmentGallery = computed(() =>
  (complaint.value?.attachments ?? []).map((a) => ({
    id: a.id,
    url: `/api/admin/complaints/${id}/attachments/${a.id}`,
    name: a.originalName,
  })),
)
const canDecide = computed(() => auth.can('complaints:decide'))
const decisionAllowed = computed(
  () => complaint.value?.status === 'in_review' || complaint.value?.status === 'approved',
)

const { run } = useAdminAction({ refresh })

function setStatus(status: ComplaintStatus) {
  return run(
    () =>
      $fetch(`/api/admin/complaints/${id}/status`, {
        method: 'POST',
        body: { status },
        credentials: 'include',
      }),
    { success: `Status → ${status}`, error: 'Fehler' },
  )
}

// Internal note
const note = ref('')
watchEffect(() => {
  note.value = complaint.value?.internalNote ?? ''
})
function saveNote() {
  return run(
    () =>
      $fetch(`/api/admin/complaints/${id}`, {
        method: 'PATCH',
        body: { internalNote: note.value },
        credentials: 'include',
      }),
    { success: 'Notiz gespeichert', error: 'Speichern fehlgeschlagen' },
  )
}

// Decision dialog
const decisionOpen = ref(false)
const resolution = ref<'replacement_print' | 'refund' | 'voucher' | 'rejection' | 'further_review'>(
  'replacement_print',
)
const decisionNote = ref('')
const refundAmount = ref<number | null>(null)
const voucherCode = ref('')

async function submitDecision() {
  const ok = await run(
    () =>
      $fetch(`/api/admin/complaints/${id}/decision`, {
        method: 'POST',
        body: {
          resolution: resolution.value,
          note: decisionNote.value || undefined,
          refundAmountCents:
            resolution.value === 'refund' && refundAmount.value ? Math.round(refundAmount.value * 100) : undefined,
          voucherCode: resolution.value === 'voucher' ? voucherCode.value || undefined : undefined,
        },
        credentials: 'include',
      }),
    { success: 'Entscheidung gespeichert', error: 'Fehler' },
  )
  if (ok) decisionOpen.value = false
}

function createTicket() {
  return run(
    () =>
      $fetch(`/api/admin/complaints/${id}/ticket`, {
        method: 'POST',
        body: {},
        credentials: 'include',
      }),
    { success: 'Ticket erstellt', error: 'Fehler' },
  )
}
</script>

<template>
  <div v-if="complaint" class="flex flex-col gap-lg" data-testid="admin-complaint-detail">
    <div class="flex flex-wrap items-center gap-md">
      <h2 class="text-heading-small">{{ complaint.complaintNumber }}</h2>
      <PsComplaintStatusBadge :status="complaint.status" data-testid="complaint-status" />
      <span class="text-caption text-secondary">{{ reasonLabels[complaint.reason] ?? complaint.reason }}</span>
    </div>

    <div class="grid gap-lg lg:grid-cols-[2fr_1fr]">
      <div class="flex flex-col gap-lg">
        <PsCard>
          <h3 class="text-label-medium">Beschreibung</h3>
          <p class="mt-sm whitespace-pre-line text-body-regular text-secondary">{{ complaint.description }}</p>
        </PsCard>

        <PsCard>
          <h3 class="text-label-medium">Betroffene Positionen</h3>
          <ul class="mt-sm flex flex-col gap-sm">
            <li
              v-for="(item, i) in complaint.items"
              :key="i"
              class="rounded-card border border-subtle p-md text-body-regular"
            >
              <span>{{ item.quantity }}× {{ item.orderItem.name }}</span>
              <span
                v-if="item.orderItem.product?.customMade"
                class="ml-sm text-caption text-amber-500"
                data-testid="complaint-custom-made"
              >
                · Sonderanfertigung (nur Kulanz/Reklamation)
              </span>
            </li>
          </ul>
        </PsCard>

        <PsCard v-if="attachmentGallery.length">
          <h3 class="text-label-medium">Fotos</h3>
          <div class="mt-sm">
            <PsAttachmentGallery :attachments="attachmentGallery" />
          </div>
        </PsCard>

        <PsCard v-if="complaint.decisions.length" data-testid="complaint-decisions">
          <h3 class="text-label-medium">Entscheidungen</h3>
          <ul class="mt-sm flex flex-col gap-sm text-body-regular">
            <li v-for="d in complaint.decisions" :key="d.id" class="rounded-card border border-subtle p-md">
              <span class="text-brand">{{ resolutionLabels[d.resolution] ?? d.resolution }}</span>
              <span v-if="d.refundAmountCents"> · {{ (d.refundAmountCents / 100).toFixed(2) }} €</span>
              <span v-if="d.voucherCode"> · {{ d.voucherCode }}</span>
              <span v-if="d.reprintJob" class="text-caption text-secondary"> · Ersatzdruck-Job angelegt</span>
              <p v-if="d.note" class="text-caption text-secondary">{{ d.note }}</p>
              <p class="text-caption text-secondary">
                {{ d.decidedBy?.name ?? 'System' }} · {{ new Date(d.decidedAt).toLocaleString('de') }}
              </p>
            </li>
          </ul>
        </PsCard>
      </div>

      <div class="flex flex-col gap-lg">
        <PsCard>
          <h3 class="text-label-medium">Kunde & Bezug</h3>
          <p class="mt-md text-body-regular">{{ complaint.order.firstName }} {{ complaint.order.lastName }}</p>
          <p class="text-body-regular text-secondary">{{ complaint.order.email }}</p>
          <p class="mt-md text-body-regular">
            Bestellung:
            <NuxtLink :to="`/admin/orders/${complaint.order.id}`" class="text-brand hover:underline" data-testid="complaint-order-link">
              {{ complaint.order.orderNumber }}
            </NuxtLink>
          </p>
          <p v-if="complaint.order.invoice" class="text-body-regular text-secondary">
            Rechnung: {{ complaint.order.invoice.number }}
          </p>
          <p v-if="complaint.ticket" class="mt-sm text-body-regular">
            Ticket: {{ complaint.ticket.ticketNumber }} ({{ complaint.ticket.status }})
          </p>
          <PsButton
            v-else
            variant="ghost"
            size="sm"
            class="mt-sm"
            data-testid="complaint-ticket-create"
            @click="createTicket"
          >
            Ticket erstellen
          </PsButton>
        </PsCard>

        <PsCard>
          <h3 class="text-label-medium">Status</h3>
          <div class="mt-md flex flex-wrap gap-sm">
            <PsButton
              v-for="status in nextStatuses"
              :key="status"
              variant="secondary"
              size="sm"
              :data-testid="`complaint-status-action-${status}`"
              @click="setStatus(status)"
            >
              → {{ status }}
            </PsButton>
          </div>
          <PsButton
            v-if="canDecide && decisionAllowed"
            class="mt-md"
            size="sm"
            data-testid="complaint-decision-open"
            @click="decisionOpen = true"
          >
            Entscheidung treffen
          </PsButton>
        </PsCard>

        <PsCard>
          <h3 class="text-label-medium">Interne Notiz</h3>
          <PsTextarea
            v-model="note"
            label=""
            name="internalNote"
            :rows="4"
            class="mt-sm"
            data-testid="complaint-internal-note"
          />
          <PsButton size="sm" class="mt-sm" @click="saveNote">Speichern</PsButton>
        </PsCard>
      </div>
    </div>

    <PsDialog v-model:open="decisionOpen" title="Entscheidung treffen">
      <div class="flex flex-col gap-md">
        <PsSelect
          v-model="resolution"
          label="Lösung"
          :options="Object.entries(resolutionLabels).map(([value, label]) => ({ value, label }))"
          data-testid="complaint-decision-resolution"
        />
        <label v-if="resolution === 'refund'" class="flex flex-col gap-xs text-body-regular">
          <span>Erstattungsbetrag (€)</span>
          <input
            v-model.number="refundAmount"
            type="number"
            step="0.01"
            min="0"
            class="rounded-card border border-subtle bg-surface px-md py-sm"
            data-testid="complaint-decision-refund"
          />
        </label>
        <label v-if="resolution === 'voucher'" class="flex flex-col gap-xs text-body-regular">
          <span>Gutscheincode</span>
          <input
            v-model="voucherCode"
            class="rounded-card border border-subtle bg-surface px-md py-sm"
            data-testid="complaint-decision-voucher"
          />
        </label>
        <PsTextarea v-model="decisionNote" label="Notiz (optional)" name="decisionNote" :rows="3" />
        <PsButton data-testid="complaint-decision-submit" @click="submitDecision">Speichern</PsButton>
      </div>
    </PsDialog>
  </div>
</template>
