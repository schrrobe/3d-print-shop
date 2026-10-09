<script setup lang="ts">
import { PsProductGallery, useToast } from '@print-shop/ui'
import { formatCents } from '@print-shop/utils'
import type { ColorSelection, Locale } from '@print-shop/types'
import type { CartLine } from '~/stores/cart'
import type { ApiProduct } from '~/composables/useShop'
import type { PublicReview } from '~/composables/useReviews'
import { useWishlist } from '~/composables/useWishlist'
import type { PopularCombo } from '~/composables/useProductConfiguration'
import ProductRecommendationsSection from '~/components/products/ProductRecommendationsSection.vue'
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
const { data: colorData } = await useColors()

if (error.value) {
  throw createError({ statusCode: 404, statusMessage: 'Product not found' })
}

const product = computed(() => data.value!.product)
const translation = computed(() => pickTranslation(product.value, locale.value))
const colors = computed(() => colorData.value?.colors ?? [])
const caliber = computed(() => product.value.calibers?.[0])
const caliberName = computed(() => caliber.value?.name ?? translation.value.name)
const siblings = computed(() =>
  [...(product.value.siblings ?? [])].sort((a, b) => (a.capacity ?? 0) - (b.capacity ?? 0)),
)
// Real photos only (admin uploads); the seeded schematic SVGs are replaced by the live drawing
const photos = computed(() =>
  productImages(product.value).filter((image) => !image.url.startsWith('/images/products/')),
)
const glb = computed(() => productGlb(product.value))
const price = (cents: number) => formatCents(cents, locale.value as Locale)

const siteUrl = runtimeConfig.public.siteUrl.replace(/\/$/, '')
const absoluteUrl = (url: string) => (url.startsWith('http') ? url : `${siteUrl}${url}`)
const seoImage = computed(() => productImage(product.value, 1200))
const jsonLdImages = computed(() =>
  productImages(product.value).map((image) => absoluteUrl(image.url)),
)
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

const drawingColors = computed(() => boxColors(product.value, colors.value, selection.value))
const drawingDescription = computed(() =>
  t('shop.product.drawingAlt', {
    caliber: caliberName.value,
    capacity: product.value.capacity ?? '',
    box: drawingColors.value.boxName,
    label: drawingColors.value.labelName,
  }),
)

const editKey = computed(() => (route.query.edit ? String(route.query.edit) : ''))
const quantity = ref(1)

// Switching 50 ↔ 100 navigates to the sibling product; carry the colours across
const carry = useState<{ family: string; selection: ColorSelection; quantity: number } | null>(
  'kb-size-carry',
  () => null,
)
function rememberForSibling() {
  if (product.value.familyKey) {
    carry.value = {
      family: product.value.familyKey,
      selection: { ...selection.value },
      quantity: quantity.value,
    }
  }
}

onMounted(() => {
  cart.hydrate()
  wishlist.hydrate()
  useTracking().track('view_item', {
    productId: product.value.id,
    slug: product.value.slug,
    priceCents: product.value.priceCents,
  })
  if (editKey.value) {
    const line = cart.items.find((i) => i.key === editKey.value)
    if (line) {
      selection.value = { ...selection.value, ...line.colorSelection }
      quantity.value = line.quantity
    }
  } else if (route.query.config) {
    applyConfigToken(String(route.query.config))
  } else if (carry.value && carry.value.family === product.value.familyKey) {
    const zones = new Set(product.value.colorSlots.map((z) => z.slot))
    selection.value = {
      ...selection.value,
      ...Object.fromEntries(
        Object.entries(carry.value.selection).filter(([zone]) => zones.has(zone as never)),
      ),
    }
    quantity.value = carry.value.quantity
  }
  carry.value = null
})

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
    if (navigator.share) {
      await navigator.share({ title: translation.value.name, url }).catch(() => undefined)
    } else {
      await navigator.clipboard.writeText(url)
      toast.show(t('configurator.shareCopied'), { variant: 'success' })
    }
  } catch {
    toast.show(t('configurator.shareError'), { variant: 'error' })
  }
}

// Sticky buy bar (mobile) shows whenever the buy panel is off screen — above or below
const buyBox = ref<HTMLElement | null>(null)
const buyBoxVisible = ref(true)
let observer: IntersectionObserver | undefined
// Watch the ref (not onMounted): the panel may render after the first mount tick
watch(buyBox, (el) => {
  observer?.disconnect()
  if (!el || typeof IntersectionObserver === 'undefined') return
  observer = new IntersectionObserver(([entry]) => {
    buyBoxVisible.value = Boolean(entry?.isIntersecting)
  })
  observer.observe(el)
})
onBeforeUnmount(() => observer?.disconnect())

interface ProductReviews {
  reviews: PublicReview[]
  averageRating: number | null
  count: number
}
interface ProductRecommendations {
  products: ApiProduct[]
  source: 'copurchase' | 'fallback'
}

const [{ data: popularData }, { data: reviewData }, { data: recommendationData }] =
  await Promise.all([
    useFetch<{ combinations: PopularCombo[] }>(`/api/products/${slug}/popular-configurations`, {
      server: false,
    }),
    useFetch<ProductReviews>(`/api/products/${slug}/reviews`, {
      server: false,
      default: (): ProductReviews => ({ reviews: [], averageRating: null, count: 0 }),
    }),
    useFetch<ProductRecommendations>(`/api/products/${slug}/frequently-bought-together`, {
      server: false,
      default: (): ProductRecommendations => ({ products: [], source: 'fallback' }),
    }),
  ])

const popular = computed(() => popularData.value?.combinations ?? [])
const reviews = computed(() => reviewData.value ?? { reviews: [], averageRating: null, count: 0 })
const recommendations = computed(
  () => recommendationData.value ?? { products: [], source: 'fallback' as const },
)
const recommendationsTitle = computed(() =>
  recommendations.value.source === 'copurchase'
    ? t('recommendations.title')
    : t('recommendations.fallbackTitle'),
)

function reviewPhotoAltLabel(name: string) {
  return t('reviews.photoAlt', { name })
}
function reviewRatingLabel(rating: number | null) {
  return t('reviews.ratingLabel', { rating })
}
function unavailableZoneLabel(zone: { label: string; colorName: string }) {
  return t('configurator.unavailableZone', { zone: zone.label, color: zone.colorName })
}

useSeo({
  title: () => translation.value.seoTitle ?? translation.value.name,
  fullTitle: Boolean(translation.value.seoTitle),
  description: () =>
    translation.value.seoDescription ?? translation.value.description.slice(0, 155),
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
  <div class="kb-wrap pb-28 pt-6 md:pb-24 md:pt-10">
    <nav aria-label="Breadcrumb" data-testid="product-breadcrumbs">
      <ol class="flex flex-wrap items-center gap-1 text-sm text-ink-2">
        <li>
          <NuxtLink
            :to="localePath('/products')"
            class="inline-flex min-h-11 items-center underline-offset-4 hover:underline"
          >
            {{ t('products.title') }}
          </NuxtLink>
        </li>
        <li v-if="caliber" class="flex items-center gap-1">
          <span aria-hidden="true">/</span>
          <NuxtLink
            :to="localePath({ path: '/products', query: { caliber: caliber.slug } })"
            class="inline-flex min-h-11 items-center underline-offset-4 hover:underline"
          >
            {{ caliber.name }}
          </NuxtLink>
        </li>
        <li class="sr-only">
          <span aria-current="page">{{ translation.name }}</span>
        </li>
      </ol>
    </nav>

    <div
      class="mt-2 grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:gap-14"
      data-testid="product-detail"
    >
      <!-- Title (first on mobile, right column on desktop) -->
      <header class="lg:col-start-2 lg:row-start-1">
        <h1 class="kb-display text-[3.25rem] sm:text-[4.5rem]" data-testid="product-name">
          {{ translation.name }}
        </h1>
      </header>

      <!-- Drawing / photos / 3D: sticky on desktop -->
      <div class="lg:col-start-1 lg:row-span-3 lg:row-start-1">
        <div class="lg:sticky lg:top-24">
          <figure class="border border-rule bg-paper-raised p-4 sm:p-6">
            <ShopBoxDrawing
              :capacity="product.capacity"
              :box-hex="drawingColors.box"
              :label-hex="drawingColors.label"
              :caliber-label="caliberName"
              :show-sibling="siblings.length > 1"
              :socket-scale="socketScale(caliber?.slug)"
              :description="drawingDescription"
            />
            <figcaption class="mt-3 flex flex-wrap justify-between gap-2 text-sm text-ink-2">
              <span>{{ t('shop.product.drawingCaption') }}</span>
              <span v-if="siblings.length > 1" class="inline-flex items-center gap-2">
                <svg width="22" height="8" aria-hidden="true">
                  <line x1="0" y1="4" x2="22" y2="4" stroke="currentColor" stroke-dasharray="4 3" />
                </svg>
                {{ t('shop.product.drawingSibling') }}
              </span>
            </figcaption>
          </figure>

          <PsProductGallery
            v-if="photos.length"
            class="mt-6"
            :images="photos"
            :placeholder-label="t('products.gallery.placeholder')"
          />
          <ClientOnly v-if="glb">
            <div class="mt-6 border border-rule">
              <ModelViewer :src="glb" :color-hex-by-zone="colorHexByZone" />
              <p class="border-t border-rule px-4 py-2 text-sm text-ink-2">
                {{ t('products.viewer.hint') }}
              </p>
            </div>
          </ClientOnly>
        </div>
      </div>

      <!-- Configure + buy -->
      <div class="flex flex-col gap-8 lg:col-start-2 lg:row-start-2">
        <p class="max-w-[60ch] text-[1.0625rem] text-ink-2">{{ translation.description }}</p>

        <nav
          v-if="siblings.length > 1"
          :aria-label="t('shop.product.sizeLegend')"
          data-testid="size-switch"
        >
          <p class="kb-label">{{ t('shop.product.sizeLegend') }}</p>
          <ul class="grid grid-cols-2 border border-ink">
            <li v-for="s in siblings" :key="s.slug" class="[&+li]:border-l [&+li]:border-ink">
              <NuxtLink
                :to="
                  localePath({
                    path: `/products/${s.slug}`,
                    query: editKey ? { edit: editKey } : {},
                  })
                "
                replace
                class="flex min-h-16 flex-col justify-center px-4 py-2 transition-colors aria-[current=page]:bg-ink aria-[current=page]:text-paper hover:bg-paper-sunk aria-[current=page]:hover:bg-ink"
                :aria-current="s.slug === product.slug ? 'page' : undefined"
                @click="rememberForSibling"
              >
                <span class="kb-heading text-[1.375rem]">{{
                  t('shop.product.rounds', { count: s.capacity })
                }}</span>
                <span class="kb-num text-sm opacity-80">{{ price(s.priceCents) }}</span>
              </NuxtLink>
            </li>
          </ul>
        </nav>

        <section
          v-if="product.colorSlots.length > 0"
          aria-labelledby="configure-title"
          data-testid="configurator"
        >
          <div class="flex items-end justify-between gap-4 border-b border-ink pb-3">
            <h2 id="configure-title" class="kb-heading text-[1.75rem]">
              {{ t('products.configure') }}
            </h2>
            <div class="flex">
              <button
                type="button"
                class="kb-btn kb-btn-icon text-ink-2 hover:text-ink"
                :aria-label="t('configurator.reset')"
                :title="t('configurator.reset')"
                data-testid="config-reset"
                @click="resetToDefaults"
              >
                <ShopIcon name="reset" />
              </button>
              <button
                type="button"
                class="kb-btn kb-btn-icon text-ink-2 hover:text-ink"
                :aria-label="t('configurator.share')"
                :title="t('configurator.share')"
                data-testid="config-share"
                @click="shareConfig"
              >
                <ShopIcon name="share" />
              </button>
            </div>
          </div>

          <div v-if="popular.length" class="mt-5" data-testid="popular-combos">
            <p class="kb-label">{{ t('configurator.popular') }}</p>
            <div class="flex flex-wrap gap-2">
              <button
                v-for="(combo, i) in popular"
                :key="i"
                type="button"
                class="inline-flex min-h-11 items-center gap-1 border border-rule-strong px-2.5 hover:border-ink disabled:cursor-not-allowed disabled:opacity-50"
                :disabled="!combo.available"
                :aria-label="combo.swatches.map((s) => s.name).join(' / ')"
                data-testid="popular-combo"
                @click="applyCombo(combo)"
              >
                <span
                  v-for="sw in combo.swatches"
                  :key="sw.slot"
                  class="inline-block size-5 border border-ink/25"
                  :style="{ backgroundColor: sw.hex }"
                  aria-hidden="true"
                />
              </button>
            </div>
          </div>

          <ShopColorPicker
            v-model="selection"
            class="mt-6"
            :zones="product.colorSlots.map((s) => ({ slot: s.slot, label: s.label }))"
            :colors="colors"
          />

          <div
            v-if="configWarning.length || unavailableZones.length"
            class="mt-5 flex flex-col gap-2"
            role="status"
          >
            <p
              v-for="warn in configWarning"
              :key="warn"
              class="flex gap-2 text-warn"
              data-testid="config-warning"
            >
              <ShopIcon name="alert" class="mt-0.5" />{{ warn }}
            </p>
            <p
              v-for="zone in unavailableZones"
              :key="zone.slot"
              class="flex gap-2 text-warn"
              data-testid="config-unavailable"
            >
              <ShopIcon name="alert" class="mt-0.5" />{{ unavailableZoneLabel(zone) }}
            </p>
          </div>
        </section>

        <div
          ref="buyBox"
          class="flex flex-col gap-5 border-y-2 border-ink py-6"
          data-testid="purchase-panel"
        >
          <div class="flex items-end justify-between gap-4">
            <div>
              <p class="kb-num text-[2rem] font-bold leading-none" data-testid="price">
                {{ price(product.priceCents) }}
              </p>
              <p class="mt-1 text-sm text-ink-2">{{ t('shop.product.priceNote') }}</p>
            </div>
            <ShopQuantity v-model="quantity" :label="t('cart.quantity')" />
          </div>
          <div class="grid grid-cols-[1fr_auto] gap-2">
            <button
              type="button"
              class="kb-btn kb-btn-hit text-[1.0625rem]"
              data-testid="add-to-cart"
              @click="addToCart"
            >
              <ShopIcon name="cart" />
              {{ editKey ? t('cart.saveChanges') : t('products.addToCart') }}
            </button>
            <button
              type="button"
              class="kb-btn kb-btn-line kb-btn-icon min-h-12 min-w-12"
              :class="inWishlist ? 'text-hit' : ''"
              :aria-pressed="inWishlist"
              :aria-label="inWishlist ? t('wishlist.remove') : t('wishlist.add')"
              data-testid="product-wishlist"
              @click="toggleWishlist"
            >
              <ShopIcon :name="inWishlist ? 'heart-filled' : 'heart'" />
            </button>
          </div>
          <p class="text-sm text-ink-2" data-testid="purchase-configuration-summary">
            {{
              t('shop.product.summary', {
                caliber: caliberName,
                capacity: product.capacity ?? '',
                box: drawingColors.boxName,
                label: drawingColors.labelName,
              })
            }}
          </p>
        </div>

        <dl class="divide-y divide-rule border-b border-rule">
          <div
            class="grid gap-1 py-4 sm:grid-cols-[12rem_1fr]"
            data-testid="product-manufacturing-notice"
          >
            <dt class="font-bold">{{ t('products.manufacturingNotice.title') }}</dt>
            <dd class="text-ink-2">{{ t('products.manufacturingNotice.production') }}</dd>
          </div>
          <div
            class="grid gap-1 py-4 sm:grid-cols-[12rem_1fr]"
            data-testid="product-ammunition-notice"
          >
            <dt class="font-bold">{{ t('shop.product.contentsTitle') }}</dt>
            <dd class="text-ink-2">{{ t('shop.product.contentsText') }}</dd>
          </div>
        </dl>

        <ShopLegalNotice />
      </div>
    </div>

    <ProductReviewsSection
      :reviews="reviews.reviews"
      :average-rating="reviews.averageRating"
      :count="reviews.count"
      :locale="locale"
      :title-label="t('reviews.title')"
      :empty-label="t('reviews.empty')"
      :count-label="t('reviews.count', { count: reviews.count }, reviews.count)"
      :photo-alt-label="reviewPhotoAltLabel"
      :rating-label="reviewRatingLabel"
    />

    <ProductRecommendationsSection
      :products="recommendations.products"
      :title-label="recommendationsTitle"
      :colors="colors"
    />

    <!-- Mobile sticky buy bar -->
    <Transition name="kb-bar">
      <div
        v-if="!buyBoxVisible"
        class="fixed inset-x-0 bottom-0 z-40 border-t border-on-mirror/20 bg-mirror pb-[env(safe-area-inset-bottom)] text-on-mirror lg:hidden"
        data-testid="sticky-buy-bar"
      >
        <div class="kb-wrap flex items-center gap-3 py-3">
          <div class="min-w-0 flex-1">
            <p class="truncate font-bold">
              {{ caliberName
              }}<template v-if="product.capacity"> · {{ product.capacity }}</template>
            </p>
            <p class="kb-num text-sm text-on-mirror-2">
              {{ price(product.priceCents * quantity)
              }}<template v-if="quantity > 1"> · {{ quantity }}×</template>
            </p>
          </div>
          <button
            type="button"
            class="kb-btn kb-btn-hit shrink-0"
            data-testid="sticky-add-to-cart"
            @click="addToCart"
          >
            <ShopIcon name="cart" />
            {{ editKey ? t('cart.saveChanges') : t('products.addToCart') }}
          </button>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.kb-bar-enter-active,
.kb-bar-leave-active {
  transition: transform 240ms cubic-bezier(0.16, 1, 0.3, 1);
}
.kb-bar-enter-from,
.kb-bar-leave-to {
  transform: translateY(100%);
}
</style>
