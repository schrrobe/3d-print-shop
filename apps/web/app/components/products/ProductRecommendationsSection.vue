<script setup lang="ts">
import type { ApiColor, ApiProduct } from '~/composables/useShop'

const props = defineProps<{
  products: ApiProduct[]
  titleLabel: string
  colors: ApiColor[]
}>()

const { locale } = useI18n()
const families = computed(() => groupFamilies(props.products, locale.value))
</script>

<template>
  <section
    v-if="products.length > 0"
    class="mt-16 md:mt-24"
    aria-labelledby="recommendations-title"
    data-testid="product-recommendations"
  >
    <h2 id="recommendations-title" class="kb-heading text-[1.75rem] md:text-[2.25rem]">
      {{ titleLabel }}
    </h2>
    <ul class="mt-4 divide-y divide-rule border-y border-ink" data-testid="recommendation-grid">
      <li
        v-for="family in families"
        :key="family.key"
        :data-testid="`recommendation-${family.lead.slug}`"
      >
        <ShopProductRow :family="family" :colors="colors" heading-level="h3" />
      </li>
    </ul>
  </section>
</template>
