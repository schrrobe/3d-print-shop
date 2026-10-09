<script setup lang="ts">
import { formatCents } from '@print-shop/utils'
import type { Locale } from '@print-shop/types'
import type { ApiColor } from '~/composables/useShop'
import type { ProductFamily } from '~/composables/useCalibers'

/** One caliber box family as a ruled register row — the whole row is the link. */
const props = defineProps<{
  family: ProductFamily
  colors: ApiColor[]
  headingLevel?: 'h2' | 'h3'
}>()

const { t, locale } = useI18n()
const localePath = useLocalePath()

const colorsFor = computed(() => boxColors(props.family.lead, props.colors))
const sizes = computed(() =>
  props.family.products.map((p) => p.capacity).filter((c): c is number => typeof c === 'number'),
)
const sizesLabel = computed(() =>
  sizes.value.length > 0
    ? t('shop.product.sizesShort', { sizes: sizes.value.join(' / ') })
    : pickTranslation(props.family.lead, locale.value).name,
)
const price = computed(() => formatCents(props.family.fromPriceCents, locale.value as Locale))
const priceLabel = computed(() =>
  props.family.products.length > 1
    ? t('shop.product.fromPrice', { price: price.value })
    : price.value,
)
</script>

<template>
  <NuxtLink
    :to="localePath(`/products/${family.lead.slug}`)"
    class="group grid grid-cols-[4.5rem_1fr_auto] items-center gap-x-4 gap-y-1 py-4 sm:grid-cols-[6.5rem_1fr_auto] sm:gap-x-6 sm:py-5"
    data-testid="product-card"
  >
    <span
      class="row-span-2 block border border-rule bg-paper-sunk p-1.5 transition-colors group-hover:border-ink"
    >
      <ShopBoxDrawing
        compact
        :capacity="family.lead.capacity"
        :box-hex="colorsFor.box"
        :label-hex="colorsFor.label"
        :caliber-label="family.caliberName"
        :socket-scale="socketScale(family.lead.calibers?.[0]?.slug)"
      />
    </span>
    <component
      :is="props.headingLevel ?? 'h2'"
      class="kb-display self-end text-[2rem] decoration-hit decoration-2 underline-offset-4 group-hover:underline sm:text-[2.75rem]"
      data-testid="product-caliber"
    >
      {{ family.caliberName }}
    </component>
    <span class="row-span-2 flex items-center gap-2 self-center text-right">
      <span class="kb-num font-bold" data-testid="price">{{ priceLabel }}</span>
      <ShopIcon
        name="arrow-right"
        :size="20"
        class="text-ink-2 transition-transform group-hover:translate-x-0.5 group-hover:text-hit"
      />
    </span>
    <span class="self-start text-sm text-ink-2">
      <span v-if="family.group" class="hidden sm:inline"
        >{{ t(`shop.caliberGroups.${family.group}`) }} · </span
      ><span class="whitespace-nowrap">{{ sizesLabel }}</span>
    </span>
  </NuxtLink>
</template>
