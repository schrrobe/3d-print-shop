<script setup lang="ts">
import { PsColorPicker, PsPillButton, PsPrice, PsSection, useToast } from '@print-shop/ui'
import type { ApiProduct } from '~/composables/useShop'

const route = useRoute()
const { t, locale } = useI18n()
const localePath = useLocalePath()
const cart = useCartStore()
const toast = useToast()

const slug = String(route.params.slug)
const { data, error } = await useFetch<{ product: ApiProduct }>(`/api/products/${slug}`)
const { data: colorData } = useColors()

if (error.value) {
  throw createError({ statusCode: 404, statusMessage: 'Product not found' })
}

const product = computed(() => data.value!.product)
const translation = computed(() => pickTranslation(product.value, locale.value))
const colors = computed(() => colorData.value?.colors ?? [])

// Selection initialised with the product's default colors per zone
const selection = ref<Record<string, string>>({})
watchEffect(() => {
  for (const zone of product.value.colorSlots) {
    if (!selection.value[zone.slot] && zone.defaultColorId) {
      selection.value[zone.slot] = zone.defaultColorId
    }
  }
})

const colorHexByZone = computed(() => {
  const map: Record<string, string> = {}
  for (const [zone, colorId] of Object.entries(selection.value)) {
    const color = colors.value.find((c) => c.id === colorId)
    if (color) map[zone] = color.hex
  }
  return map
})

const selectedColorNames = computed(() =>
  Object.values(selection.value)
    .map((id) => colors.value.find((c) => c.id === id)?.name)
    .filter((name): name is string => Boolean(name)),
)

const quantity = ref(1)

function addToCart() {
  cart.hydrate()
  cart.add({
    productId: product.value.id,
    slug: product.value.slug,
    name: translation.value.name,
    unitPriceCents: product.value.priceCents,
    quantity: quantity.value,
    colorSelection: { ...selection.value },
    colorNames: selectedColorNames.value,
    imageUrl: productImage(product.value),
  })
  toast.show(t('products.added'), { variant: 'success' })
}

useSeo({
  // seoTitle from the product translation is complete on its own; the plain
  // name goes through the global titleTemplate
  title: () => translation.value.seoTitle ?? translation.value.name,
  fullTitle: Boolean(translation.value.seoTitle),
  description: () =>
    translation.value.seoDescription ?? translation.value.description.slice(0, 155),
  image: () => productImage(product.value),
  type: 'product',
})

// Product rich result (price, availability) for search engines
useHead({
  script: [
    {
      type: 'application/ld+json',
      innerHTML: computed(() =>
        JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'Product',
          name: translation.value.name,
          description: translation.value.description,
          image: productImage(product.value) ?? undefined,
          offers: {
            '@type': 'Offer',
            price: (product.value.priceCents / 100).toFixed(2),
            priceCurrency: 'EUR',
            availability: 'https://schema.org/InStock',
          },
        }),
      ),
    },
  ],
})
</script>

<template>
  <PsSection>
    <div class="grid gap-2xl lg:grid-cols-2" data-testid="product-detail">
      <div>
        <ClientOnly>
          <ModelViewer :src="productGlb(product)" :color-hex-by-zone="colorHexByZone" />
          <template #fallback>
            <div class="aspect-square w-full rounded-card border border-subtle bg-surface-elevated" />
          </template>
        </ClientOnly>
        <p class="mt-sm text-center text-caption text-secondary">{{ t('products.viewer.hint') }}</p>
      </div>

      <div class="flex flex-col gap-lg">
        <div>
          <h1 class="text-heading-large" data-testid="product-name">{{ translation.name }}</h1>
          <PsPrice :cents="product.priceCents" size="lg" class="mt-sm block text-brand" />
        </div>
        <p class="text-body-regular text-secondary">{{ translation.description }}</p>

        <div v-if="product.colorSlots.length > 0">
          <h2 class="mb-md text-label-medium">{{ t('products.configure') }}</h2>
          <PsColorPicker
            v-model="selection"
            :zones="product.colorSlots.map((s) => ({ slot: s.slot, label: s.label }))"
            :colors="colors"
          />
        </div>

        <div class="flex items-center gap-md">
          <label class="flex items-center gap-sm text-caption text-secondary">
            {{ t('cart.quantity') }}
            <input
              v-model.number="quantity"
              type="number"
              min="1"
              max="99"
              class="w-20 rounded-card border border-subtle bg-surface-elevated px-md py-sm text-body-regular text-primary"
              data-testid="quantity-input"
            />
          </label>
          <PsPillButton size="lg" data-testid="add-to-cart" @click="addToCart">
            {{ t('products.addToCart') }}
          </PsPillButton>
        </div>

        <NuxtLink :to="localePath('/products')" class="text-caption text-secondary hover:text-primary">
          ← {{ t('common.back') }}
        </NuxtLink>
      </div>
    </div>
  </PsSection>
</template>
