<script setup lang="ts">
/** Landing page after (mock or real) Stripe payment. */
const { t } = useI18n()
const route = useRoute()
const localePath = useLocalePath()

useHead({
  title: () => t('success.title'),
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
  <div
    class="kb-wrap grid gap-10 pb-16 pt-10 md:grid-cols-[minmax(0,20rem)_1fr] md:items-center md:gap-16 md:pb-24 md:pt-16"
    data-testid="checkout-success"
  >
    <div class="mx-auto w-full max-w-[14rem] md:max-w-none">
      <ShopTarget :label="t('shop.success.hit')" />
    </div>
    <div>
      <h1 class="kb-display text-[3rem] sm:text-[4rem]">{{ t('success.title') }}</h1>
      <dl class="mt-6 border-y border-ink py-4">
        <dt class="kb-tick text-ink-2">{{ t('success.orderNumber') }}</dt>
        <dd class="kb-num mt-1 text-[1.75rem] font-bold" data-testid="order-number">
          {{ orderNumber }}
        </dd>
      </dl>
      <p class="mt-4 max-w-[52ch] text-ink-2">{{ t('success.emailHint') }}</p>
      <div class="mt-8 flex flex-wrap gap-3">
        <NuxtLink
          :to="localePath(`/order/${orderNumber}?token=${token}`)"
          class="kb-btn kb-btn-hit"
          data-testid="view-order"
        >
          {{ t('success.viewOrder') }}
          <ShopIcon name="arrow-right" />
        </NuxtLink>
        <button
          v-if="mockSession && !simulated"
          type="button"
          class="kb-btn kb-btn-line"
          data-testid="simulate-payment"
          @click="simulatePayment"
        >
          {{ t('success.simulatePayment') }}
        </button>
      </div>
    </div>
  </div>
</template>
