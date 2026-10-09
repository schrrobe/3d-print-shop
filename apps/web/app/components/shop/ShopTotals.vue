<script setup lang="ts">
import {
  centsUntilFreeShipping,
  FREE_SHIPPING_THRESHOLD_CENTS,
  formatCents,
} from '@print-shop/utils'
import type { Locale } from '@print-shop/types'

/** Totals ledger shared by cart and checkout; `prefix` keeps both pages' test ids stable. */
const props = defineProps<{ prefix: 'cart' | 'checkout' }>()

const { t, locale } = useI18n()
const cart = useCartStore()
const money = (cents: number) => formatCents(cents, locale.value as Locale)

const missingForFree = computed(() => centsUntilFreeShipping(cart.totals.subtotalCents))
const progress = computed(() =>
  Math.min(100, Math.round((cart.totals.subtotalCents / FREE_SHIPPING_THRESHOLD_CENTS) * 100)),
)
const voucherActive = computed(() => !!cart.voucher && cart.totals.discountCents > 0)
</script>

<template>
  <div>
    <dl class="kb-num flex flex-col">
      <div class="flex justify-between gap-4 py-2">
        <dt class="text-ink-2">{{ t('cart.subtotal') }}</dt>
        <dd>{{ money(cart.totals.subtotalCents) }}</dd>
      </div>
      <div
        v-if="cart.voucher"
        class="flex justify-between gap-4 py-2"
        :data-testid="voucherActive ? 'voucher-row' : 'voucher-inactive'"
      >
        <dt class="text-ink-2">
          {{ t('cart.voucherLabel', { code: cart.voucher.code }) }}
          <button
            type="button"
            class="ml-1 min-h-11 px-1 text-sm font-semibold text-ink underline decoration-rule-strong underline-offset-4 hover:decoration-hit"
            data-testid="voucher-remove"
            @click="cart.removeVoucher()"
          >
            {{ t('cart.voucherRemove') }}
          </button>
        </dt>
        <dd
          v-if="voucherActive"
          class="font-semibold text-ok"
          :data-testid="`${props.prefix}-discount`"
        >
          −{{ money(cart.totals.discountCents) }}
        </dd>
      </div>
      <div class="flex justify-between gap-4 py-2">
        <dt class="text-ink-2">{{ t('cart.shipping') }}</dt>
        <dd :data-testid="`${props.prefix}-shipping`">
          <span v-if="cart.totals.shippingCents === 0" class="font-semibold text-ok">{{
            t('cart.shippingFree')
          }}</span>
          <template v-else>{{ money(cart.totals.shippingCents) }}</template>
        </dd>
      </div>
      <div class="mt-2 flex items-baseline justify-between gap-4 border-t-2 border-ink pt-3">
        <dt class="font-bold">{{ t('cart.total') }}</dt>
        <dd class="text-[1.5rem] font-bold" :data-testid="`${props.prefix}-total`">
          {{ money(cart.totals.totalCents) }}
        </dd>
      </div>
    </dl>
    <p class="mt-1 text-sm text-ink-2">{{ t('shop.totals.vatNote') }}</p>

    <p
      v-if="cart.voucher && !voucherActive"
      class="kb-error"
      role="alert"
      :data-testid="
        props.prefix === 'cart' ? 'voucher-inactive-hint' : 'checkout-voucher-inactive-hint'
      "
    >
      {{ t('cart.voucherReason.min_order_not_met', { amount: money(cart.voucher.minOrderCents) }) }}
    </p>

    <div v-if="missingForFree > 0" class="mt-4" data-testid="free-shipping-hint">
      <p class="text-sm">{{ t('cart.freeShippingHint', { amount: money(missingForFree) }) }}</p>
      <div class="mt-2 h-1.5 bg-paper-sunk" aria-hidden="true">
        <div
          class="h-full bg-ink transition-[width] duration-300"
          :style="{ width: `${progress}%` }"
        />
      </div>
    </div>
  </div>
</template>
