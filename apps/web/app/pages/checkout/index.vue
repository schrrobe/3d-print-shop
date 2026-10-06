<script setup lang="ts">
import { canLoadTracker, formatCents } from '@print-shop/utils'
import type { Locale } from '@print-shop/types'

/**
 * Checkout — deliberately animation-free (design rule: no strong animations
 * in the checkout). Guest checkout, no account required. One page, three numbered
 * sections; validation runs on submit and reports per field.
 */
const { t, locale } = useI18n()
const localePath = useLocalePath()
const cart = useCartStore()
const consentStore = useConsentStore()
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
  consentStore.hydrate()
  if (cart.items.length === 0) router.replace(localePath('/cart'))
  void $fetch<{ methods: CheckoutPaymentMethod[] }>('/api/payments/methods')
    .then((config) => {
      paymentMethods.value = config.methods
    })
    .catch(() => {
      // Fail closed to the two production-supported methods.
    })
})

// ponytail: fixed delivery-country list; move to config/API when shipping rates differ per country
const COUNTRIES = ['DE', 'AT', 'CH', 'NL', 'BE', 'LU', 'FR', 'DK', 'PL', 'CZ', 'IT', 'ES'] as const
const countryOptions = computed(() => {
  const names = new Intl.DisplayNames([locale.value], { type: 'region' })
  return COUNTRIES.map((code) => ({ code, name: names.of(code) ?? code }))
})

const form = reactive({
  email: '',
  phone: '',
  firstName: '',
  lastName: '',
  company: '',
  street: '',
  zip: '',
  city: '',
  country: 'DE',
  note: '',
})
const isGift = ref(false)
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

type Field = 'email' | 'firstName' | 'lastName' | 'street' | 'zip' | 'city'
const errors = reactive<Partial<Record<Field, string>>>({})
const FIELD_ORDER: Field[] = ['email', 'firstName', 'lastName', 'street', 'zip', 'city']

function validate(): boolean {
  for (const key of FIELD_ORDER) delete errors[key]
  const required: Field[] = ['email', 'firstName', 'lastName', 'street', 'zip', 'city']
  for (const key of required) {
    if (!form[key].trim()) errors[key] = t(`shop.checkout.errors.${key}`)
  }
  if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
    errors.email = t('shop.checkout.errors.emailFormat')
  }
  const zip = form.zip.trim()
  if (zip && (zip.length < 3 || zip.length > 12)) errors.zip = t('shop.checkout.errors.zipFormat')
  const first = FIELD_ORDER.find((key) => errors[key])
  if (first) {
    errorMessage.value = t('shop.checkout.errors.summary', { count: Object.keys(errors).length })
    nextTick(() => document.querySelector<HTMLInputElement>(`[name="${first}"]`)?.focus())
    return false
  }
  return true
}

interface CheckoutResponse {
  orderNumber: string
  accessToken: string
  payment: { method: string; redirectUrl?: string }
}

async function submit() {
  errorMessage.value = ''
  if (!validate()) return
  submitting.value = true
  try {
    checkoutKey.value ??= crypto.randomUUID()
    // Give the ingest endpoint a bounded chance to persist the session before
    // checkout links it. Tracking failure must never block order placement.
    await Promise.race([
      tracking.flush(),
      new Promise<void>((resolve) => window.setTimeout(resolve, 1000)),
    ])
    const trackingSessionId = tracking.sessionId()
    // Gift flag travels in the order note so production sees it without a schema change
    const note = [isGift.value ? '[Geschenk]' : '', form.note.trim()].filter(Boolean).join(' ')
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
        note: note || undefined,
        paymentMethod: paymentMethod.value,
        locale: locale.value,
        voucherCode: cart.voucher?.code,
        // Consent snapshot at order time — canLoadTracker also rejects stale
        // CONSENT_VERSION, so outdated consent never reaches the server events.
        consent: {
          statistics: canLoadTracker('statistics', consentStore.consent),
          marketing: canLoadTracker('marketing', consentStore.consent),
        },
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
    stripe: {
      value: 'stripe' as const,
      label: t('checkout.payStripe'),
      hint: t('shop.checkout.payHints.stripe'),
    },
    bank_transfer: {
      value: 'bank_transfer' as const,
      label: t('checkout.payBank'),
      hint: t('shop.checkout.payHints.bank_transfer'),
    },
    bitcoin: {
      value: 'bitcoin' as const,
      label: t('checkout.payBitcoin'),
      hint: t('shop.checkout.payHints.bitcoin'),
    },
  }
  return paymentMethods.value.map((method) => options[method])
})

watchEffect(() => {
  if (!paymentMethods.value.includes(paymentMethod.value)) {
    paymentMethod.value = paymentMethods.value[0] ?? 'bank_transfer'
  }
})

const money = (cents: number) => formatCents(cents, locale.value as Locale)
const summaryOpen = ref(false)
</script>

<template>
  <div class="kb-wrap pb-16 pt-8 md:pb-24 md:pt-12">
    <h1 class="kb-display text-[3rem] sm:text-[4rem]">{{ t('checkout.title') }}</h1>
    <p class="mt-2 flex items-center gap-2 text-ink-2">
      <ShopIcon name="lock" :size="16" />
      {{ t('checkout.guestHint') }}
    </p>

    <!-- Mobile: collapsible order summary above the form -->
    <details
      class="mt-6 border-y border-ink lg:hidden"
      :open="summaryOpen"
      @toggle="summaryOpen = ($event.target as HTMLDetailsElement).open"
    >
      <summary
        class="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 [&::-webkit-details-marker]:hidden"
      >
        <span class="flex items-center gap-2 font-semibold">
          <ShopIcon name="chevron-down" :size="18" :class="summaryOpen ? 'rotate-180' : ''" />
          {{ summaryOpen ? t('shop.checkout.hideSummary') : t('shop.checkout.showSummary') }}
        </span>
        <span class="kb-num text-[1.125rem] font-bold">{{ money(cart.totals.totalCents) }}</span>
      </summary>
      <div class="pb-5">
        <ul class="divide-y divide-rule border-b border-rule">
          <li v-for="item in cart.items" :key="item.key" class="flex justify-between gap-3 py-3">
            <span>
              <span class="kb-num">{{ item.quantity }}×</span> {{ item.name }}
              <span v-if="item.colorNames.length" class="block text-sm text-ink-2">{{
                item.colorNames.join(' · ')
              }}</span>
            </span>
            <span class="kb-num">{{ money(item.unitPriceCents * item.quantity) }}</span>
          </li>
        </ul>
      </div>
    </details>

    <form
      class="mt-8 grid gap-10 lg:grid-cols-[1fr_24rem] lg:gap-14"
      novalidate
      data-testid="checkout-form"
      @submit.prevent="submit"
    >
      <div class="flex flex-col gap-12">
        <!-- 1 Contact -->
        <fieldset class="min-w-0">
          <legend class="flex w-full items-baseline gap-3 border-b border-ink pb-3">
            <span class="kb-display text-[2rem] text-hit" aria-hidden="true">1</span>
            <span class="kb-heading text-[1.5rem]">{{ t('shop.checkout.contactTitle') }}</span>
          </legend>
          <div class="mt-5 grid gap-5 sm:grid-cols-2">
            <ShopField
              v-model="form.email"
              :label="t('checkout.email')"
              :error="errors.email"
              :hint="t('shop.checkout.emailHint')"
              type="email"
              name="email"
              autocomplete="email"
              inputmode="email"
              autocapitalize="off"
              spellcheck="false"
              required
              class="sm:col-span-2"
            />
            <ShopField
              v-model="form.phone"
              :label="t('shop.checkout.phone')"
              optional
              type="tel"
              name="phone"
              autocomplete="tel"
              inputmode="tel"
            />
          </div>
        </fieldset>

        <!-- 2 Address -->
        <fieldset class="min-w-0">
          <legend class="flex w-full items-baseline gap-3 border-b border-ink pb-3">
            <span class="kb-display text-[2rem] text-hit" aria-hidden="true">2</span>
            <span class="kb-heading text-[1.5rem]">{{ t('shop.checkout.addressTitle') }}</span>
          </legend>
          <div class="mt-5 grid gap-5 sm:grid-cols-6">
            <ShopField
              v-model="form.firstName"
              :label="t('checkout.firstName')"
              :error="errors.firstName"
              name="firstName"
              autocomplete="given-name"
              required
              class="sm:col-span-3"
            />
            <ShopField
              v-model="form.lastName"
              :label="t('checkout.lastName')"
              :error="errors.lastName"
              name="lastName"
              autocomplete="family-name"
              required
              class="sm:col-span-3"
            />
            <ShopField
              v-model="form.company"
              :label="t('shop.checkout.company')"
              optional
              name="company"
              autocomplete="organization"
              class="sm:col-span-6"
            />
            <ShopField
              v-model="form.street"
              :label="t('checkout.street')"
              :error="errors.street"
              name="street"
              autocomplete="street-address"
              required
              class="sm:col-span-6"
            />
            <ShopField
              v-model="form.zip"
              :label="t('checkout.zip')"
              :error="errors.zip"
              name="zip"
              autocomplete="postal-code"
              inputmode="numeric"
              required
              class="sm:col-span-2"
            />
            <ShopField
              v-model="form.city"
              :label="t('checkout.city')"
              :error="errors.city"
              name="city"
              autocomplete="address-level2"
              required
              class="sm:col-span-4"
            />
            <div class="sm:col-span-6">
              <label for="checkout-country" class="kb-label">{{ t('checkout.country') }}</label>
              <select
                id="checkout-country"
                v-model="form.country"
                name="country"
                autocomplete="country"
                class="kb-input"
                required
              >
                <option v-for="c in countryOptions" :key="c.code" :value="c.code">
                  {{ c.name }}
                </option>
              </select>
            </div>
          </div>
        </fieldset>

        <!-- 3 Payment -->
        <fieldset class="min-w-0">
          <legend class="flex w-full items-baseline gap-3 border-b border-ink pb-3">
            <span class="kb-display text-[2rem] text-hit" aria-hidden="true">3</span>
            <span class="kb-heading text-[1.5rem]">{{ t('checkout.payment') }}</span>
          </legend>
          <div class="mt-5 flex flex-col gap-2">
            <label
              v-for="option in paymentOptions"
              :key="option.value"
              class="flex min-h-16 cursor-pointer items-center gap-4 border px-4 py-3 transition-colors has-[:checked]:border-ink has-[:checked]:bg-paper-raised has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-hit"
              :class="paymentMethod === option.value ? 'border-ink' : 'border-rule-strong'"
              :data-testid="`payment-${option.value}`"
            >
              <input
                v-model="paymentMethod"
                type="radio"
                name="paymentMethod"
                :value="option.value"
                class="size-5 shrink-0"
              />
              <span>
                <span class="block font-bold">{{ option.label }}</span>
                <span class="block text-sm text-ink-2">{{ option.hint }}</span>
              </span>
            </label>
          </div>

          <label class="mt-8 flex cursor-pointer items-start gap-3">
            <input
              v-model="isGift"
              type="checkbox"
              name="isGift"
              class="mt-0.5 size-5 shrink-0"
              data-testid="checkout-gift"
            />
            <span>
              <span class="flex items-center gap-2 font-bold"
                ><ShopIcon name="gift" :size="18" />{{ t('shop.checkout.gift') }}</span
              >
              <span class="block text-sm text-ink-2">{{ t('shop.checkout.giftHint') }}</span>
            </span>
          </label>

          <div class="mt-6">
            <label for="checkout-note" class="kb-label">
              {{ t('shop.checkout.note') }}
              <span class="font-normal text-ink-2">({{ t('shop.form.optional') }})</span>
            </label>
            <textarea
              id="checkout-note"
              v-model="form.note"
              name="note"
              rows="3"
              maxlength="900"
              class="kb-input min-h-24 resize-y"
            />
          </div>
        </fieldset>
      </div>

      <aside
        class="flex h-fit flex-col gap-6 bg-paper-raised p-5 outline outline-1 outline-rule md:p-6 lg:sticky lg:top-24"
      >
        <h2 class="kb-heading hidden text-[1.5rem] lg:block">{{ t('checkout.summary') }}</h2>
        <ul class="hidden divide-y divide-rule border-y border-rule lg:block">
          <li v-for="item in cart.items" :key="item.key" class="flex justify-between gap-3 py-3">
            <span>
              <span class="kb-num">{{ item.quantity }}×</span> {{ item.name }}
              <span v-if="item.colorNames.length" class="block text-sm text-ink-2">{{
                item.colorNames.join(' · ')
              }}</span>
            </span>
            <span class="kb-num">{{ money(item.unitPriceCents * item.quantity) }}</span>
          </li>
        </ul>
        <ShopTotals prefix="checkout" />
        <ShopVoucherForm />

        <p
          v-if="errorMessage"
          class="kb-error flex gap-2"
          role="alert"
          data-testid="checkout-error"
        >
          <ShopIcon name="alert" :size="18" class="mt-0.5" />
          {{ errorMessage }}
        </p>

        <p class="text-sm text-ink-2" data-testid="checkout-legal">
          <i18n-t keypath="shop.checkout.legal" tag="span" scope="global">
            <template #terms>
              <NuxtLink
                :to="localePath('/legal/terms')"
                target="_blank"
                class="text-ink underline"
                >{{ t('footer.terms') }}</NuxtLink
              >
            </template>
            <template #withdrawal>
              <NuxtLink
                :to="localePath('/legal/withdrawal')"
                target="_blank"
                class="text-ink underline"
                >{{ t('shop.checkout.withdrawalLink') }}</NuxtLink
              >
            </template>
            <template #privacy>
              <NuxtLink
                :to="localePath('/legal/privacy')"
                target="_blank"
                class="text-ink underline"
                >{{ t('footer.privacy') }}</NuxtLink
              >
            </template>
          </i18n-t>
        </p>

        <button
          type="submit"
          class="kb-btn kb-btn-hit w-full text-[1.0625rem]"
          :disabled="submitting || !hydrated"
          :aria-busy="submitting"
          data-testid="submit-order"
        >
          <span
            v-if="submitting"
            class="size-4 animate-spin rounded-full border-2 border-current border-t-transparent"
            aria-hidden="true"
          />
          {{ t('checkout.submit') }}
        </button>
      </aside>
    </form>
  </div>
</template>
