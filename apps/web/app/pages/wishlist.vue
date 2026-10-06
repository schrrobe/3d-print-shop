<script setup lang="ts">
import { useToast } from '@print-shop/ui'
import { formatCents } from '@print-shop/utils'
import type { Locale } from '@print-shop/types'
import { useWishlist } from '~/composables/useWishlist'

/** Guest wishlist (localStorage). Move to cart, remove, or share a configuration. */
const { t, locale } = useI18n()
const localePath = useLocalePath()
const cart = useCartStore()
const toast = useToast()
const { store, shareConfiguration } = useWishlist()

onMounted(() => store.hydrate())

useSeo({ title: () => t('wishlist.title'), description: () => t('seo.products.description') })
useHead({ meta: [{ name: 'robots', content: 'noindex' }] })

const money = (cents: number) => formatCents(cents, locale.value as Locale)

function moveToCart(key: string) {
  const line = store.items.find((i) => i.key === key)
  if (!line) return
  cart.hydrate()
  cart.add({
    productId: line.productId,
    slug: line.slug,
    name: line.name,
    unitPriceCents: line.unitPriceCents,
    quantity: 1,
    colorSelection: line.colorSelection,
    colorNames: line.colorNames,
    imageUrl: line.imageUrl,
  })
  store.remove(key)
  toast.show(t('wishlist.movedToCart'), { variant: 'success' })
}

async function share(key: string) {
  const line = store.items.find((i) => i.key === key)
  if (!line) return
  try {
    const res = await shareConfiguration({
      productId: line.productId,
      selectedColors: line.colorSelection,
      previewImage: line.imageUrl,
    })
    const fullUrl = `${window.location.origin}${localePath(`/products/${line.slug}`)}?config=${res.shareToken}`
    if (navigator.share) {
      await navigator.share({ title: line.name, url: fullUrl }).catch(() => undefined)
    } else {
      await navigator.clipboard.writeText(fullUrl)
      toast.show(t('wishlist.shareCopied'), { variant: 'success' })
    }
  } catch {
    toast.show(t('wishlist.shareError'), { variant: 'error' })
  }
}
</script>

<template>
  <div class="kb-wrap pb-16 pt-8 md:pb-24 md:pt-12" data-testid="wishlist-page">
    <h1 class="kb-display text-[3rem] sm:text-[4rem]">{{ t('wishlist.title') }}</h1>
    <p class="mt-2 max-w-[52ch] text-ink-2">{{ t('shop.wishlist.lead') }}</p>

    <div
      v-if="store.count === 0"
      class="mt-8 border-y border-ink py-12"
      data-testid="wishlist-empty"
    >
      <p class="kb-heading text-[1.75rem]">{{ t('wishlist.empty') }}</p>
      <p class="mt-2 max-w-[48ch] text-ink-2">{{ t('shop.wishlist.emptyText') }}</p>
      <NuxtLink :to="localePath('/products')" class="kb-btn kb-btn-hit mt-6">
        {{ t('cart.browse') }}
        <ShopIcon name="arrow-right" />
      </NuxtLink>
    </div>

    <ul v-else class="mt-8 divide-y divide-rule border-y border-ink">
      <li
        v-for="line in store.items"
        :key="line.key"
        class="grid gap-4 py-5 sm:grid-cols-[1fr_auto] sm:items-center"
        data-testid="wishlist-item"
      >
        <div class="min-w-0">
          <NuxtLink
            :to="localePath(`/products/${line.slug}`)"
            class="kb-heading text-[1.375rem] underline-offset-4 hover:underline"
            data-testid="wishlist-item-name"
          >
            {{ line.name }}
          </NuxtLink>
          <p v-if="line.colorNames.length" class="mt-1 text-ink-2">
            {{ line.colorNames.join(' · ') }}
          </p>
          <p class="kb-num mt-1 font-bold">{{ money(line.unitPriceCents) }}</p>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <button
            type="button"
            class="kb-btn kb-btn-ink"
            data-testid="wishlist-to-cart"
            @click="moveToCart(line.key)"
          >
            <ShopIcon name="cart" :size="18" />
            {{ t('wishlist.toCart') }}
          </button>
          <button
            type="button"
            class="kb-btn kb-btn-line kb-btn-icon min-h-12 min-w-12"
            :aria-label="t('shop.wishlist.shareItem', { name: line.name })"
            data-testid="wishlist-share"
            @click="share(line.key)"
          >
            <ShopIcon name="share" />
          </button>
          <button
            type="button"
            class="kb-btn kb-btn-line kb-btn-icon min-h-12 min-w-12"
            :aria-label="t('shop.wishlist.removeItem', { name: line.name })"
            data-testid="wishlist-remove"
            @click="store.remove(line.key)"
          >
            <ShopIcon name="trash" />
          </button>
        </div>
      </li>
    </ul>
  </div>
</template>
