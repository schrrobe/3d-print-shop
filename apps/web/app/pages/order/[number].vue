<script setup lang="ts">
import { PsButton, PsOrderStatusBadge, PsPrice, PsSection } from '@print-shop/ui'
import type { Locale, OrderStatus } from '@print-shop/types'

/** Guest order status page (order number + access token from email/confirmation). */
const { t, locale } = useI18n()
const route = useRoute()

const orderNumber = String(route.params.number)
const token = String(route.query.token ?? '')

interface OrderView {
  orderNumber: string
  status: OrderStatus
  subtotalCents: number
  shippingCents: number
  totalCents: number
  carrier: string | null
  trackingNumber: string | null
  items: { name: string; quantity: number; unitPriceCents: number }[]
  invoice: { number: string } | null
  payments: {
    id: string
    method: string
    status: string
    amountCents: number
    bank?: { accountHolder: string; iban: string; bic: string; reference: string }
    bitcoin?: {
      address: string
      expectedSats: number
      receivedSats: number
      confirmations: number
      status: string
      requiredConfirmations: number
    }
  }[]
}

const { data, error, refresh } = await useFetch<{ order: OrderView }>(
  `/api/orders/${orderNumber}`,
  { query: { token } },
)

if (error.value) {
  throw createError({ statusCode: error.value.statusCode ?? 404, statusMessage: 'Order not found' })
}

const order = computed(() => data.value!.order)
const bankPayment = computed(() => order.value.payments.find((p) => p.bank))
const bitcoinPayment = computed(() => order.value.payments.find((p) => p.bitcoin))

/** Poll bitcoin payment status via the provider sync endpoint. */
async function checkBitcoin() {
  const payment = bitcoinPayment.value
  if (!payment) return
  await $fetch(`/api/payments/bitcoin/${payment.id}/sync`, { method: 'POST' })
  await refresh()
}
</script>

<template>
  <PsSection>
    <div class="mx-auto max-w-2xl" data-testid="order-page">
      <div class="flex flex-wrap items-center justify-between gap-md">
        <h1 class="text-heading-medium">{{ t('order.title', { number: order.orderNumber }) }}</h1>
        <PsOrderStatusBadge
          :status="order.status"
          :label="t(`order.statuses.${order.status}`)"
        />
      </div>

      <h2 class="mt-2xl text-label-medium">{{ t('order.items') }}</h2>
      <ul class="mt-md flex flex-col gap-sm">
        <li
          v-for="(item, index) in order.items"
          :key="index"
          class="flex justify-between rounded-card border border-subtle bg-surface-elevated p-md text-body-regular"
        >
          <span>{{ item.quantity }}× {{ item.name }}</span>
          <PsPrice :cents="item.unitPriceCents * item.quantity" :locale="locale as Locale" />
        </li>
      </ul>
      <div class="mt-md flex justify-between border-t border-subtle pt-md text-label-medium">
        <span>{{ t('cart.total') }}</span>
        <PsPrice :cents="order.totalCents" :locale="locale as Locale" />
      </div>

      <div
        v-if="order.status === 'awaiting_bank_transfer' && bankPayment?.bank"
        class="mt-2xl rounded-card border border-brand/40 bg-brand/5 p-lg"
        data-testid="bank-details"
      >
        <h2 class="text-label-medium">{{ t('order.bank.title') }}</h2>
        <dl class="mt-md grid gap-sm text-body-regular">
          <div class="flex justify-between"><dt class="text-secondary">{{ t('order.bank.holder') }}</dt><dd>{{ bankPayment.bank.accountHolder }}</dd></div>
          <div class="flex justify-between"><dt class="text-secondary">IBAN</dt><dd class="font-mono">{{ bankPayment.bank.iban }}</dd></div>
          <div class="flex justify-between"><dt class="text-secondary">BIC</dt><dd class="font-mono">{{ bankPayment.bank.bic }}</dd></div>
          <div class="flex justify-between"><dt class="text-secondary">{{ t('order.bank.reference') }}</dt><dd class="font-mono">{{ bankPayment.bank.reference }}</dd></div>
        </dl>
      </div>

      <div
        v-if="bitcoinPayment?.bitcoin && order.status === 'awaiting_payment'"
        class="mt-2xl rounded-card border border-amber-500/40 bg-amber-500/5 p-lg"
        data-testid="bitcoin-details"
      >
        <h2 class="text-label-medium">{{ t('order.bitcoin.title') }}</h2>
        <p class="mt-md text-body-regular">
          {{ t('order.bitcoin.sendTo', { amount: bitcoinPayment.bitcoin.expectedSats.toLocaleString() }) }}
        </p>
        <p class="mt-sm break-all font-mono text-caption" data-testid="bitcoin-address">
          {{ bitcoinPayment.bitcoin.address }}
        </p>
        <p class="mt-md text-body-regular" data-testid="bitcoin-confirmations">
          {{
            t('order.bitcoin.confirmations', {
              current: bitcoinPayment.bitcoin.confirmations,
              required: bitcoinPayment.bitcoin.requiredConfirmations,
            })
          }}
        </p>
        <PsButton variant="secondary" size="sm" class="mt-md" data-testid="bitcoin-check" @click="checkBitcoin">
          {{ t('order.bitcoin.check') }}
        </PsButton>
      </div>

      <p v-if="order.trackingNumber" class="mt-2xl text-body-regular" data-testid="tracking">
        📦 {{ order.carrier?.toUpperCase() }} · <span class="font-mono">{{ order.trackingNumber }}</span>
      </p>
    </div>
  </PsSection>
</template>
