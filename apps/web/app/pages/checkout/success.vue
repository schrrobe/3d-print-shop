<script setup lang="ts">
import { PsPillButton, PsSection } from '@print-shop/ui'

/** Landing page after (mock or real) Stripe payment. */
const { t } = useI18n()
const route = useRoute()
const localePath = useLocalePath()

useHead({
  meta: [
    { name: 'robots', content: 'noindex, nofollow' },
    { name: 'referrer', content: 'no-referrer' },
  ],
})

const orderNumber = computed(() => String(route.query.order ?? ''))
const token = computed(() => String(route.query.token ?? ''))
const mockSession = computed(() => (route.query.mock ? String(route.query.session ?? '') : ''))
const simulated = ref(false)

/** Dev/mock mode: complete the fake Stripe session so the flow continues. */
async function simulatePayment() {
  if (!mockSession.value) return
  await $fetch(`/api/dev/stripe/complete/${mockSession.value}`, { method: 'POST' })
  simulated.value = true
}
</script>

<template>
  <PsSection>
    <div class="mx-auto max-w-[36rem] py-3xl text-center" data-testid="checkout-success">
      <h1 class="text-heading-large">{{ t('success.title') }}</h1>
      <p class="mt-lg text-body-regular text-secondary">
        {{ t('success.orderNumber') }}:
        <strong data-testid="order-number">{{ orderNumber }}</strong>
      </p>
      <p class="mt-sm text-body-regular text-secondary">{{ t('success.emailHint') }}</p>
      <div class="mt-2xl flex flex-wrap justify-center gap-md">
        <PsPillButton
          v-if="mockSession && !simulated"
          variant="secondary"
          data-testid="simulate-payment"
          @click="simulatePayment"
        >
          {{ t('success.simulatePayment') }}
        </PsPillButton>
        <NuxtLink :to="localePath(`/order/${orderNumber}?token=${token}`)">
          <PsPillButton data-testid="view-order">{{ t('success.viewOrder') }}</PsPillButton>
        </NuxtLink>
      </div>
    </div>
  </PsSection>
</template>
