<script setup lang="ts">
import { PsButton, PsPillButton, PsPrice, PsSection } from '@print-shop/ui'
import { centsUntilFreeShipping, formatCents } from '@print-shop/utils'
import type { Locale } from '@print-shop/types'

const { t, locale } = useI18n()
const localePath = useLocalePath()
const cart = useCartStore()

onMounted(() => cart.hydrate())

const missingForFree = computed(() => centsUntilFreeShipping(cart.totals.subtotalCents))
</script>

<template>
  <PsSection :title="t('cart.title')">
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
        <NuxtLink :to="localePath('/checkout')" class="mt-lg block">
          <PsPillButton size="lg" class="w-full" data-testid="to-checkout">
            {{ t('cart.checkout') }}
          </PsPillButton>
        </NuxtLink>
      </aside>
    </div>
  </PsSection>
</template>
