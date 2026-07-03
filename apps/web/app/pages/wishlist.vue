<script setup lang="ts">
import { PsButton, PsPillButton, PsSection, PsWishlistButton, useToast } from '@print-shop/ui'
import { useWishlist } from '~/composables/useWishlist'

/** Guest wishlist (localStorage). Move to cart, remove, or share a configuration. */
const { t } = useI18n()
const localePath = useLocalePath()
const cart = useCartStore()
const toast = useToast()
const { store, shareConfiguration } = useWishlist()

onMounted(() => store.hydrate())

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
    await navigator.clipboard.writeText(fullUrl)
    toast.show(t('wishlist.shareCopied'), { variant: 'success' })
  } catch {
    toast.show(t('wishlist.shareError'), { variant: 'error' })
  }
}
</script>

<template>
  <PsSection>
    <div class="mx-auto max-w-[48rem]" data-testid="wishlist-page">
      <h1 class="text-heading-medium">{{ t('wishlist.title') }}</h1>

      <p v-if="store.count === 0" class="mt-xl text-body-regular text-secondary" data-testid="wishlist-empty">
        {{ t('wishlist.empty') }}
      </p>

      <div v-else class="mt-xl flex flex-col gap-md">
        <div
          v-for="line in store.items"
          :key="line.key"
          class="flex flex-wrap items-center gap-md rounded-card border border-subtle bg-surface-elevated p-md"
          data-testid="wishlist-item"
        >
          <img
            v-if="line.imageUrl"
            :src="line.imageUrl"
            :alt="line.name"
            class="h-16 w-16 rounded-card object-cover"
          />
          <div class="min-w-0 flex-1">
            <NuxtLink
              :to="localePath(`/products/${line.slug}`)"
              class="text-label-medium hover:text-brand"
              data-testid="wishlist-item-name"
            >
              {{ line.name }}
            </NuxtLink>
            <p v-if="line.colorNames.length" class="text-caption text-secondary">
              {{ line.colorNames.join(' · ') }}
            </p>
          </div>
          <div class="flex items-center gap-sm">
            <PsPillButton size="sm" data-testid="wishlist-to-cart" @click="moveToCart(line.key)">
              {{ t('wishlist.toCart') }}
            </PsPillButton>
            <PsButton variant="ghost" size="sm" data-testid="wishlist-share" @click="share(line.key)">
              {{ t('wishlist.share') }}
            </PsButton>
            <PsWishlistButton
              :active="true"
              :label-add="t('wishlist.add')"
              :label-remove="t('wishlist.remove')"
              data-testid="wishlist-remove"
              @toggle="store.remove(line.key)"
            />
          </div>
        </div>
      </div>
    </div>
  </PsSection>
</template>
