<script setup lang="ts">
import { PsBadge, PsInput, PsPillButton, PsPrice, PsSection } from '@print-shop/ui'

/** Public quote page — customer accepts (→ payment link) or declines. */
const { t, locale } = useI18n()
const route = useRoute()

const token = String(route.params.token)

interface QuoteView {
  status: string
  priceCents: number
  message: string | null
  validUntil: string
  expired: boolean
  request: { name: string; description: string; quantity: number }
}

const { data, error, refresh } = await useFetch<{ quote: QuoteView }>(`/api/quotes/${token}`)
if (error.value) {
  throw createError({ statusCode: 404, statusMessage: 'Quote not found' })
}

const quote = computed(() => data.value!.quote)
const showAddressForm = ref(false)
const submitting = ref(false)
const hydrated = ref(false)
onMounted(() => {
  hydrated.value = true
})
const paymentUrl = ref('')
const declined = ref(false)

const address = reactive({
  firstName: '',
  lastName: '',
  company: '',
  street: '',
  zip: '',
  city: '',
  country: 'DE',
  email: '',
})

async function accept() {
  submitting.value = true
  try {
    const result = await $fetch<{ paymentUrl: string }>(`/api/quotes/${token}/accept`, {
      method: 'POST',
      body: {
        address: {
          ...address,
          company: address.company || undefined,
        },
      },
    })
    paymentUrl.value = result.paymentUrl
    await refresh()
  } finally {
    submitting.value = false
  }
}

async function decline() {
  submitting.value = true
  try {
    await $fetch(`/api/quotes/${token}/decline`, { method: 'POST' })
    declined.value = true
    await refresh()
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <PsSection :title="t('quote.title')">
    <div class="mx-auto max-w-xl" data-testid="quote-page">
      <div class="rounded-card border border-subtle bg-surface-elevated p-lg">
        <div class="flex items-center justify-between">
          <span class="text-body-regular text-secondary">{{ t('quote.price') }}</span>
          <PsPrice :cents="quote.priceCents" size="lg" class="text-brand" data-testid="quote-price" />
        </div>
        <p class="mt-sm text-caption text-secondary">
          {{ t('quote.validUntil') }}: {{ new Date(quote.validUntil).toLocaleDateString(locale) }}
        </p>
        <p v-if="quote.message" class="mt-md rounded-card bg-surface p-md text-body-regular">
          {{ quote.message }}
        </p>
        <p class="mt-md text-body-regular text-secondary">{{ quote.request.description }}</p>
      </div>

      <div v-if="quote.expired" class="mt-lg" data-testid="quote-expired">
        <PsBadge variant="danger">{{ t('quote.expired') }}</PsBadge>
      </div>

      <div v-else-if="declined || quote.status === 'declined'" class="mt-lg" data-testid="quote-declined">
        <PsBadge variant="default">{{ t('quote.declined') }}</PsBadge>
      </div>

      <div v-else-if="paymentUrl || quote.status === 'accepted'" class="mt-lg" data-testid="quote-accepted">
        <p class="text-body-regular">{{ t('quote.accepted') }}</p>
        <a v-if="paymentUrl" :href="paymentUrl" class="mt-md inline-block" data-testid="quote-pay-link">
          <PsPillButton size="lg">{{ t('quote.payNow') }}</PsPillButton>
        </a>
      </div>

      <template v-else-if="quote.status === 'sent'">
        <div v-if="!showAddressForm" class="mt-2xl flex gap-md">
          <PsPillButton size="lg" data-testid="quote-accept" @click="showAddressForm = true">
            {{ t('quote.accept') }}
          </PsPillButton>
          <PsPillButton size="lg" variant="secondary" :disabled="submitting || !hydrated" data-testid="quote-decline" @click="decline">
            {{ t('quote.decline') }}
          </PsPillButton>
        </div>

        <form v-else class="mt-2xl flex flex-col gap-md" data-testid="quote-address-form" @submit.prevent="accept">
          <h2 class="text-heading-small">{{ t('quote.addressTitle') }}</h2>
          <div class="grid gap-md sm:grid-cols-2">
            <PsInput v-model="address.firstName" :label="t('checkout.firstName')" required />
            <PsInput v-model="address.lastName" :label="t('checkout.lastName')" required />
          </div>
          <PsInput v-model="address.street" :label="t('checkout.street')" required />
          <div class="grid gap-md sm:grid-cols-[140px_1fr_120px]">
            <PsInput v-model="address.zip" :label="t('checkout.zip')" required />
            <PsInput v-model="address.city" :label="t('checkout.city')" required />
            <PsInput v-model="address.country" :label="t('checkout.country')" required />
          </div>
          <PsInput v-model="address.email" :label="t('checkout.email')" type="email" required />
          <PsPillButton type="submit" size="lg" :disabled="submitting || !hydrated" data-testid="quote-accept-submit">
            {{ t('quote.accept') }}
          </PsPillButton>
        </form>
      </template>
    </div>
  </PsSection>
</template>
