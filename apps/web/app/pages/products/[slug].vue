<script setup lang="ts">
import {
  PsAccordion,
  PsColorPicker,
  PsConfigurationPreview,
  PsPillButton,
  PsPrice,
  PsProductGallery,
  PsRatingStars,
  PsReviewCard,
  PsSection,
  PsWishlistButton,
  useToast,
} from '@print-shop/ui'
import type { ConfigurationZone } from '@print-shop/ui'
import type { ApiProduct } from '~/composables/useShop'
import type { PublicReview } from '~/composables/useReviews'
import { useWishlist } from '~/composables/useWishlist'

const route = useRoute()
const router = useRouter()
const { t, locale } = useI18n()
const localePath = useLocalePath()
const config = useRuntimeConfig()
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
const siteUrl = config.public.siteUrl.replace(/\/$/, '')
const absoluteUrl = (url: string) => (url.startsWith('http') ? url : `${siteUrl}${url}`)
const seoImage = computed(() => productImage(product.value, 1200))
const jsonLdImages = computed(() => galleryImages.value.map((image) => absoluteUrl(image.url)))
const breadcrumbItems = computed(() => [
  { name: t('products.title'), url: absoluteUrl(localePath('/products')) },
  { name: translation.value.name, url: absoluteUrl(localePath(`/products/${slug}`)) },
])

// ---- Configuration state ----
const selection = ref<Record<string, string>>({})
watchEffect(() => {
  for (const zone of product.value.colorSlots) {
    if (!selection.value[zone.slot] && zone.defaultColorId) {
      selection.value[zone.slot] = zone.defaultColorId
    }
  }
})

function resetToDefaults() {
  const next: Record<string, string> = {}
  for (const zone of product.value.colorSlots) {
    if (zone.defaultColorId) next[zone.slot] = zone.defaultColorId
  }
  selection.value = next
}

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

// Colors selected in a zone that are currently unavailable (out of stock / inactive)
const unavailableZones = computed(() =>
  product.value.colorSlots
    .map((zone) => {
      const color = colors.value.find((c) => c.id === selection.value[zone.slot])
      const unavailable = color ? color.outOfStock === true || color.active === false : false
      return { slot: zone.slot, label: zone.label, colorName: color?.name ?? '', unavailable }
    })
    .filter((z) => z.unavailable),
)

// ---- Load a shared configuration via ?config=TOKEN ----
const configWarning = ref<string[]>([])
async function applyConfigToken(shareToken: string) {
  try {
    const config = await loadConfiguration(shareToken)
    selection.value = { ...selection.value, ...config.selectedColors }
    configWarning.value = Object.entries(config.availability)
      .filter(([, state]) => state !== 'ok')
      .map(([zoneSlot, state]) => {
        const zone = product.value.colorSlots.find((z) => z.slot === zoneSlot)
        return t(`configurator.availability.${state}`, { zone: zone?.label ?? zoneSlot })
      })
  } catch {
    toast.show(t('configurator.loadError'), { variant: 'error' })
  }
}

// ---- Cart edit mode via ?edit=KEY (replace an existing cart line) ----
const editKey = computed(() => (route.query.edit ? String(route.query.edit) : null))
onMounted(() => {
  cart.hydrate()
  wishlist.hydrate()
  if (route.query.config) applyConfigToken(String(route.query.config))
  if (editKey.value) {
    const line = cart.items.find((i) => i.key === editKey.value)
    if (line) {
      selection.value = { ...line.colorSelection }
      quantity.value = line.quantity
    }
  }
})

const quantity = ref(1)

async function openConfigurator() {
  configuratorAccordionValue.value = CONFIGURATOR_ACCORDION_VALUE
  await nextTick()
  configuratorSection.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function buildLine(qty: number) {
  return {
    productId: product.value.id,
    slug: product.value.slug,
    name: translation.value.name,
    unitPriceCents: product.value.priceCents,
    quantity: qty,
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

// ---- Wishlist ----
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

// ---- Share configuration ----
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

// ---- Popular combinations ----
interface PopularCombo {
  selectedColors: Record<string, string>
  count: number
  swatches: { slot: string; colorId: string; hex: string; name: string }[]
  available: boolean
}
const { data: popularData } = await useFetch<{ combinations: PopularCombo[] }>(
  `/api/products/${slug}/popular-configurations`,
  { server: false },
)
const popular = computed(() => popularData.value?.combinations ?? [])
function applyCombo(combo: PopularCombo) {
  selection.value = { ...selection.value, ...combo.selectedColors }
}

// ---- Reviews ----
interface ProductReviews {
  reviews: PublicReview[]
  averageRating: number | null
  count: number
}
const { data: reviewData } = await useFetch<ProductReviews>(`/api/products/${slug}/reviews`, {
  server: false,
  default: (): ProductReviews => ({ reviews: [], averageRating: null, count: 0 }),
})

// Preview zones for the current selection
const previewZones = computed<ConfigurationZone[]>(() =>
  product.value.colorSlots.map((zone) => {
    const color = colors.value.find((c) => c.id === selection.value[zone.slot])
    return {
      slot: zone.slot,
      label: zone.label,
      colorName: color?.name ?? '',
      hex: color?.hex ?? '#000000',
      unavailable: color ? color.outOfStock === true || color.active === false : false,
    }
  }),
)

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
        if (reviewData.value.count > 0 && reviewData.value.averageRating) {
          jsonLd.aggregateRating = {
            '@type': 'AggregateRating',
            ratingValue: reviewData.value.averageRating,
            reviewCount: reviewData.value.count,
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
      <!-- Product photos -->
      <PsProductGallery
        :images="galleryImages"
        :placeholder-label="t('products.gallery.placeholder')"
      />

      <!-- Product info + purchase -->
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

        <div
          class="flex flex-col gap-md rounded-card border border-subtle bg-surface-elevated p-md"
          data-testid="purchase-panel"
        >
          <PsPrice :cents="product.priceCents" size="lg" class="block text-brand" />
          <button
            v-if="product.colorSlots.length > 0"
            type="button"
            class="rounded-card border border-transparent p-sm text-left transition-colors hover:border-brand hover:bg-surface focus-visible:outline-2 focus-visible:outline-brand"
            :aria-label="t('configurator.title')"
            data-testid="purchase-configuration-summary"
            @click="openConfigurator"
          >
            <PsConfigurationPreview
              :zones="previewZones"
              :unavailable-label="t('configurator.unavailableShort')"
            />
          </button>
          <div class="flex flex-wrap items-center gap-md">
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
              {{ editKey ? t('cart.saveChanges') : t('products.addToCart') }}
            </PsPillButton>
          </div>
        </div>

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

    <!-- Configurator: 3D preview + colour selection (moved below the photos) -->
    <section
      v-if="product.colorSlots.length > 0"
      ref="configuratorSection"
      class="mt-3xl scroll-mt-xl"
      data-testid="configurator"
    >
      <PsAccordion
        v-model="configuratorAccordionValue"
        :items="configuratorAccordionItems"
        default-value="configurator"
        data-testid="configurator-accordion"
      >
        <template #configurator>
          <div class="grid gap-2xl text-primary lg:grid-cols-2">
            <div>
              <ClientOnly>
                <ModelViewer :src="productGlb(product)" :color-hex-by-zone="colorHexByZone" />
                <template #fallback>
                  <div
                    class="aspect-square w-full rounded-card border border-subtle bg-surface-elevated"
                  />
                </template>
              </ClientOnly>
              <p class="mt-sm text-center text-caption text-secondary">
                {{ t('products.viewer.hint') }}
              </p>
              <div class="mt-md">
                <PsConfigurationPreview
                  :zones="previewZones"
                  :unavailable-label="t('configurator.unavailableShort')"
                />
              </div>
            </div>

            <div class="flex flex-col gap-lg">
              <!-- Popular combinations -->
              <div v-if="popular.length" data-testid="popular-combos">
                <h3 class="mb-sm text-label-medium">{{ t('configurator.popular') }}</h3>
                <div class="flex flex-wrap gap-sm">
                  <button
                    v-for="(combo, i) in popular"
                    :key="i"
                    type="button"
                    class="flex items-center gap-xs rounded-card border border-subtle bg-surface-elevated px-sm py-xs hover:border-brand"
                    :class="{ 'opacity-50': !combo.available }"
                    data-testid="popular-combo"
                    @click="applyCombo(combo)"
                  >
                    <span
                      v-for="sw in combo.swatches"
                      :key="sw.slot"
                      class="inline-block h-4 w-4 rounded-full border border-subtle"
                      :style="{ backgroundColor: sw.hex }"
                      :title="sw.name"
                    />
                    <span class="text-caption text-secondary">×{{ combo.count }}</span>
                  </button>
                </div>
              </div>

              <div>
                <h3 class="mb-md text-label-medium">{{ t('products.configure') }}</h3>
                <PsColorPicker
                  v-model="selection"
                  :zones="product.colorSlots.map((s) => ({ slot: s.slot, label: s.label }))"
                  :colors="colors"
                />
                <div class="mt-md flex flex-wrap gap-sm">
                  <button
                    type="button"
                    class="text-caption text-secondary hover:text-primary"
                    data-testid="config-reset"
                    @click="resetToDefaults"
                  >
                    ↺ {{ t('configurator.reset') }}
                  </button>
                  <button
                    type="button"
                    class="text-caption text-brand hover:underline"
                    data-testid="config-share"
                    @click="shareConfig"
                  >
                    🔗 {{ t('configurator.share') }}
                  </button>
                </div>

                <!-- Unavailable-color warnings -->
                <p
                  v-for="warn in configWarning"
                  :key="warn"
                  class="mt-sm text-caption text-amber-500"
                  data-testid="config-warning"
                >
                  ⚠️ {{ warn }}
                </p>
                <p
                  v-for="zone in unavailableZones"
                  :key="zone.slot"
                  class="mt-sm text-caption text-amber-500"
                  data-testid="config-unavailable"
                >
                  ⚠️
                  {{
                    t('configurator.unavailableZone', { zone: zone.label, color: zone.colorName })
                  }}
                </p>
              </div>
            </div>
          </div>
        </template>
      </PsAccordion>
    </section>

    <!-- Reviews -->
    <section class="mx-auto mt-3xl max-w-[52rem]" data-testid="product-reviews">
      <div class="flex flex-wrap items-center gap-md">
        <h2 class="text-heading-small">{{ t('reviews.title') }}</h2>
        <div v-if="reviewData.count > 0" class="flex items-center gap-sm">
          <PsRatingStars
            :rating="reviewData.averageRating ?? 0"
            :aria-label-text="t('reviews.ratingLabel', { rating: reviewData.averageRating })"
          />
          <span class="text-caption text-secondary">
            {{ t('reviews.count', { count: reviewData.count }) }}
          </span>
        </div>
      </div>

      <p v-if="reviewData.count === 0" class="mt-md text-body-regular text-secondary">
        {{ t('reviews.empty') }}
      </p>
      <div v-else class="mt-lg flex flex-col gap-md">
        <PsReviewCard
          v-for="review in reviewData.reviews"
          :key="review.id"
          :rating="review.rating"
          :title="review.title"
          :body="review.body"
          :display-name="review.displayName"
          :photo-url="review.photoUrl"
          :photo-alt-label="t('reviews.photoAlt', { name: review.displayName })"
          :date-label="new Date(review.createdAt).toLocaleDateString(locale)"
          :rating-aria-label="t('reviews.ratingLabel', { rating: review.rating })"
        />
      </div>
    </section>
  </PsSection>
</template>
