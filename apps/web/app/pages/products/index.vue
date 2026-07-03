<script setup lang="ts">
import { PsProductCard, PsProductGrid, PsSection } from '@print-shop/ui'
import type { Locale } from '@print-shop/types'

const { t, locale } = useI18n()
const localePath = useLocalePath()
const { data, status } = useProducts()

const products = computed(() => data.value?.products ?? [])

useSeo({
  title: () => t('products.title'),
  description: () => t('seo.products.description'),
})
</script>

<template>
  <PsSection :title="t('products.title')" heading-level="h1">
    <p v-if="status === 'pending'" class="text-secondary">{{ t('common.loading') }}</p>
    <PsProductGrid v-else data-testid="product-grid">
      <NuxtLink
        v-for="product in products"
        :key="product.id"
        :to="localePath(`/products/${product.slug}`)"
        :data-testid="`product-${product.slug}`"
      >
        <PsProductCard
          :name="pickTranslation(product, locale).name"
          :price-cents="product.priceCents"
          :image-url="productImage(product)"
          :locale="locale as Locale"
        />
      </NuxtLink>
    </PsProductGrid>
  </PsSection>
</template>
