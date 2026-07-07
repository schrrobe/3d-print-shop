<script setup lang="ts">
import { PsProductGallery, PsSection, PsWishlistButton, useToast } from '@print-shop/ui'
import type { CartLine } from '~/stores/cart'
import type { ApiProduct } from '~/composables/useShop'
import type { PublicReview } from '~/composables/useReviews'
import { useWishlist } from '~/composables/useWishlist'
import type { PopularCombo } from '~/composables/useProductConfiguration'
import ProductConfiguratorSection from '~/components/products/ProductConfiguratorSection.vue'
import ProductPurchasePanel from '~/components/products/ProductPurchasePanel.vue'
import ProductReviewsSection from '~/components/products/ProductReviewsSection.vue'

const route = useRoute()
const router = useRouter()
const { t, locale } = useI18n()
const localePath = useLocalePath()
const runtimeConfig = useRuntimeConfig()
const cart = useCartStore()
const toast = useToast()
const { store: wishlist, shareConfiguration, loadConfiguration } = useWishlist()

const slug = String(route.params.slug)
const { data, error } = await useFetch<{ product: ApiProduct }>(`/api/products/${slug}`)
const { data: colorData } = useColors()

if (error.value) {
  throw createError({ statusCode: 404, statusMessage: 'Product not found' })
}

const product = computed(() => data.value!.product)
const translation = computed(() => pickTranslation(product.value, locale.value))
const colors = computed(() => colorData.value?.colors ?? [])
const galleryImages = computed(() => productImages(product.value))

const CONFIGURATOR_ACCORDION_VALUE = 'configurator'
const configuratorAccordionValue = ref<string | undefined>(CONFIGURATOR_ACCORDION_VALUE)
const configuratorSection = ref<HTMLElement | null>(null)
const configuratorAccordionItems = computed(() => [
  { value: CONFIGURATOR_ACCORDION_VALUE, title: t('configurator.title'), content: '' },
])

const siteUrl = runtimeConfig.public.siteUrl.replace(/\/$/, '')
const absoluteUrl = (url: string) => (url.startsWith('http') ? url : `${siteUrl}${url}`)
const seoImage = computed(() => productImage(product.value, 1200))
const jsonLdImages = computed(() => galleryImages.value.map((image) => absoluteUrl(image.url)))
const breadcrumbItems = computed(() => [
  { name: t('products.title'), url: absoluteUrl(localePath('/products')) },
  { name: translation.value.name, url: absoluteUrl(localePath(`/products/${slug}`)) },
])

const {
  selection,
  configWarning,
  colorHexByZone,
  selectedColorNames,
  unavailableZones,
  previewZones,
  resetToDefaults,
  applyConfigToken,
  applyCombo,
} = useProductConfiguration({
  product,
  colors,
  loadConfiguration,
  availabilityLabel: (state) => t(`configurator.availability.${state}`),
  loadError: () => toast.show(t('configurator.loadError'), { variant: 'error' }),
})

const editKey = computed(() => (route.query.edit ? String(route.query.edit) : ''))
const quantity = ref(1)

onMounted(() => {
  cart.hydrate()
  wishlist.hydrate()

  if (editKey.value) {
    const line = cart.items.find((i) => i.key === editKey.value)
    if (line) {
      selection.value = { ...selection.value, ...line.colorSelection }
      quantity.value = line.quantity
    }
  } else if (route.query.config) {
    applyConfigToken(String(route.query.config))
  }
})

function openConfigurator() {
  configuratorAccordionValue.value = CONFIGURATOR_ACCORDION_VALUE
  configuratorSection.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function buildLine(lineQuantity: number): Omit<CartLine, 'key'> {
  return {
    productId: product.value.id,
    slug: product.value.slug,
    name: translation.value.name,
    unitPriceCents: product.value.priceCents,
    quantity: lineQuantity,
    colorSelection: { ...selection.value },
    colorNames: selectedColorNames.value,
    imageUrl: productImage(product.value, 320),
  }
}

function addToCart() {
  cart.hydrate()
  if (editKey.value) {
    cart.remove(editKey.value)
    cart.add(buildLine(quantity.value))
    toast.show(t('cart.updated'), { variant: 'success' })
    router.push(localePath('/cart'))
    return
  }

  cart.add(buildLine(quantity.value))
  toast.show(t('products.added'), { variant: 'success' })
}

const inWishlist = computed(() => wishlist.has(product.value.id, selection.value))

function toggleWishlist() {
  const added = wishlist.toggle({
    productId: product.value.id,
    slug: product.value.slug,
    name: translation.value.name,
    unitPriceCents: product.value.priceCents,
    colorSelection: { ...selection.value },
    colorNames: selectedColorNames.value,
    imageUrl: productImage(product.value, 320),
  })
  toast.show(added ? t('wishlist.added') : t('wishlist.removed'), { variant: 'success' })
}

async function shareConfig() {
  try {
    const res = await shareConfiguration({
      productId: product.value.id,
      selectedColors: selection.value,
      previewImage: productImage(product.value, 320),
    })
    const url = `${window.location.origin}${localePath(`/products/${slug}`)}?config=${res.shareToken}`
    await navigator.clipboard.writeText(url)
    toast.show(t('configurator.shareCopied'), { variant: 'success' })
  } catch {
    toast.show(t('configurator.shareError'), { variant: 'error' })
  }
}

const { data: popularData } = await useFetch<{ combinations: PopularCombo[] }>(
  `/api/products/${slug}/popular-configurations`,
  { server: false },
)
const popular = computed(() => popularData.value?.combinations ?? [])

function unavailableZoneLabel(zone: { label: string; colorName: string }) {
  return t('configurator.unavailableZone', {
    zone: zone.label,
    color: zone.colorName,
  })
}

interface ProductReviews {
  reviews: PublicReview[]
  averageRating: number | null
  count: number
}

const { data: reviewData } = await useFetch<ProductReviews>(`/api/products/${slug}/reviews`, {
  server: false,
  default: (): ProductReviews => ({ reviews: [], averageRating: null, count: 0 }),
})
const reviews = computed(() => reviewData.value ?? { reviews: [], averageRating: null, count: 0 })

function reviewPhotoAltLabel(name: string) {
  return t('reviews.photoAlt', { name })
}

function reviewRatingLabel(rating: number | null) {
  return t('reviews.ratingLabel', { rating })
}

useSeo({
  title: () => translation.value.seoTitle ?? translation.value.name,
  fullTitle: Boolean(translation.value.seoTitle),
  description: () => translation.value.seoDescription ?? translation.value.description.slice(0, 155),
  image: () => seoImage.value,
  type: 'product',
})

useHead({
  script: [
    {
      type: 'application/ld+json',
      innerHTML: computed(() => {
        const jsonLd: Record<string, unknown> = {
          '@context': 'https://schema.org',
          '@type': 'Product',
          name: translation.value.name,
          description: translation.value.description,
          image: jsonLdImages.value.length > 0 ? jsonLdImages.value : undefined,
          offers: {
            '@type': 'Offer',
            price: (product.value.priceCents / 100).toFixed(2),
            priceCurrency: 'EUR',
            availability: 'https://schema.org/InStock',
          },
        }
        if (reviews.value.count > 0 && reviews.value.averageRating) {
          jsonLd.aggregateRating = {
            '@type': 'AggregateRating',
            ratingValue: reviews.value.averageRating,
            reviewCount: reviews.value.count,
          }
        }
        return JSON.stringify(jsonLd)
      }),
    },
    {
      type: 'application/ld+json',
      innerHTML: computed(() =>
        JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: breadcrumbItems.value.map((item, index) => ({
            '@type': 'ListItem',
            position: index + 1,
            name: item.name,
            item: item.url,
          })),
        }),
      ),
    },
  ],
})
</script>

<template>
  <PsSection>
    <nav
      class="mb-lg flex flex-wrap items-center gap-xs text-caption text-secondary"
      aria-label="Breadcrumb"
      data-testid="product-breadcrumbs"
    >
      <NuxtLink :to="localePath('/products')" class="hover:text-primary">
        {{ t('products.title') }}
      </NuxtLink>
      <span aria-hidden="true">/</span>
      <span class="text-primary">{{ translation.name }}</span>
    </nav>

    <div class="grid gap-2xl lg:grid-cols-2" data-testid="product-detail">
      <PsProductGallery
        :images="galleryImages"
        :placeholder-label="t('products.gallery.placeholder')"
      />

      <div class="flex flex-col gap-lg">
        <div class="flex items-start justify-between gap-md">
          <div>
            <h1 class="text-heading-large" data-testid="product-name">{{ translation.name }}</h1>
          </div>
          <PsWishlistButton
            :active="inWishlist"
            :label-add="t('wishlist.add')"
            :label-remove="t('wishlist.remove')"
            data-testid="product-wishlist"
            @toggle="toggleWishlist"
          />
        </div>
        <p class="text-body-regular text-secondary">{{ translation.description }}</p>

        <ProductPurchasePanel
          v-model:quantity="quantity"
          :product="product"
          :preview-zones="previewZones"
          :edit-mode="Boolean(editKey)"
          :configurator-label="t('configurator.title')"
          :unavailable-label="t('configurator.unavailableShort')"
          :quantity-label="t('cart.quantity')"
          :add-to-cart-label="t('products.addToCart')"
          :save-changes-label="t('cart.saveChanges')"
          @open-configurator="openConfigurator"
          @add-to-cart="addToCart"
        />

        <NuxtLink
          :to="localePath('/products')"
          class="text-caption text-secondary hover:text-primary"
        >
          ← {{ t('common.back') }}
        </NuxtLink>
      </div>
    </div>

    <ProductNoticeBox
      class="mt-xl"
      data-testid="product-manufacturing-notice"
      icon="production"
      :title="t('products.manufacturingNotice.title')"
      :text="t('products.manufacturingNotice.production')"
    />

    <ProductNoticeBox
      class="mt-md"
      data-testid="product-ammunition-notice"
      icon="images"
      :title="t('products.manufacturingNotice.imagesTitle')"
      :text="t('products.manufacturingNotice.ammunition')"
    />

    <div v-if="product.colorSlots.length > 0" ref="configuratorSection">
      <ProductConfiguratorSection
        :product="product"
        :colors="colors"
        :selection="selection"
        :preview-zones="previewZones"
        :color-hex-by-zone="colorHexByZone"
        :popular="popular"
        :config-warning="configWarning"
        :unavailable-zones="unavailableZones"
        :accordion-value="configuratorAccordionValue"
        :accordion-default-value="CONFIGURATOR_ACCORDION_VALUE"
        :accordion-items="configuratorAccordionItems"
        :viewer-hint-label="t('products.viewer.hint')"
        :unavailable-label="t('configurator.unavailableShort')"
        :popular-label="t('configurator.popular')"
        :configure-label="t('products.configure')"
        :reset-label="t('configurator.reset')"
        :share-label="t('configurator.share')"
        :unavailable-zone-label="unavailableZoneLabel"
        @update:selection="selection = $event"
        @update:accordion-value="configuratorAccordionValue = $event"
        @reset="resetToDefaults"
        @share="shareConfig"
        @apply-combo="applyCombo"
      />
    </div>

    <ProductReviewsSection
      :reviews="reviews.reviews"
      :average-rating="reviews.averageRating"
      :count="reviews.count"
      :locale="locale"
      :title-label="t('reviews.title')"
      :empty-label="t('reviews.empty')"
      :count-label="t('reviews.count', { count: reviews.count })"
      :photo-alt-label="reviewPhotoAltLabel"
      :rating-label="reviewRatingLabel"
    />
  </PsSection>
</template>
