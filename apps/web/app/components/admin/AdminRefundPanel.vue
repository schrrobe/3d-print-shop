<script setup lang="ts">
import { PsBadge, PsButton, PsCard, PsInput, PsPrice, PsTextarea } from '@print-shop/ui'

/**
 * Erstattungen of an order: list (with Rechnungskorrektur), remaining amount,
 * partial/full refund and "Stornieren & erstatten". Prefilled from a complaint
 * via ?refund=<cents>&complaint=<id>.
 */
const props = defineProps<{ orderId: string; orderStatus: string }>()
const emit = defineEmits<{ changed: [] }>()

interface RefundRow {
  id: string
  amountCents: number
  status: 'pending' | 'succeeded' | 'failed'
  provider: 'stripe' | 'paypal' | 'manual'
  reason: string | null
  failureReason: string | null
  createdAt: string
  createdBy: { name: string } | null
  invoiceCorrection: { id: string; number: string; sentAt: string | null } | null
}
interface RefundInfo {
  refunds: RefundRow[]
  hasInvoice: boolean
  payment: { id: string; method: string; amountCents: number } | null
  provider: 'stripe' | 'paypal' | 'manual' | null
  refundableCents: number
}

const route = useRoute()
const { data, refresh } = await useFetch<RefundInfo>(`/api/admin/refunds/orders/${props.orderId}`, {
  credentials: 'include',
  server: false,
})

const prefillCents = Number(route.query.refund) || 0
const complaintId = typeof route.query.complaint === 'string' ? route.query.complaint : undefined
const amount = ref(prefillCents ? (prefillCents / 100).toFixed(2) : '')
const reason = ref(complaintId ? 'Reklamation' : '')
const confirmManual = ref(false)

const statusLabels = { pending: 'ausstehend', succeeded: 'erstattet', failed: 'fehlgeschlagen' }
const statusVariants = { pending: 'warning', succeeded: 'info', failed: 'danger' } as const
const providerLabels = { stripe: 'Stripe', paypal: 'PayPal', manual: 'manuell' }

const amountCents = computed(() => Math.round(Number(amount.value.replace(',', '.')) * 100) || 0)
const isManual = computed(() => data.value?.provider === 'manual')
const ready = computed(
  () => reason.value.trim().length > 0 && (!isManual.value || confirmManual.value),
)

const { run, pending } = useAdminAction({
  refresh: async () => {
    await refresh()
    emit('changed')
  },
})

function submit(body: Record<string, unknown>, path = '') {
  return run(
    () =>
      $fetch(`/api/admin/refunds/orders/${props.orderId}${path}`, {
        method: 'POST',
        body: {
          ...body,
          reason: reason.value.trim(),
          ...(isManual.value ? { confirmManual: confirmManual.value } : {}),
        },
        credentials: 'include',
      }),
    { success: 'Erstattung ausgeführt', error: 'Erstattung fehlgeschlagen' },
  )
}

const refundAmount = () => submit({ amountCents: amountCents.value, complaintId })
const refundFull = () => submit({ full: true, complaintId })
const cancelAndRefund = () => submit({}, '/cancel')

function resend(correctionId: string) {
  return run(
    () =>
      $fetch(`/api/admin/refunds/corrections/${correctionId}/resend`, {
        method: 'POST',
        credentials: 'include',
      }),
    { success: 'Rechnungskorrektur versendet', error: 'Versand fehlgeschlagen' },
  )
}
</script>

<template>
  <PsCard v-if="data?.payment || data?.refunds.length" id="refund" data-testid="refund-panel">
    <h3 class="text-label-medium">Erstattungen</h3>

    <ul
      v-if="data.refunds.length"
      class="mt-md flex flex-col gap-sm text-body-regular"
      data-testid="refund-list"
    >
      <li v-for="r in data.refunds" :key="r.id" class="rounded-card border border-subtle p-md">
        <div class="flex flex-wrap items-center gap-sm">
          <PsPrice :cents="r.amountCents" size="sm" />
          <PsBadge :variant="statusVariants[r.status]">{{ statusLabels[r.status] }}</PsBadge>
          <span class="text-caption text-secondary">{{ providerLabels[r.provider] }}</span>
          <template v-if="r.invoiceCorrection">
            <a
              :href="`/api/admin/refunds/corrections/${r.invoiceCorrection.id}/pdf`"
              class="text-caption text-brand hover:underline"
              data-testid="refund-correction-pdf"
              download
              >{{ r.invoiceCorrection.number }}</a
            >
            <PsButton
              size="sm"
              variant="ghost"
              :disabled="pending"
              @click="resend(r.invoiceCorrection.id)"
            >
              erneut senden
            </PsButton>
          </template>
        </div>
        <p v-if="r.reason" class="text-caption text-secondary">{{ r.reason }}</p>
        <p v-if="r.failureReason" class="text-caption text-danger">{{ r.failureReason }}</p>
        <p class="text-caption text-secondary">
          {{ r.createdBy?.name ?? 'Anbieter-Dashboard' }} ·
          {{ new Date(r.createdAt).toLocaleString('de-DE') }}
        </p>
      </li>
    </ul>

    <template v-if="data.payment">
      <p class="mt-md text-body-regular" data-testid="refundable-amount">
        Erstattbar: <PsPrice :cents="data.refundableCents" size="sm" />
        <span class="text-caption text-secondary">
          von <PsPrice :cents="data.payment.amountCents" size="sm"
        /></span>
      </p>
      <p v-if="!data.hasInvoice" class="mt-sm text-caption text-danger">
        Rechnung zuerst erzeugen – ohne Rechnung keine Erstattung.
      </p>
      <div
        v-else-if="data.refundableCents > 0"
        class="mt-md flex flex-col gap-md"
        data-testid="refund-form"
      >
        <PsInput
          v-model="amount"
          label="Betrag (€)"
          type="number"
          step="0.01"
          min="0.01"
          name="refundAmount"
        />
        <PsTextarea v-model="reason" label="Grund" name="refundReason" :rows="2" required />
        <label v-if="isManual" class="flex items-center gap-sm text-body-regular">
          <input v-model="confirmManual" type="checkbox" data-testid="refund-confirm-manual" />
          Ich habe den Betrag bereits zurücküberwiesen
        </label>
        <div class="flex flex-wrap gap-md">
          <PsButton
            :disabled="pending || !ready || amountCents <= 0 || amountCents > data.refundableCents"
            data-testid="refund-submit"
            @click="refundAmount"
          >
            Betrag erstatten
          </PsButton>
          <PsButton
            variant="secondary"
            :disabled="pending || !ready"
            data-testid="refund-full"
            @click="refundFull"
          >
            Vollständig erstatten
          </PsButton>
          <PsButton
            v-if="orderStatus === 'paid'"
            variant="danger"
            :disabled="pending || !ready"
            data-testid="refund-cancel"
            @click="cancelAndRefund"
          >
            Stornieren &amp; erstatten
          </PsButton>
        </div>
      </div>
    </template>
  </PsCard>
</template>
