<script setup lang="ts">
import { PsInput, PsProductCard, PsProductGrid, PsSection } from '@print-shop/ui'
import type { Locale } from '@print-shop/types'

const { t, locale } = useI18n()
const localePath = useLocalePath()

const searchInput = ref('')
const searchQuery = ref('')
let debounce: ReturnType<typeof setTimeout>
watch(searchInput, (value) => {
  clearTimeout(debounce)
  debounce = setTimeout(() => {
    searchQuery.value = value
  }, 300)
})

const { data, status } = useProducts(searchQuery)

const products = computed(() => data.value?.products ?? [])
const noResults = computed(
  () => status.value !== 'pending' && products.value.length === 0 && searchQuery.value.trim() !== '',
)

useSeo({
  title: () => t('products.title'),
  description: () => t('seo.products.description'),
})
</script>

<template>
  <PsSection :title="t('products.title')" heading-level="h1">
    <div class="mb-lg max-w-sm">
      <PsInput
        v-model="searchInput"
        type="search"
        :placeholder="t('products.search.placeholder')"
        :autocomplete="'off'"
        data-testid="product-search"
      />
    </div>
    <p v-if="status === 'pending'" class="text-secondary">{{ t('common.loading') }}</p>
    <p v-else-if="noResults" class="text-secondary" data-testid="product-search-empty">
      {{ t('products.search.noResults') }}
    </p>
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
