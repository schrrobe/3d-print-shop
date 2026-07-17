<script setup lang="ts">
import { PsCheckoutSummary, PsInput, PsPillButton, PsSection, PsTextarea } from '@print-shop/ui'
import { formatCents } from '@print-shop/utils'
import type { Locale } from '@print-shop/types'

/**
 * Checkout — deliberately animation-free (design rule: no strong animations
 * in the checkout). Guest checkout, no account required.
 */
const { t, locale } = useI18n()
const localePath = useLocalePath()
const cart = useCartStore()
const router = useRouter()
type CheckoutPaymentMethod = 'stripe' | 'bank_transfer' | 'bitcoin'
const paymentMethods = ref<CheckoutPaymentMethod[]>(['stripe', 'bank_transfer'])

useSeo({
  title: () => t('seo.checkout.title'),
  description: () => t('seo.checkout.description'),
})
useHead({ meta: [{ name: 'robots', content: 'noindex' }] })

onMounted(() => {
  cart.hydrate()
  if (cart.items.length === 0) router.replace(localePath('/cart'))
  void $fetch<{ methods: CheckoutPaymentMethod[] }>('/api/payments/methods')
    .then((config) => {
      paymentMethods.value = config.methods
    })
    .catch(() => {
      // Fail closed to the two production-supported methods.
    })
})

const form = reactive({
  firstName: '',
  lastName: '',
  company: '',
  street: '',
  zip: '',
  city: '',
  country: 'DE',
  email: '',
  phone: '',
  note: '',
})
const paymentMethod = ref<CheckoutPaymentMethod>('stripe')
const checkoutKey = ref<string | null>(null)
const submitting = ref(false)
const hydrated = ref(false)
const tracking = useTracking()
onMounted(() => {
  hydrated.value = true
  tracking.track('begin_checkout', {
    itemCount: cart.count,
    subtotalCents: cart.totals.subtotalCents,
  })
})
const errorMessage = ref('')

interface CheckoutResponse {
  orderNumber: string
  accessToken: string
  payment: { method: string; redirectUrl?: string }
}

async function submit() {
  submitting.value = true
  errorMessage.value = ''
  try {
    checkoutKey.value ??= crypto.randomUUID()
    // Give the ingest endpoint a bounded chance to persist the session before
    // checkout links it. Tracking failure must never block order placement.
    await Promise.race([
      tracking.flush(),
      new Promise<void>((resolve) => window.setTimeout(resolve, 1000)),
    ])
    const trackingSessionId = tracking.sessionId()
    const response = await $fetch<CheckoutResponse>('/api/checkout', {
      method: 'POST',
      headers: {
        'Idempotency-Key': checkoutKey.value,
        ...(trackingSessionId ? { 'x-tracking-session': trackingSessionId } : {}),
      },
      body: {
        items: cart.toCheckoutItems(),
        address: {
          firstName: form.firstName,
          lastName: form.lastName,
          company: form.company || undefined,
          street: form.street,
          zip: form.zip,
          city: form.city,
          country: form.country,
          email: form.email,
          phone: form.phone || undefined,
        },
        note: form.note || undefined,
        paymentMethod: paymentMethod.value,
        locale: locale.value,
        voucherCode: cart.voucher?.code,
      },
    })
    checkoutKey.value = null
    cart.clear()
    if (response.payment.method === 'stripe' && response.payment.redirectUrl) {
      // Mock mode redirects straight to the success page; real Stripe goes to stripe.com
      window.location.href = response.payment.redirectUrl
    } else {
      await router.push(localePath(`/order/${response.orderNumber}?token=${response.accessToken}`))
    }
  } catch (err) {
    // Stale voucher from localStorage (expired/exhausted meanwhile): drop it,
    // show the specific message, let the customer resubmit without the code.
    const rejection = (err as { data?: { details?: { voucherRejection?: string } } })?.data?.details
      ?.voucherRejection
    if (rejection && cart.voucher) {
      cart.removeVoucher()
      errorMessage.value = t(`cart.voucherReason.${rejection}`, { amount: '' })
    } else {
      errorMessage.value = t('common.error')
    }
    console.error(err)
  } finally {
    submitting.value = false
  }
}

const paymentOptions = computed(() => {
  const options = {
    stripe: { value: 'stripe' as const, label: t('checkout.payStripe') },
    bank_transfer: { value: 'bank_transfer' as const, label: t('checkout.payBank') },
    bitcoin: { value: 'bitcoin' as const, label: t('checkout.payBitcoin') },
  }
  return paymentMethods.value.map((method) => options[method])
})

watchEffect(() => {
  if (!paymentMethods.value.includes(paymentMethod.value)) {
    paymentMethod.value = paymentMethods.value[0] ?? 'bank_transfer'
  }
})
</script>

<template>
  <PsSection :title="t('checkout.title')">
    <form
      class="grid gap-2xl lg:grid-cols-[1fr_380px]"
      data-testid="checkout-form"
      @submit.prevent="submit"
    >
      <div class="flex flex-col gap-lg">
        <p class="text-caption text-secondary">{{ t('checkout.guestHint') }}</p>
        <h2 class="text-heading-small">{{ t('checkout.contact') }}</h2>
        <div class="grid gap-md sm:grid-cols-2">
          <PsInput
            v-model="form.firstName"
            :label="t('checkout.firstName')"
            name="firstName"
            required
            autocomplete="given-name"
          />
          <PsInput
            v-model="form.lastName"
            :label="t('checkout.lastName')"
            name="lastName"
            required
            autocomplete="family-name"
          />
        </div>
        <PsInput
          v-model="form.company"
          :label="t('checkout.company')"
          name="company"
          autocomplete="organization"
        />
        <PsInput
          v-model="form.street"
          :label="t('checkout.street')"
          name="street"
          required
          autocomplete="street-address"
        />
        <div class="grid gap-md sm:grid-cols-[140px_1fr_120px]">
          <PsInput
            v-model="form.zip"
            :label="t('checkout.zip')"
            name="zip"
            required
            autocomplete="postal-code"
          />
          <PsInput
            v-model="form.city"
            :label="t('checkout.city')"
            name="city"
            required
            autocomplete="address-level2"
          />
          <PsInput
            v-model="form.country"
            :label="t('checkout.country')"
            name="country"
            required
            autocomplete="country"
          />
        </div>
        <div class="grid gap-md sm:grid-cols-2">
          <PsInput
            v-model="form.email"
            :label="t('checkout.email')"
            type="email"
            name="email"
            required
            autocomplete="email"
          />
          <PsInput
            v-model="form.phone"
            :label="t('checkout.phone')"
            type="tel"
            name="phone"
            autocomplete="tel"
          />
        </div>
        <PsTextarea v-model="form.note" :label="t('checkout.note')" name="note" :rows="3" />

        <h2 class="mt-md text-heading-small">{{ t('checkout.payment') }}</h2>
        <div class="flex flex-col gap-sm" role="radiogroup" :aria-label="t('checkout.payment')">
          <label
            v-for="option in paymentOptions"
            :key="option.value"
            class="flex cursor-pointer items-center gap-md rounded-card border p-md transition-colors"
            :class="
              paymentMethod === option.value
                ? 'border-brand bg-brand/5'
                : 'border-subtle bg-surface-elevated'
            "
            :data-testid="`payment-${option.value}`"
          >
            <input
              v-model="paymentMethod"
              type="radio"
              name="paymentMethod"
              :value="option.value"
              class="accent-(--brand)"
            />
            <span class="text-label-medium">{{ option.label }}</span>
          </label>
        </div>
      </div>

      <aside
        class="flex h-fit flex-col gap-lg rounded-card border border-subtle bg-surface-elevated p-lg"
      >
        <h2 class="text-label-medium">{{ t('checkout.summary') }}</h2>
        <PsCheckoutSummary
          :items="
            cart.items.map((i) => ({
              name: i.name,
              quantity: i.quantity,
              unitPriceCents: i.unitPriceCents,
            }))
          "
          :subtotal-cents="cart.totals.subtotalCents"
          :shipping-cents="cart.totals.shippingCents"
          :discount-cents="cart.totals.discountCents"
          :discount-label="
            cart.voucher ? t('cart.voucherLabel', { code: cart.voucher.code }) : undefined
          "
          :total-cents="cart.totals.totalCents"
          :free-shipping-applied="cart.totals.freeShippingApplied"
          :locale="locale as Locale"
        />
        <p
          v-if="cart.voucher && cart.totals.discountCents === 0"
          class="text-caption text-red-500"
          role="alert"
          data-testid="checkout-voucher-inactive-hint"
        >
          {{
            t('cart.voucherReason.min_order_not_met', {
              amount: formatCents(cart.voucher.minOrderCents, locale as Locale),
            })
          }}
        </p>
        <p
          v-if="errorMessage"
          class="text-caption text-red-500"
          role="alert"
          data-testid="checkout-error"
        >
          {{ errorMessage }}
        </p>
        <PsPillButton
          type="submit"
          size="lg"
          :disabled="submitting || !hydrated"
          data-testid="submit-order"
        >
          {{ t('checkout.submit') }}
        </PsPillButton>
      </aside>
    </form>
  </PsSection>
</template>
