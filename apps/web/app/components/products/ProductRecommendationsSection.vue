<script setup lang="ts">
import { PsProductCard, PsProductGrid } from '@print-shop/ui'
import type { Locale } from '@print-shop/types'
import type { ApiProduct } from '~/composables/useShop'

defineProps<{
  products: ApiProduct[]
  titleLabel: string
  locale: string
}>()

const localePath = useLocalePath()
</script>

<template>
  <section
    v-if="products.length > 0"
    class="mt-3xl"
    data-testid="product-recommendations"
  >
    <h2 class="text-heading-small">{{ titleLabel }}</h2>
    <PsProductGrid class="mt-lg" data-testid="recommendation-grid">
      <NuxtLink
        v-for="product in products"
        :key="product.id"
        :to="localePath(`/products/${product.slug}`)"
        :data-testid="`recommendation-${product.slug}`"
      >
        <PsProductCard
          :name="pickTranslation(product, locale).name"
          :price-cents="product.priceCents"
          :image-url="productImage(product)"
          :locale="locale as Locale"
        />
      </NuxtLink>
    </PsProductGrid>
  </section>
</template>
