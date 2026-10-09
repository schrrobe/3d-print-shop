<script setup lang="ts">
import { formatCents } from '@print-shop/utils'
import type { Locale } from '@print-shop/types'

const { t, locale } = useI18n()
const localePath = useLocalePath()

const [{ data: caliberData }, { data: productData }, { data: colorData }] = await Promise.all([
  useCalibers(),
  useProducts(),
  useColors(),
])

useSeo({
  title: () => t('seo.home.title'),
  description: () => t('seo.home.description'),
  fullTitle: true,
})

const calibers = computed(() => caliberData.value?.calibers ?? [])
const products = computed(() => productData.value?.products ?? [])
const colors = computed(() => colorData.value?.colors ?? [])
const families = computed(() => groupFamilies(products.value, locale.value))

const chosen = ref(calibers.value[0]?.slug ?? '')
const chosenCaliber = computed(() => calibers.value.find((c) => c.slug === chosen.value))

const chosenFamilies = computed(() =>
  families.value.filter((f) => f.lead.calibers?.some((c) => c.slug === chosen.value)),
)
const chosenSizes = computed(() => [
  ...new Set(
    chosenFamilies.value.flatMap((f) => f.products.map((p) => p.capacity)).filter(Boolean),
  ),
])
const chosenFrom = computed(() => {
  const prices = chosenFamilies.value.map((f) => f.fromPriceCents)
  return prices.length ? formatCents(Math.min(...prices), locale.value as Locale) : null
})
const targetSublabel = computed(() =>
  chosenSizes.value.length
    ? t('shop.product.sizesShort', { sizes: chosenSizes.value.join(' / ') })
    : '',
)

const steps = ['caliber', 'colors', 'print'] as const
</script>

<template>
  <div>
    <!-- First viewport: the target -->
    <section
      class="kb-wrap grid gap-5 pb-14 pt-6 md:grid-cols-[1fr_minmax(0,34rem)] md:grid-rows-[auto_auto_auto_1fr] md:gap-x-12 md:gap-y-6 md:pb-20 md:pt-14"
      data-testid="hero"
    >
      <h1
        class="kb-display text-[3rem] sm:text-[4.5rem] md:col-start-1 md:row-start-1 md:self-end lg:text-[5.75rem]"
        data-testid="animated-headline"
      >
        {{ t('shop.home.title') }}
      </h1>

      <div
        class="mx-auto w-full max-w-[15rem] sm:max-w-[24rem] md:col-start-2 md:row-span-4 md:row-start-1 md:max-w-none md:self-center"
      >
        <ShopTarget :label="chosenCaliber?.name ?? 'kaliberbox'" :sublabel="targetSublabel" />
      </div>

      <ShopCaliberPicker
        v-if="calibers.length"
        v-model="chosen"
        :calibers="calibers"
        :legend="t('shop.home.pickLegend')"
        class="md:col-start-1 md:row-start-3 md:max-w-[36rem]"
      />

      <div
        class="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-5 md:col-start-1 md:row-start-4 md:self-start"
      >
        <NuxtLink
          :to="localePath({ path: '/products', query: chosen ? { caliber: chosen } : {} })"
          class="kb-btn kb-btn-hit w-full text-[1.0625rem] sm:w-auto"
          data-testid="hero-cta-products"
        >
          {{
            chosenCaliber
              ? t('shop.home.cta', { caliber: chosenCaliber.name })
              : t('shop.home.ctaAll')
          }}
          <ShopIcon name="arrow-right" />
        </NuxtLink>
        <p v-if="chosenFrom" class="kb-num text-ink-2" aria-live="polite">
          {{ t('shop.product.fromPrice', { price: chosenFrom }) }}
        </p>
      </div>

      <p class="max-w-[34ch] text-[1.125rem] text-ink-2 md:col-start-1 md:row-start-2">
        {{ t('shop.home.lead') }}
      </p>
    </section>

    <!-- How it works: three entries in a ruled register -->
    <section class="border-y border-rule bg-paper-raised" aria-labelledby="how-title">
      <div class="kb-wrap py-14 md:py-20">
        <h2 id="how-title" class="kb-heading text-[2rem] md:text-[2.75rem]">
          {{ t('shop.home.howTitle') }}
        </h2>
        <ol class="mt-8 grid border-t border-ink md:grid-cols-3">
          <li
            v-for="(step, i) in steps"
            :key="step"
            class="grid grid-cols-[3rem_1fr] content-start gap-x-4 border-b border-rule py-6 md:grid-cols-1 md:border-b-0 md:border-r md:px-6 md:py-8 md:first:pl-0 md:last:border-r-0"
          >
            <span class="kb-display text-[2.5rem] text-hit md:text-[3.5rem]" aria-hidden="true">{{
              i + 1
            }}</span>
            <div class="md:mt-4">
              <h3 class="text-[1.25rem] font-bold">{{ t(`shop.home.steps.${step}.title`) }}</h3>
              <p class="mt-1 max-w-[38ch] text-ink-2">{{ t(`shop.home.steps.${step}.text`) }}</p>
            </div>
          </li>
        </ol>
      </div>
    </section>

    <!-- All boxes -->
    <section class="kb-wrap py-14 md:py-20" aria-labelledby="boxes-title">
      <div class="flex flex-wrap items-end justify-between gap-4">
        <h2 id="boxes-title" class="kb-heading text-[2rem] md:text-[2.75rem]">
          {{ t('shop.home.boxesTitle') }}
        </h2>
        <NuxtLink :to="localePath('/products')" class="kb-btn kb-btn-quiet">
          {{ t('shop.home.boxesAll') }}
        </NuxtLink>
      </div>
      <ul class="mt-6 divide-y divide-rule border-y border-ink" data-testid="home-products">
        <li v-for="family in families" :key="family.key">
          <ShopProductRow :family="family" :colors="colors" heading-level="h3" />
        </li>
      </ul>
    </section>

    <!-- Gift: the mirror field -->
    <section class="bg-mirror text-on-mirror" aria-labelledby="gift-title">
      <div class="kb-wrap grid gap-8 py-16 md:grid-cols-[1.2fr_1fr] md:items-center md:py-24">
        <div>
          <h2 id="gift-title" class="kb-display text-[2.75rem] md:text-[4rem]">
            {{ t('shop.home.gift.title') }}
          </h2>
          <p class="mt-5 max-w-[46ch] text-[1.125rem] text-on-mirror-2">
            {{ t('shop.home.gift.text') }}
          </p>
        </div>
        <ul class="flex flex-col border-t border-on-mirror/25">
          <li
            v-for="tip in ['ask', 'box', 'note']"
            :key="tip"
            class="flex gap-4 border-b border-on-mirror/25 py-4"
          >
            <ShopIcon :name="tip === 'note' ? 'gift' : 'check'" class="mt-0.5 text-hit" />
            <span>{{ t(`shop.home.gift.tips.${tip}`) }}</span>
          </li>
        </ul>
      </div>
    </section>

    <!-- Storage notice -->
    <section class="kb-wrap py-14 md:py-16">
      <ShopLegalNotice />
    </section>
  </div>
</template>
