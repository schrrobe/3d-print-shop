<script setup lang="ts">
import type { Locale } from '@print-shop/types'
import PsPrice from './PsPrice.vue'

withDefaults(
  defineProps<{
    items: { name: string; quantity: number; unitPriceCents: number }[]
    subtotalCents: number
    shippingCents: number
    totalCents: number
    locale?: Locale
    freeShippingApplied?: boolean
  }>(),
  { locale: 'de', freeShippingApplied: false },
)
</script>

<template>
  <div class="flex flex-col gap-sm" data-testid="checkout-summary">
    <div
      v-for="(item, index) in items"
      :key="`${item.name}-${index}`"
      class="flex items-center justify-between gap-md border-b border-subtle pb-sm text-body-regular text-primary"
    >
      <span>
        {{ item.name }}
        <span class="text-secondary">× {{ item.quantity }}</span>
      </span>
      <PsPrice :cents="item.unitPriceCents * item.quantity" :locale="locale" size="sm" />
    </div>
    <div class="flex items-center justify-between gap-md text-body-regular text-secondary">
      <span>Zwischensumme</span>
      <PsPrice :cents="subtotalCents" :locale="locale" size="sm" />
    </div>
    <div class="flex items-center justify-between gap-md text-body-regular text-secondary">
      <span>Versandkosten</span>
      <span
        v-if="shippingCents === 0 && freeShippingApplied"
        class="text-caption font-semibold text-brand"
      >
        <slot name="shipping-label">Kostenlos</slot>
      </span>
      <PsPrice v-else :cents="shippingCents" :locale="locale" size="sm" />
    </div>
    <div
      class="flex items-center justify-between gap-md border-t border-subtle pt-sm text-label-medium text-primary"
    >
      <span>Gesamt</span>
      <PsPrice :cents="totalCents" :locale="locale" size="lg" />
    </div>
  </div>
</template>
