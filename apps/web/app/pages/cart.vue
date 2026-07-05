<script setup lang="ts">
import { PsButton, PsPillButton, PsPrice, PsSection } from '@print-shop/ui'
import { centsUntilFreeShipping, formatCents } from '@print-shop/utils'
import type { Locale } from '@print-shop/types'

const { t, locale } = useI18n()
const localePath = useLocalePath()
const cart = useCartStore()

onMounted(() => cart.hydrate())

const missingForFree = computed(() => centsUntilFreeShipping(cart.totals.subtotalCents))
/** A voucher can be applied yet contribute nothing (cart dropped below its min order). */
const voucherActive = computed(() => !!cart.voucher && cart.totals.discountCents > 0)

const voucherCode = ref('')
const voucherError = ref('')
const voucherPending = ref(false)

async function applyVoucher() {
  if (!voucherCode.value.trim()) return
  voucherPending.value = true
  voucherError.value = ''
  try {
    const result = await cart.applyVoucher(voucherCode.value)
    if (result.valid) {
      voucherCode.value = ''
    } else {
      voucherError.value = t(`cart.voucherReason.${result.reason}`, {
        amount: formatCents(result.minOrderCents ?? 0, locale.value as Locale),
      })
    }
  } catch {
    voucherError.value = t('common.error')
  } finally {
    voucherPending.value = false
  }
}

function removeVoucher() {
  cart.removeVoucher()
  voucherError.value = ''
}

useSeo({
  title: () => t('seo.cart.title'),
  description: () => t('seo.cart.description'),
})
</script>

<template>
  <PsSection :title="t('cart.title')" heading-level="h1">
    <div v-if="cart.items.length === 0" class="py-3xl text-center" data-testid="cart-empty">
      <p class="text-body-regular text-secondary">{{ t('cart.empty') }}</p>
      <NuxtLink :to="localePath('/products')" class="mt-lg inline-block">
        <PsPillButton>{{ t('cart.browse') }}</PsPillButton>
      </NuxtLink>
    </div>

    <div v-else class="grid gap-2xl lg:grid-cols-[1fr_360px]" data-testid="cart-content">
      <ul class="flex flex-col gap-md">
        <li
          v-for="item in cart.items"
          :key="item.key"
          class="flex items-center gap-md rounded-card border border-subtle bg-surface-elevated p-md"
          data-testid="cart-item"
        >
          <div class="min-w-0 flex-1">
            <p class="truncate text-label-medium">{{ item.name }}</p>
            <p v-if="item.colorNames.length" class="text-caption text-secondary">
              {{ item.colorNames.join(' · ') }}
            </p>
            <PsPrice :cents="item.unitPriceCents" :locale="locale as Locale" size="sm" class="text-secondary" />
          </div>
          <input
            :value="item.quantity"
            type="number"
            min="1"
            max="99"
            class="w-16 rounded-card border border-subtle bg-surface px-sm py-xs text-body-regular"
            :aria-label="t('cart.quantity')"
            data-testid="cart-quantity"
            @change="cart.setQuantity(item.key, Number(($event.target as HTMLInputElement).value))"
          />
          <PsPrice :cents="item.unitPriceCents * item.quantity" :locale="locale as Locale" />
          <NuxtLink
            :to="localePath(`/products/${item.slug}`) + `?edit=${encodeURIComponent(item.key)}`"
            class="text-caption text-brand hover:underline"
            data-testid="cart-edit"
          >
            {{ t('cart.edit') }}
          </NuxtLink>
          <PsButton variant="ghost" size="sm" data-testid="cart-remove" @click="cart.remove(item.key)">
            ✕ <span class="sr-only">{{ t('cart.remove') }}</span>
          </PsButton>
        </li>
      </ul>

      <aside class="h-fit rounded-card border border-subtle bg-surface-elevated p-lg" data-testid="cart-summary">
        <dl class="flex flex-col gap-sm text-body-regular">
          <div class="flex justify-between">
            <dt class="text-secondary">{{ t('cart.subtotal') }}</dt>
            <dd><PsPrice :cents="cart.totals.subtotalCents" :locale="locale as Locale" /></dd>
          </div>
          <div v-if="voucherActive" class="flex justify-between" data-testid="voucher-row">
            <dt class="text-secondary">
              {{ t('cart.voucherLabel', { code: cart.voucher!.code }) }}
              <button
                type="button"
                class="ml-xs text-caption text-brand hover:underline"
                data-testid="voucher-remove"
                @click="removeVoucher"
              >
                {{ t('cart.voucherRemove') }}
              </button>
            </dt>
            <dd class="text-brand" data-testid="cart-discount">
              −{{ formatCents(cart.totals.discountCents, locale as Locale) }}
            </dd>
          </div>
          <div
            v-else-if="cart.voucher"
            class="flex flex-col gap-xs"
            data-testid="voucher-inactive"
          >
            <div class="flex justify-between">
              <dt class="text-secondary">
                {{ t('cart.voucherLabel', { code: cart.voucher.code }) }}
                <button
                  type="button"
                  class="ml-xs text-caption text-brand hover:underline"
                  data-testid="voucher-remove"
                  @click="removeVoucher"
                >
                  {{ t('cart.voucherRemove') }}
                </button>
              </dt>
            </div>
            <p class="text-caption text-red-500" role="alert" data-testid="voucher-inactive-hint">
              {{ t('cart.voucherReason.min_order_not_met', { amount: formatCents(cart.voucher.minOrderCents, locale as Locale) }) }}
            </p>
          </div>
          <div class="flex justify-between">
            <dt class="text-secondary">{{ t('cart.shipping') }}</dt>
            <dd data-testid="cart-shipping">
              <span v-if="cart.totals.shippingCents === 0" class="text-brand">{{ t('cart.shippingFree') }}</span>
              <PsPrice v-else :cents="cart.totals.shippingCents" :locale="locale as Locale" />
            </dd>
          </div>
          <div class="mt-sm flex justify-between border-t border-subtle pt-sm text-label-medium">
            <dt>{{ t('cart.total') }}</dt>
            <dd><PsPrice :cents="cart.totals.totalCents" :locale="locale as Locale" data-testid="cart-total" /></dd>
          </div>
        </dl>
        <p v-if="missingForFree > 0" class="mt-md text-caption text-secondary" data-testid="free-shipping-hint">
          {{ t('cart.freeShippingHint', { amount: formatCents(missingForFree, locale as Locale) }) }}
        </p>
        <form v-if="!cart.voucher" class="mt-md flex gap-sm" @submit.prevent="applyVoucher">
          <input
            v-model="voucherCode"
            type="text"
            :placeholder="t('cart.voucherPlaceholder')"
            :aria-label="t('cart.voucherPlaceholder')"
            class="min-w-0 flex-1 rounded-card border border-subtle bg-surface px-sm py-xs text-body-regular uppercase"
            data-testid="voucher-input"
          />
          <PsButton type="submit" variant="secondary" size="sm" :disabled="voucherPending" data-testid="voucher-apply">
            {{ t('cart.voucherApply') }}
          </PsButton>
        </form>
        <p v-if="voucherError" class="mt-sm text-caption text-red-500" role="alert" data-testid="voucher-error">
          {{ voucherError }}
        </p>
        <NuxtLink :to="localePath('/checkout')" class="mt-lg block">
          <PsPillButton size="lg" class="w-full" data-testid="to-checkout">
            {{ t('cart.checkout') }}
          </PsPillButton>
        </NuxtLink>
      </aside>
    </div>
  </PsSection>
</template>
