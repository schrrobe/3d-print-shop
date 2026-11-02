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
import { ORDER_STATUS_TRANSITIONS } from '@print-shop/utils'
import type { OrderStatus } from '@print-shop/types'

definePageMeta({ layout: 'admin', middleware: 'admin-auth' })

const route = useRoute()
const auth = useAdminAuthStore()
const orderId = String(route.params.id)

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
  items: { id: string; name: string; quantity: number; unitPriceCents: number }[]
  payments: {
    id: string
    method: string
    status: string
    amountCents: number
    stripePaymentLinkUrl: string | null
  }[]
  invoice: { id: string; number: string; sentAt: string | null } | null
  tickets: { id: string; ticketNumber: string; status: string; subject: string }[]
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
    </div>

    <div class="grid gap-lg lg:grid-cols-2">
      <PsCard>
        <h3 class="text-label-medium">Positionen</h3>
        <ul class="mt-md flex flex-col gap-sm text-body-regular">
          <li v-for="item in order.items" :key="item.id" class="flex justify-between">
            <span>{{ item.quantity }}× {{ item.name }}</span>
            <PsPrice :cents="item.unitPriceCents * item.quantity" size="sm" />
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
          v-if="auth.can('orders:write') && ['awaiting_payment', 'awaiting_bank_transfer'].includes(order.status)"
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
        v-if="
          auth.can('orders:ship') &&
          ['ready_to_ship', 'quality_check', 'in_production', 'paid'].includes(order.status)
        "
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
        <PsButton
          :disabled="trackingNumber.length < 4 || order.status !== 'ready_to_ship'"
          data-testid="ship-order"
          @click="ship"
        >
          Versand bestätigen
        </PsButton>
      </div>
    </PsCard>
  </div>
</template>
