<script setup lang="ts">
import {
  PsHeroSection,
  PsMarquee,
  PsPillButton,
  PsProductCard,
  PsProductGrid,
  PsSection,
  PsStatCounter,
} from '@print-shop/ui'
import type { Locale } from '@print-shop/types'

const { t, locale } = useI18n()
const localePath = useLocalePath()
const { data } = useProducts()

const products = computed(() => data.value?.products ?? [])

/* Scroll-triggered animations: fade-up cards, parallax hero blob, pinned feature section */
const page = ref<HTMLElement | null>(null)
useMotion((gsap, ScrollTrigger) => {
  gsap.utils.toArray<HTMLElement>('[data-animate="fade-up"]').forEach((el) => {
    gsap.from(el, {
      y: 40,
      opacity: 0,
      duration: 0.8,
      ease: 'power3.out',
      scrollTrigger: { trigger: el, start: 'top 85%' },
    })
  })
  const blob = document.querySelector('[data-animate="parallax"]')
  if (blob) {
    gsap.to(blob, {
      yPercent: 30,
      ease: 'none',
      scrollTrigger: { trigger: page.value, start: 'top top', end: 'bottom top', scrub: true },
    })
  }
  const pinned = document.querySelector<HTMLElement>('[data-animate="pin"]')
  if (pinned && window.innerWidth >= 1024) {
    ScrollTrigger.create({ trigger: pinned, start: 'top 96px', end: '+=300', pin: true, pinSpacing: false })
  }
})
</script>

<template>
  <div ref="page">
    <PsHeroSection :eyebrow="t('hero.eyebrow')" :title="t('hero.title')" :subtitle="t('hero.subtitle')">
      <template #actions>
        <NuxtLink :to="localePath('/products')" data-testid="hero-cta-products">
          <PsPillButton size="xl">{{ t('hero.ctaProducts') }}</PsPillButton>
        </NuxtLink>
        <NuxtLink :to="localePath('/upload')" data-testid="hero-cta-upload">
          <PsPillButton size="xl" variant="secondary">{{ t('hero.ctaUpload') }}</PsPillButton>
        </NuxtLink>
      </template>
      <template #media>
        <div class="relative hidden items-center justify-center lg:flex" aria-hidden="true">
          <div
            data-animate="parallax"
            class="size-72 rounded-full-pill bg-brand/20 blur-3xl"
          />
          <ClientOnly>
            <ModelViewer :src="null" :color-hex-by-zone="{ zone_1_main: '#31a871', zone_2_accent: '#171717', zone_3_detail: '#f6f3ec', zone_4_text: '#e8b71a' }" class="absolute inset-x-2xl" />
          </ClientOnly>
        </div>
      </template>
    </PsHeroSection>

    <PsMarquee :duration-seconds="24" class="border-y border-subtle py-md text-secondary">
      <span v-for="n in 4" :key="n" class="mx-xl text-caption uppercase tracking-widest">
        PLA · PETG · Bambu Lab X1C · AMS 2 Pro · Made in Berlin ·
      </span>
    </PsMarquee>

    <PsSection :title="t('features.title')" data-animate="fade-up">
      <div class="grid gap-lg md:grid-cols-3" data-animate="pin-container">
        <div
          v-for="key in ['configure', 'print', 'ship']"
          :key="key"
          data-animate="fade-up"
          class="rounded-card border border-subtle bg-surface-elevated p-lg"
        >
          <h3 class="text-subheading">{{ t(`features.${key}.title`) }}</h3>
          <p class="mt-sm text-body-regular text-secondary">{{ t(`features.${key}.text`) }}</p>
        </div>
      </div>
    </PsSection>

    <PsSection tight data-animate="fade-up">
      <div class="grid gap-lg rounded-card border border-subtle bg-surface-elevated p-xl sm:grid-cols-3">
        <PsStatCounter :value="12500" suffix="+" :label="t('stats.printed')" />
        <PsStatCounter :value="32" :label="t('stats.colors')" />
        <PsStatCounter :value="48000" suffix="h" :label="t('stats.hours')" />
      </div>
    </PsSection>

    <PsSection :title="t('products.title')">
      <PsProductGrid data-testid="home-products">
        <NuxtLink
          v-for="product in products.slice(0, 3)"
          :key="product.id"
          :to="localePath(`/products/${product.slug}`)"
          data-animate="fade-up"
        >
          <PsProductCard
            :name="pickTranslation(product, locale).name"
            :price-cents="product.priceCents"
            :image-url="productImage(product)"
            :locale="locale as Locale"
          />
        </NuxtLink>
      </PsProductGrid>
      <div class="mt-xl text-center">
        <NuxtLink :to="localePath('/products')">
          <PsPillButton variant="secondary">{{ t('products.all') }}</PsPillButton>
        </NuxtLink>
      </div>
    </PsSection>
  </div>
</template>
