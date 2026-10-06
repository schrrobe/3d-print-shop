<script setup lang="ts">
import { formatCents } from '@print-shop/utils'
import type { Locale } from '@print-shop/types'

const { t, locale } = useI18n()
const localePath = useLocalePath()
const cart = useCartStore()

onMounted(() => cart.hydrate())

const money = (cents: number) => formatCents(cents, locale.value as Locale)

useSeo({
  title: () => t('seo.cart.title'),
  description: () => t('seo.cart.description'),
})
</script>

<template>
  <div class="kb-wrap pb-28 pt-8 md:pb-24 md:pt-12">
    <h1 class="kb-display text-[3rem] sm:text-[4rem]">{{ t('cart.title') }}</h1>

    <div
      v-if="cart.items.length === 0"
      class="mt-8 border-y border-ink py-12"
      data-testid="cart-empty"
    >
      <p class="kb-heading text-[1.75rem]">{{ t('cart.empty') }}</p>
      <p class="mt-2 max-w-[48ch] text-ink-2">{{ t('shop.cart.emptyText') }}</p>
      <NuxtLink :to="localePath('/products')" class="kb-btn kb-btn-hit mt-6">
        {{ t('cart.browse') }}
        <ShopIcon name="arrow-right" />
      </NuxtLink>
    </div>

    <div
      v-else
      class="mt-8 grid gap-10 lg:grid-cols-[1fr_24rem] lg:gap-14"
      data-testid="cart-content"
    >
      <section :aria-label="t('shop.cart.itemsLabel', { count: cart.count })">
        <ul class="divide-y divide-rule border-y border-ink">
          <li
            v-for="item in cart.items"
            :key="item.key"
            class="grid grid-cols-[1fr_auto] gap-x-4 gap-y-4 py-5"
            data-testid="cart-item"
          >
            <div class="min-w-0">
              <NuxtLink
                :to="localePath(`/products/${item.slug}`)"
                class="kb-heading text-[1.375rem] underline-offset-4 hover:underline"
              >
                {{ item.name }}
              </NuxtLink>
              <p v-if="item.colorNames.length" class="mt-1 text-ink-2">
                {{ item.colorNames.join(' · ') }}
              </p>
              <p class="kb-num mt-1 text-sm text-ink-2">
                {{ t('shop.cart.unitPrice', { price: money(item.unitPriceCents) }) }}
              </p>
            </div>
            <p class="kb-num text-right text-[1.125rem] font-bold">
              {{ money(item.unitPriceCents * item.quantity) }}
            </p>

            <div class="col-span-2 flex flex-wrap items-end justify-between gap-3">
              <ShopQuantity
                :model-value="item.quantity"
                :label="t('cart.quantity')"
                testid="cart-quantity"
                @update:model-value="cart.setQuantity(item.key, $event)"
              />
              <div class="flex">
                <NuxtLink
                  :to="
                    localePath(`/products/${item.slug}`) + `?edit=${encodeURIComponent(item.key)}`
                  "
                  class="kb-btn kb-btn-quiet"
                  :aria-label="t('shop.cart.editItem', { name: item.name })"
                  data-testid="cart-edit"
                >
                  {{ t('cart.edit') }}
                </NuxtLink>
                <button
                  type="button"
                  class="kb-btn kb-btn-quiet"
                  :aria-label="t('shop.cart.removeItem', { name: item.name })"
                  data-testid="cart-remove"
                  @click="cart.remove(item.key)"
                >
                  {{ t('cart.remove') }}
                </button>
              </div>
            </div>
          </li>
        </ul>
        <NuxtLink :to="localePath('/products')" class="kb-btn kb-btn-quiet mt-4">
          <ShopIcon name="arrow-left" :size="18" />
          {{ t('shop.cart.continue') }}
        </NuxtLink>
      </section>

      <aside
        class="flex h-fit flex-col gap-6 bg-paper-raised p-5 outline outline-1 outline-rule md:p-6 lg:sticky lg:top-24"
        data-testid="cart-summary"
      >
        <h2 class="kb-heading text-[1.5rem]">{{ t('checkout.summary') }}</h2>
        <ShopTotals prefix="cart" />
        <ShopVoucherForm />
        <NuxtLink
          :to="localePath('/checkout')"
          class="kb-btn kb-btn-hit w-full text-[1.0625rem]"
          data-testid="to-checkout"
        >
          {{ t('cart.checkout') }}
          <ShopIcon name="arrow-right" />
        </NuxtLink>
        <p class="flex items-start gap-2 text-sm text-ink-2">
          <ShopIcon name="lock" :size="16" class="mt-0.5" />
          {{ t('checkout.guestHint') }}
        </p>
      </aside>
    </div>

    <!-- Mobile: total + checkout always within thumb reach -->
    <div
      v-if="cart.items.length > 0"
      class="fixed inset-x-0 bottom-0 z-40 border-t border-on-mirror/20 bg-mirror pb-[env(safe-area-inset-bottom)] text-on-mirror lg:hidden"
    >
      <div class="kb-wrap flex items-center justify-between gap-3 py-3">
        <p>
          <span class="block text-sm text-on-mirror-2">{{ t('cart.total') }}</span>
          <span class="kb-num text-[1.25rem] font-bold">{{ money(cart.totals.totalCents) }}</span>
        </p>
        <NuxtLink :to="localePath('/checkout')" class="kb-btn kb-btn-hit">
          {{ t('cart.checkout') }}
          <ShopIcon name="arrow-right" />
        </NuxtLink>
      </div>
    </div>
  </div>
</template>
