<script setup lang="ts">
import { PsButton, PsCard, PsInput, PsTextarea, useToast } from '@print-shop/ui'

definePageMeta({ layout: 'admin', middleware: 'admin-auth' })

const route = useRoute()
const toast = useToast()
const auth = useAdminAuthStore()
const requestId = String(route.params.id)

interface RequestDetail {
  id: string
  name: string
  email: string
  phone: string | null
  description: string
  quantity: number
  status: string
  files: { id: string; originalName: string; sizeBytes: number }[]
  quotes: {
    id: string
    status: string
    priceCents: number
    order: { orderNumber: string } | null
  }[]
}

const { data, error, refresh } = await useFetch<{ request: RequestDetail }>(
  `/api/admin/quote-requests/${requestId}`,
  { credentials: 'include', server: false },
)
const request = computed(() => data.value?.request)

const priceEuros = ref('')
const message = ref('')

async function run(action: () => Promise<unknown>, options: { success?: string } = {}) {
  try {
    await action()
    await refresh()
    if (options.success) toast.show(options.success, { variant: 'success' })
  } catch {
    toast.show('Aktion fehlgeschlagen', { variant: 'error' })
  }
}

function setStatus(status: string) {
  return run(() =>
    $fetch(`/api/admin/quote-requests/${requestId}/status`, {
      method: 'POST',
      body: { status },
      credentials: 'include',
    }),
  )
}

async function createQuote() {
  const priceCents = Math.round(Number(priceEuros.value.replace(',', '.')) * 100)
  if (!Number.isFinite(priceCents) || priceCents <= 0) {
    toast.show('Bitte gültigen Preis eingeben', { variant: 'error' })
    return
  }
  await run(
    () =>
      $fetch(`/api/admin/quote-requests/${requestId}/quotes`, {
        method: 'POST',
        body: { priceCents, message: message.value || undefined, validDays: 14 },
        credentials: 'include',
      }),
    { success: 'Angebot versendet' },
  )
}
</script>

<template>
  <div v-if="error" class="text-error" data-testid="admin-upload-error">
    Fehler beim Laden der Anfrage
  </div>
  <div v-else-if="request" class="flex flex-col gap-lg" data-testid="admin-upload-detail">
    <PsCard>
      <h2 class="text-heading-small">{{ request.name }}</h2>
      <p class="text-caption text-secondary">{{ request.email }} · Status: {{ request.status }}</p>
      <p class="mt-md text-body-regular">{{ request.description }}</p>
      <p class="mt-sm text-caption text-secondary">Stückzahl: {{ request.quantity }}</p>
      <ul class="mt-md flex flex-col gap-xs text-body-regular">
        <li
          v-for="file in request.files"
          :key="file.id"
          class="rounded-card bg-surface px-md py-sm font-mono text-caption"
        >
          <a
            :href="`/api/admin/quote-requests/${requestId}/files/${file.id}`"
            class="text-brand hover:underline"
          >
            {{ file.originalName }}
          </a>
          ({{ (file.sizeBytes / 1024 / 1024).toFixed(2) }} MB)
        </li>
      </ul>
      <div v-if="auth.can('uploads:review') && request.status === 'new'" class="mt-lg flex gap-md">
        <PsButton variant="secondary" data-testid="request-review" @click="setStatus('in_review')"
          >In Prüfung nehmen</PsButton
        >
        <PsButton variant="danger" data-testid="request-reject" @click="setStatus('rejected')"
          >Ablehnen</PsButton
        >
      </div>
    </PsCard>

    <PsCard v-if="request.quotes.length > 0">
      <h3 class="text-label-medium">Angebote</h3>
      <ul class="mt-md text-body-regular">
        <li v-for="quote in request.quotes" :key="quote.id" data-testid="existing-quote">
          {{ (quote.priceCents / 100).toFixed(2) }} € — {{ quote.status }}
          <span v-if="quote.order"> · Bestellung {{ quote.order.orderNumber }}</span>
        </li>
      </ul>
    </PsCard>

    <PsCard v-if="auth.can('quotes:write') && ['new', 'in_review'].includes(request.status)">
      <h3 class="text-label-medium">Angebot erstellen</h3>
      <form
        class="mt-md flex flex-col gap-md"
        data-testid="quote-form"
        @submit.prevent="createQuote"
      >
        <PsInput
          v-model="priceEuros"
          label="Preis (EUR, inkl. Versand)"
          name="price"
          required
          placeholder="89,00"
        />
        <PsTextarea
          v-model="message"
          label="Nachricht an den Kunden (optional)"
          name="message"
          :rows="3"
        />
        <PsButton type="submit" data-testid="send-quote">Angebot senden</PsButton>
      </form>
    </PsCard>
  </div>
</template>
