<script setup lang="ts">
import {
  PsButton,
  PsCard,
  PsInput,
  PsOrderStatusBadge,
  PsPrice,
  PsSelect,
  PsTextarea,
  PsBadge,
  useToast,
} from '@print-shop/ui'
import { formatCents, ORDER_STATUS_TRANSITIONS } from '@print-shop/utils'
import type { OrderStatus } from '@print-shop/types'

definePageMeta({ layout: 'admin', middleware: 'admin-auth' })

const route = useRoute()
const auth = useAdminAuthStore()
const orderId = String(route.params.id)

type ItemColor = { slot: string; label: string; name: string; hex: string | null }

interface AdminOrderDetail {
  id: string
  orderNumber: string
  status: OrderStatus
  source: 'shop' | 'admin' | 'quote'
  note: string | null
  email: string
  carrierEmailConsentAt: string | null
  firstName: string
  lastName: string
  street: string
  zip: string
  city: string
  country: string
  totalCents: number
  carrier: string | null
  trackingNumber: string | null
  trackingUrl: string | null
  internalNote: string | null
  /** Latest DHL label; active = not yet shipped, can be cancelled */
  dhlLabel: { trackingNumber: string | null; active: boolean } | null
  packedWeightGrams: number | null
  items: {
    id: string
    name: string
    quantity: number
    unitPriceCents: number
    personalization: string | null
    colors: ItemColor[]
  }[]
  payments: {
    id: string
    method: string
    status: string
    amountCents: number
    stripePaymentLinkUrl: string | null
  }[]
  invoice: { id: string; number: string; sentAt: string | null } | null
  tickets: { id: string; ticketNumber: string; status: string; subject: string }[]
  providerAssignments: ProviderAssignment[]
}

interface ProviderAssignment {
  id: string
  status: 'assigned' | 'completed' | 'received' | 'cancelled'
  provider: { id: string; name: string }
  shareCustomerData: boolean
  note: string | null
  emailSentAt: string | null
  createdAt: string
  /** Only with providers:read */
  rateBp?: number
  baseCents?: number
  payoutCents?: number
}

const ASSIGNMENT_LABELS: Record<ProviderAssignment['status'], string> = {
  assigned: 'beauftragt',
  completed: 'fertig gemeldet',
  received: 'eingegangen',
  cancelled: 'storniert',
}

const { data, refresh } = await useFetch<{ order: AdminOrderDetail }>(
  `/api/admin/orders/${orderId}`,
  { credentials: 'include', server: false },
)

const order = computed(() => data.value?.order)
const nextStatuses = computed(() =>
  order.value ? ORDER_STATUS_TRANSITIONS[order.value.status] : [],
)

const carrier = ref('dhl')
const trackingNumber = ref('')
const trackingUrl = ref('')

// Drafts follow the saved value only when it changes, so a refresh after
// another action never wipes unsaved input.
const internalNote = ref('')
const trackingUrlDraft = ref('')
watch(
  () => order.value?.internalNote,
  (v) => (internalNote.value = v ?? ''),
  { immediate: true },
)
watch(
  () => order.value?.trackingUrl,
  (v) => (trackingUrlDraft.value = v ?? ''),
  { immediate: true },
)

function updateOrder(body: { internalNote?: string | null; trackingUrl?: string | null }) {
  return run(
    () =>
      $fetch(`/api/admin/orders/${orderId}`, {
        method: 'PATCH',
        body,
        credentials: 'include',
      }),
    { success: 'Gespeichert', error: 'Speichern fehlgeschlagen' },
  )
}

const weightGrams = ref('')
const labelUrl = `/api/admin/orders/${orderId}/dhl-label.pdf`
// Ship form follows the active label: carrier DHL + its shipment number.
watch(
  order,
  (o) => {
    if (o?.dhlLabel?.active) {
      carrier.value = 'dhl'
      trackingNumber.value = o.dhlLabel.trackingNumber ?? ''
    }
    if (!weightGrams.value && o?.packedWeightGrams) weightGrams.value = String(o.packedWeightGrams)
  },
  { immediate: true },
)

const { run, pending } = useAdminAction({ refresh })
const toast = useToast()

const openPaymentLink = computed(
  () =>
    order.value?.payments.find(
      (p) => p.method === 'stripe_payment_link' && p.status === 'pending' && p.stripePaymentLinkUrl,
    )?.stripePaymentLinkUrl ?? null,
)

async function copyPaymentLink() {
  if (!openPaymentLink.value) return
  try {
    await navigator.clipboard.writeText(openPaymentLink.value)
    toast.show('Link kopiert', { variant: 'success' })
  } catch {
    toast.show('Kopieren fehlgeschlagen', { variant: 'error' })
  }
}

function resendInvoice() {
  return run(
    () =>
      $fetch(`/api/admin/orders/${orderId}/invoice/resend`, {
        method: 'POST',
        credentials: 'include',
      }),
    { success: 'Rechnung versendet', error: 'Rechnungsversand fehlgeschlagen' },
  )
}

function resendConfirmation() {
  return run(
    () =>
      $fetch(`/api/admin/orders/${orderId}/confirmation/resend`, {
        method: 'POST',
        credentials: 'include',
      }),
    {
      success: 'Bestellbestätigung versendet',
      error: 'Versand der Bestellbestätigung fehlgeschlagen',
    },
  )
}

function resendPaymentLink() {
  return run(
    () =>
      $fetch(`/api/admin/orders/${orderId}/payment-link/resend`, {
        method: 'POST',
        credentials: 'include',
      }),
    { success: 'Zahlungslink versendet', error: 'Versand des Zahlungslinks fehlgeschlagen' },
  )
}

async function setStatus(status: OrderStatus) {
  let providerCancelEmailSent: boolean | null = null
  await run(
    async () => {
      const res = await $fetch<{ providerCancelEmailSent: boolean | null }>(
        `/api/admin/orders/${orderId}/status`,
        { method: 'POST', body: { status }, credentials: 'include' },
      )
      providerCancelEmailSent = res.providerCancelEmailSent
    },
    { success: `Status → ${status}`, error: 'Statuswechsel fehlgeschlagen' },
  )
  warnCancelEmail(providerCancelEmailSent)
}

function markPaid() {
  return run(
    () =>
      $fetch(`/api/admin/orders/${orderId}/mark-paid`, {
        method: 'POST',
        body: {},
        credentials: 'include',
      }),
    { success: 'Als bezahlt markiert', error: 'Aktion fehlgeschlagen' },
  )
}

// ---------- External production ----------
const liveAssignment = computed(
  () => order.value?.providerAssignments.find((a) => a.status !== 'cancelled') ?? null,
)
const pastAssignments = computed(
  () => order.value?.providerAssignments.filter((a) => a.status === 'cancelled') ?? [],
)
const canAssign = computed(
  () =>
    auth.can('provider-orders:write') &&
    !!order.value &&
    ['paid', 'in_production'].includes(order.value.status) &&
    (!liveAssignment.value || liveAssignment.value.status === 'assigned'),
)
const { data: providerOptions } = await useFetch<{
  providers: { id: string; name: string; defaultRateBp?: number }[]
}>('/api/admin/providers/options', {
  credentials: 'include',
  server: false,
  immediate: auth.can('provider-orders:write'),
})
const assignForm = reactive({ providerId: '', ratePercent: '', shareCustomerData: false, note: '' })
watch(
  () => assignForm.providerId,
  (id) => {
    const p = providerOptions.value?.providers.find((x) => x.id === id)
    assignForm.ratePercent = p?.defaultRateBp !== undefined ? String(p.defaultRateBp / 100) : ''
  },
)

/** Warns when the previous provider could not be told about a cancellation. */
function warnCancelEmail(sent: boolean | null | undefined) {
  if (sent === false)
    toast.show('Storno-Mail an den bisherigen Anbieter fehlgeschlagen – bitte direkt informieren', {
      variant: 'error',
    })
}

async function assignProvider() {
  let emailSent = true
  let cancelEmailSent: boolean | null = null
  const ok = await run(
    async () => {
      const res = await $fetch<{ emailSent: boolean; cancelEmailSent: boolean | null }>(
        `/api/admin/providers/assign/${orderId}`,
        {
          method: 'POST',
          credentials: 'include',
          body: {
            providerId: assignForm.providerId,
            // Admins freeze exactly the displayed rate (a concurrent default change must not slip in).
            ...(auth.can('providers:write')
              ? { rateBp: Math.round(Number(assignForm.ratePercent) * 100) }
              : {}),
            shareCustomerData: assignForm.shareCustomerData,
            note: assignForm.note.trim() || null,
          },
        },
      )
      emailSent = res.emailSent
      cancelEmailSent = res.cancelEmailSent
    },
    { error: 'Vergabe fehlgeschlagen' },
  )
  if (!ok) return
  // The new provider is filtered out of the select; a stale id would re-assign it.
  Object.assign(assignForm, { providerId: '', ratePercent: '', shareCustomerData: false, note: '' })
  toast.show(
    emailSent
      ? 'Auftrag vergeben und per E-Mail versendet'
      : 'Auftrag vergeben, E-Mail-Versand fehlgeschlagen – bitte erneut senden',
    { variant: emailSent ? 'success' : 'error' },
  )
  warnCancelEmail(cancelEmailSent)
}

async function setAssignmentStatus(id: string, status: 'completed' | 'received' | 'cancelled') {
  let cancelEmailSent: boolean | null = null
  await run(
    async () => {
      const res = await $fetch<{ cancelEmailSent: boolean | null }>(
        `/api/admin/providers/assignments/${id}/status`,
        { method: 'POST', credentials: 'include', body: { status } },
      )
      cancelEmailSent = res.cancelEmailSent
    },
    { success: `Externer Auftrag: ${ASSIGNMENT_LABELS[status]}`, error: 'Aktion fehlgeschlagen' },
  )
  warnCancelEmail(cancelEmailSent)
}

function resendAssignment(id: string) {
  return run(
    () =>
      $fetch(`/api/admin/providers/assignments/${id}/resend`, {
        method: 'POST',
        credentials: 'include',
      }),
    { success: 'Auftrag erneut gesendet', error: 'E-Mail-Versand fehlgeschlagen' },
  )
}

async function createDhlLabel() {
  // Open the tab inside the click — popup blockers drop window.open after an await.
  const tab = window.open('', '_blank')
  let warnings: string[] = []
  const ok = await run(
    async () => {
      const res = await $fetch<{ trackingNumber: string; warnings: string[] }>(
        `/api/admin/orders/${orderId}/dhl-label`,
        {
          method: 'POST',
          body: { weightGrams: Number(weightGrams.value) },
          credentials: 'include',
        },
      )
      warnings = res.warnings
    },
    { success: 'DHL-Label erstellt', error: 'DHL-Label fehlgeschlagen' },
  )
  if (!ok) return tab?.close()
  if (tab) tab.location.href = labelUrl
  if (warnings.length) toast.show(`DHL-Hinweis: ${warnings.join(' · ')}`, { variant: 'error' })
}

function withdrawCarrierEmailConsent() {
  return run(
    () =>
      $fetch(`/api/admin/orders/${orderId}/carrier-email-consent/withdraw`, {
        method: 'POST',
        credentials: 'include',
      }),
    { success: 'Einwilligung widerrufen', error: 'Aktion fehlgeschlagen' },
  )
}

function printDhlLabel() {
  window.open(labelUrl, '_blank')
}

async function cancelDhlLabel() {
  const ok = await run(
    () =>
      $fetch(`/api/admin/orders/${orderId}/dhl-label`, {
        method: 'DELETE',
        credentials: 'include',
      }),
    { success: 'DHL-Label storniert', error: 'DHL-Storno fehlgeschlagen' },
  )
  if (ok) trackingNumber.value = ''
}

function ship() {
  return run(
    () =>
      $fetch(`/api/admin/orders/${orderId}/shipping`, {
        method: 'POST',
        body: {
          carrier: carrier.value,
          trackingNumber: trackingNumber.value,
          trackingUrl: trackingUrl.value.trim() || null,
        },
        credentials: 'include',
      }),
    { success: 'Versand bestätigt', error: 'Versand fehlgeschlagen' },
  )
}
</script>

<template>
  <div v-if="order" class="flex flex-col gap-lg" data-testid="admin-order-detail">
    <div class="flex flex-wrap items-center gap-md">
      <h2 class="text-heading-small">{{ order.orderNumber }}</h2>
      <PsOrderStatusBadge :status="order.status" data-testid="admin-order-status" />
      <PsBadge v-if="order.source === 'admin'" variant="info">Paylink</PsBadge>
      <PsBadge v-if="liveAssignment" variant="external" data-testid="order-external">
        Extern: {{ liveAssignment.provider.name }}
      </PsBadge>
    </div>

    <div class="grid gap-lg lg:grid-cols-2">
      <PsCard>
        <h3 class="text-label-medium">Positionen</h3>
        <ul class="mt-md flex flex-col gap-sm text-body-regular">
          <li v-for="item in order.items" :key="item.id">
            <div class="flex justify-between">
              <span>{{ item.quantity }}× {{ item.name }}</span>
              <PsPrice :cents="item.unitPriceCents * item.quantity" size="sm" />
            </div>
            <AdminItemColors :colors="item.colors" :personalization="item.personalization" />
          </li>
        </ul>
        <div class="mt-md flex justify-between border-t border-subtle pt-md text-label-medium">
          <span>Gesamt</span>
          <PsPrice :cents="order.totalCents" />
        </div>
        <div v-if="order.invoice" class="mt-md flex flex-wrap items-center gap-md">
          <p class="text-caption text-secondary" data-testid="invoice-status">
            Rechnung: {{ order.invoice.number }} —
            {{
              order.invoice.sentAt
                ? `versendet am ${new Date(order.invoice.sentAt).toLocaleString('de-DE')}`
                : 'noch nicht versendet'
            }}
          </p>
          <PsButton
            v-if="auth.can('orders:write')"
            variant="secondary"
            :disabled="pending"
            data-testid="resend-invoice"
            @click="resendInvoice"
          >
            Rechnung erneut senden
          </PsButton>
        </div>
        <PsButton
          v-if="auth.can('orders:write')"
          class="mt-md"
          variant="secondary"
          :disabled="pending"
          data-testid="resend-confirmation"
          @click="resendConfirmation"
        >
          Bestellbestätigung erneut senden
        </PsButton>
        <PsButton
          v-if="
            auth.can('orders:write') &&
            ['awaiting_payment', 'awaiting_bank_transfer'].includes(order.status)
          "
          class="mt-md ml-md"
          variant="secondary"
          :disabled="pending"
          data-testid="resend-payment-link"
          @click="resendPaymentLink"
        >
          Zahlungslink erneut senden
        </PsButton>
      </PsCard>

      <PsCard>
        <h3 class="text-label-medium">Kunde</h3>
        <address class="mt-md text-body-regular not-italic text-secondary">
          {{ order.firstName }} {{ order.lastName }}<br />
          {{ order.street }}<br />
          {{ order.zip }} {{ order.city }}, {{ order.country }}<br />
          {{ order.email }}
        </address>
        <p class="mt-sm flex flex-wrap items-center gap-sm text-caption text-secondary">
          <span data-testid="carrier-email-consent">
            E-Mail an DHL:
            {{
              order.carrierEmailConsentAt
                ? `eingewilligt am ${new Date(order.carrierEmailConsentAt).toLocaleString('de-DE')}`
                : 'keine Einwilligung'
            }}
          </span>
          <PsButton
            v-if="order.carrierEmailConsentAt && auth.can('orders:write')"
            variant="secondary"
            :disabled="pending"
            data-testid="carrier-email-consent-withdraw"
            @click="withdrawCarrierEmailConsent"
          >
            Widerruf eintragen
          </PsButton>
        </p>
        <h3 class="mt-lg text-label-medium">Zahlungen</h3>
        <ul class="mt-sm text-body-regular text-secondary">
          <li v-for="p in order.payments" :key="p.id">{{ p.method }} — {{ p.status }}</li>
        </ul>
        <div
          v-if="openPaymentLink"
          class="mt-sm flex flex-wrap items-center gap-sm"
          data-testid="payment-link"
        >
          <a
            :href="openPaymentLink"
            target="_blank"
            rel="noopener"
            class="break-all text-caption text-brand hover:underline"
            >{{ openPaymentLink }}</a
          >
          <PsButton variant="secondary" data-testid="copy-payment-link" @click="copyPaymentLink"
            >Link kopieren</PsButton
          >
        </div>
        <template v-if="order.note">
          <h3 class="mt-lg text-label-medium">Notiz</h3>
          <p class="mt-sm whitespace-pre-line text-body-regular text-secondary">{{ order.note }}</p>
        </template>
        <template v-if="order.tickets.length">
          <h3 class="mt-lg text-label-medium">Support-Tickets</h3>
          <ul class="mt-sm text-body-regular" data-testid="order-tickets">
            <li v-for="ticketRow in order.tickets" :key="ticketRow.id">
              <NuxtLink :to="`/admin/tickets/${ticketRow.id}`" class="text-brand hover:underline">
                {{ ticketRow.ticketNumber }}
              </NuxtLink>
              <span class="text-secondary">
                — {{ ticketRow.subject }} ({{ ticketRow.status }})</span
              >
            </li>
          </ul>
        </template>
      </PsCard>
    </div>

    <PsCard v-if="order.trackingNumber" data-testid="order-tracking">
      <h3 class="text-label-medium">Versand</h3>
      <p class="mt-sm text-body-regular">
        {{ order.carrier?.toUpperCase() }} ·
        <a
          v-if="order.trackingUrl"
          :href="order.trackingUrl"
          target="_blank"
          rel="noopener noreferrer"
          class="font-mono text-brand hover:underline"
          >{{ order.trackingNumber }}</a
        >
        <span v-else class="font-mono">{{ order.trackingNumber }}</span>
      </p>
      <div v-if="auth.can('orders:ship')" class="mt-md flex flex-wrap items-end gap-md">
        <PsInput
          v-model="trackingUrlDraft"
          label="Tracking-Link"
          name="editTrackingUrl"
          type="url"
          placeholder="https://"
        />
        <PsButton
          variant="secondary"
          :disabled="pending"
          data-testid="save-tracking-url"
          @click="updateOrder({ trackingUrl: trackingUrlDraft.trim() || null })"
        >
          Link speichern
        </PsButton>
      </div>
    </PsCard>

    <PsCard data-testid="order-internal-note">
      <h3 class="text-label-medium">Interne Notiz</h3>
      <p class="mt-xs text-caption text-secondary">Nur im Admin sichtbar, nie für Kunden.</p>
      <PsTextarea
        v-model="internalNote"
        label="Notiz"
        name="internalNote"
        :rows="4"
        class="mt-sm"
        :disabled="!auth.can('orders:write')"
      />
      <PsButton
        v-if="auth.can('orders:write')"
        class="mt-md"
        variant="secondary"
        :disabled="pending"
        data-testid="save-internal-note"
        @click="updateOrder({ internalNote: internalNote.trim() || null })"
      >
        Notiz speichern
      </PsButton>
    </PsCard>

    <PsCard
      v-if="liveAssignment || pastAssignments.length || canAssign"
      data-testid="external-production"
    >
      <h3 class="text-label-medium">Externe Fertigung</h3>
      <div v-if="liveAssignment" class="mt-md flex flex-col gap-sm text-body-regular">
        <div class="flex flex-wrap items-center gap-sm">
          <PsBadge variant="external">{{ liveAssignment.provider.name }}</PsBadge>
          <span data-testid="assignment-status">{{
            ASSIGNMENT_LABELS[liveAssignment.status]
          }}</span>
          <span v-if="liveAssignment.shareCustomerData" class="text-caption text-secondary"
            >· Direktversand (Kundendaten übermittelt)</span
          >
        </div>
        <p class="text-caption text-secondary">
          Vergeben am {{ new Date(liveAssignment.createdAt).toLocaleString('de-DE') }} —
          {{
            liveAssignment.emailSentAt
              ? `E-Mail versendet am ${new Date(liveAssignment.emailSentAt).toLocaleString('de-DE')}`
              : 'E-Mail noch nicht versendet'
          }}
        </p>
        <p v-if="liveAssignment.payoutCents !== undefined" class="text-caption text-secondary">
          Warenwert {{ formatCents(liveAssignment.baseCents ?? 0) }} ·
          {{ ((liveAssignment.rateBp ?? 0) / 100).toLocaleString('de-DE') }} % · Vergütung
          {{ formatCents(liveAssignment.payoutCents) }}
        </p>
        <p v-if="liveAssignment.note" class="whitespace-pre-line text-caption text-secondary">
          Hinweis: {{ liveAssignment.note }}
        </p>
        <div v-if="auth.can('provider-orders:write')" class="flex flex-wrap gap-sm">
          <PsButton
            v-if="liveAssignment.status === 'assigned'"
            variant="secondary"
            :disabled="pending"
            data-testid="assignment-completed"
            @click="setAssignmentStatus(liveAssignment.id, 'completed')"
            >Fertig gemeldet</PsButton
          >
          <PsButton
            v-if="liveAssignment.status === 'completed' && !liveAssignment.shareCustomerData"
            variant="secondary"
            :disabled="pending"
            data-testid="assignment-received"
            @click="setAssignmentStatus(liveAssignment.id, 'received')"
            >Ware eingegangen</PsButton
          >
          <PsButton
            variant="secondary"
            :disabled="pending"
            data-testid="assignment-resend"
            @click="resendAssignment(liveAssignment.id)"
            >Auftrag erneut senden</PsButton
          >
          <PsButton
            v-if="liveAssignment.status === 'assigned'"
            variant="ghost"
            :disabled="pending"
            data-testid="assignment-cancel"
            @click="setAssignmentStatus(liveAssignment.id, 'cancelled')"
            >Stornieren</PsButton
          >
        </div>
      </div>

      <form
        v-if="canAssign"
        class="mt-lg flex max-w-[36rem] flex-col gap-md border-t border-subtle pt-lg"
        data-testid="assign-provider-form"
        @submit.prevent="assignProvider"
      >
        <p class="text-label-medium">
          {{
            liveAssignment
              ? 'Neu vergeben (storniert den bisherigen Auftrag)'
              : 'An Anbieter vergeben'
          }}
        </p>
        <label class="flex flex-col gap-xs text-caption text-secondary">
          Anbieter
          <select
            v-model="assignForm.providerId"
            required
            class="rounded-card border border-subtle bg-surface-elevated px-md py-sm text-body-regular"
            data-testid="assign-provider"
          >
            <option value="" disabled>Bitte wählen</option>
            <option
              v-for="p in (providerOptions?.providers ?? []).filter(
                (x) => x.id !== liveAssignment?.provider.id,
              )"
              :key="p.id"
              :value="p.id"
            >
              {{ p.name }}
            </option>
          </select>
        </label>
        <PsInput
          v-if="auth.can('providers:write')"
          v-model="assignForm.ratePercent"
          label="Anteil vom Warenwert (%)"
          type="number"
          min="0"
          max="100"
          step="0.01"
          required
          data-testid="assign-rate"
        />
        <label class="flex cursor-pointer items-center gap-sm text-body-regular">
          <input
            v-model="assignForm.shareCustomerData"
            type="checkbox"
            data-testid="assign-share-customer"
          />
          Direktversand: Name und Lieferadresse des Kunden mitsenden
        </label>
        <label class="flex flex-col gap-xs text-caption text-secondary">
          Hinweis an den Anbieter (optional)
          <textarea
            v-model="assignForm.note"
            rows="2"
            maxlength="2000"
            class="rounded-card border border-subtle bg-surface-elevated px-md py-sm text-body-regular"
            data-testid="assign-note"
          />
        </label>
        <div>
          <PsButton
            type="submit"
            :disabled="pending || !assignForm.providerId"
            data-testid="assign-submit"
          >
            Vergeben und PDF senden
          </PsButton>
        </div>
      </form>

      <ul v-if="pastAssignments.length" class="mt-lg text-caption text-secondary">
        <li v-for="a in pastAssignments" :key="a.id">
          {{ a.provider.name }} — storniert (vergeben
          {{ new Date(a.createdAt).toLocaleDateString('de-DE') }})
        </li>
      </ul>
    </PsCard>

    <PsCard
      v-if="auth.can('orders:write') || auth.can('payments:write') || auth.can('orders:ship')"
    >
      <h3 class="text-label-medium">Aktionen</h3>
      <div class="mt-md flex flex-wrap items-center gap-md">
        <template v-if="auth.can('payments:write') && order.status === 'awaiting_bank_transfer'">
          <PsButton data-testid="mark-paid" @click="markPaid"
            >Zahlung erhalten (Überweisung)</PsButton
          >
        </template>
        <template v-if="auth.can('orders:write')">
          <PsButton
            v-for="status in nextStatuses.filter((s) => s !== 'shipped')"
            :key="status"
            variant="secondary"
            :data-testid="`status-${status}`"
            @click="setStatus(status)"
          >
            → {{ status }}
          </PsButton>
        </template>
      </div>

      <div
        v-if="auth.can('orders:ship') && nextStatuses.includes('shipped')"
        class="mt-lg flex flex-wrap items-end gap-md border-t border-subtle pt-lg"
        data-testid="shipping-form"
      >
        <PsSelect
          v-model="carrier"
          label="Versanddienstleister"
          :options="[
            { value: 'dhl', label: 'DHL' },
            { value: 'hermes', label: 'Hermes' },
          ]"
        />
        <PsInput v-model="trackingNumber" label="Sendungsnummer" name="trackingNumber" />
        <PsInput
          v-model="trackingUrl"
          label="Tracking-Link (optional)"
          name="trackingUrl"
          type="url"
          placeholder="https://"
        />
        <PsButton :disabled="trackingNumber.length < 4" data-testid="ship-order" @click="ship">
          Versand bestätigen
        </PsButton>
      </div>

      <div
        v-if="
          auth.can('orders:ship') &&
          (order.dhlLabel || (carrier === 'dhl' && nextStatuses.includes('shipped')))
        "
        class="mt-lg flex flex-wrap items-end gap-md border-t border-subtle pt-lg"
        data-testid="dhl-label"
      >
        <template v-if="order.dhlLabel?.active || !nextStatuses.includes('shipped')">
          <p class="text-body-regular">
            DHL-Label <span class="font-mono">{{ order.dhlLabel?.trackingNumber }}</span>
          </p>
          <PsButton variant="secondary" data-testid="dhl-label-print" @click="printDhlLabel">
            Label drucken
          </PsButton>
          <PsButton
            v-if="order.dhlLabel?.active"
            variant="secondary"
            :disabled="pending"
            data-testid="dhl-label-cancel"
            @click="cancelDhlLabel"
          >
            Label stornieren
          </PsButton>
        </template>
        <template v-else>
          <PsInput v-model="weightGrams" label="Gewicht (g)" name="weightGrams" type="number" />
          <PsButton
            :disabled="
              pending ||
              !(
                Number.isInteger(Number(weightGrams)) &&
                Number(weightGrams) >= 1 &&
                Number(weightGrams) <= 31500
              )
            "
            data-testid="dhl-label-create"
            @click="createDhlLabel"
          >
            DHL-Label erstellen
          </PsButton>
        </template>
      </div>
    </PsCard>
  </div>
</template>
