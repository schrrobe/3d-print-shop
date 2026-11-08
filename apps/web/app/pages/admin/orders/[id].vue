<script setup lang="ts">
import {
  PsButton,
  PsCard,
  PsInput,
  PsOrderStatusBadge,
  PsPrice,
  PsSelect,
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
  firstName: string
  lastName: string
  street: string
  zip: string
  city: string
  country: string
  totalCents: number
  carrier: string | null
  trackingNumber: string | null
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

function setStatus(status: OrderStatus) {
  return run(
    () =>
      $fetch(`/api/admin/orders/${orderId}/status`, {
        method: 'POST',
        body: { status },
        credentials: 'include',
      }),
    { success: `Status → ${status}`, error: 'Statuswechsel fehlgeschlagen' },
  )
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

async function assignProvider() {
  const p = providerOptions.value?.providers.find((x) => x.id === assignForm.providerId)
  const rateBp = Math.round(Number(assignForm.ratePercent) * 100)
  let emailSent = true
  const ok = await run(
    async () => {
      const res = await $fetch<{ emailSent: boolean }>(`/api/admin/providers/assign/${orderId}`, {
        method: 'POST',
        credentials: 'include',
        body: {
          providerId: assignForm.providerId,
          // Only send an override when it differs from the provider default (admin only).
          ...(auth.can('providers:write') && p?.defaultRateBp !== rateBp ? { rateBp } : {}),
          shareCustomerData: assignForm.shareCustomerData,
          note: assignForm.note.trim() || null,
        },
      })
      emailSent = res.emailSent
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
}

function setAssignmentStatus(id: string, status: 'completed' | 'received' | 'cancelled') {
  return run(
    () =>
      $fetch(`/api/admin/providers/assignments/${id}/status`, {
        method: 'POST',
        credentials: 'include',
        body: { status },
      }),
    { success: `Externer Auftrag: ${ASSIGNMENT_LABELS[status]}`, error: 'Aktion fehlgeschlagen' },
  )
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

function ship() {
  return run(
    () =>
      $fetch(`/api/admin/orders/${orderId}/shipping`, {
        method: 'POST',
        body: { carrier: carrier.value, trackingNumber: trackingNumber.value },
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
        <PsInput v-model="trackingNumber" label="Trackingnummer" name="trackingNumber" />
        <PsButton :disabled="trackingNumber.length < 4" data-testid="ship-order" @click="ship">
          Versand bestätigen
        </PsButton>
      </div>
    </PsCard>
  </div>
</template>
