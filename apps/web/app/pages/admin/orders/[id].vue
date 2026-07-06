<script setup lang="ts">
import {
  PsButton,
  PsCard,
  PsInput,
  PsOrderStatusBadge,
  PsPrice,
  PsSelect,
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
  payments: { id: string; method: string; status: string; amountCents: number }[]
  invoice: { id: string; number: string } | null
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

const { run } = useAdminAction({ refresh })

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
        <p v-if="order.invoice" class="mt-md text-caption text-secondary">
          Rechnung: {{ order.invoice.number }}
        </p>
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
        <template v-if="order.tickets.length">
          <h3 class="mt-lg text-label-medium">Support-Tickets</h3>
          <ul class="mt-sm text-body-regular" data-testid="order-tickets">
            <li v-for="ticketRow in order.tickets" :key="ticketRow.id">
              <NuxtLink :to="`/admin/tickets/${ticketRow.id}`" class="text-brand hover:underline">
                {{ ticketRow.ticketNumber }}
              </NuxtLink>
              <span class="text-secondary"> — {{ ticketRow.subject }} ({{ ticketRow.status }})</span>
            </li>
          </ul>
        </template>
      </PsCard>
    </div>

    <PsCard v-if="auth.can('orders:write') || auth.can('payments:write') || auth.can('orders:ship')">
      <h3 class="text-label-medium">Aktionen</h3>
      <div class="mt-md flex flex-wrap items-center gap-md">
        <template v-if="auth.can('payments:write') && order.status === 'awaiting_bank_transfer'">
          <PsButton data-testid="mark-paid" @click="markPaid">Zahlung erhalten (Überweisung)</PsButton>
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
        v-if="auth.can('orders:ship') && ['ready_to_ship', 'quality_check', 'in_production', 'paid'].includes(order.status)"
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
        <PsButton :disabled="trackingNumber.length < 4 || order.status !== 'ready_to_ship'" data-testid="ship-order" @click="ship">
          Versand bestätigen
        </PsButton>
      </div>
    </PsCard>
  </div>
</template>
