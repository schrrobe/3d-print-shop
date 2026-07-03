<script setup lang="ts">
import { PsLanguageSwitcher, PsNavPill, PsThemeToggle } from '@print-shop/ui'
import { LOCALES } from '@print-shop/types'

const { t, locale, setLocale } = useI18n()
const localePath = useLocalePath()
const route = useRoute()
const cart = useCartStore()
const colorMode = useColorMode()

onMounted(() => cart.hydrate())

const themeModel = computed({
  get: () => colorMode.preference as 'dark' | 'light' | 'system',
  set: (value) => {
    colorMode.preference = value
  },
})

const localeModel = computed({
  get: () => locale.value,
  set: (value) => setLocale(value as typeof locale.value),
})

const links = computed(() => [
  { to: localePath('/'), label: t('nav.home'), exact: true },
  { to: localePath('/products'), label: t('nav.products') },
  { to: localePath('/upload'), label: t('nav.upload') },
  { to: localePath('/support'), label: t('nav.support') },
])

function isActive(to: string, exact?: boolean) {
  return exact ? route.path === to : route.path.startsWith(to) && to !== localePath('/')
}
</script>

<template>
  <header
    class="sticky top-0 z-30 border-b border-subtle bg-surface/90 backdrop-blur-sm"
    data-testid="site-header"
  >
    <div class="mx-auto flex max-w-[72rem] items-center justify-between gap-md px-md py-md">
      <NuxtLink :to="localePath('/')" class="flex items-center gap-sm text-label-medium font-semibold">
        <span class="inline-block size-3 rounded-full-pill bg-brand" aria-hidden="true" />
        Print Shop
      </NuxtLink>

      <nav class="hidden items-center gap-sm md:flex" :aria-label="t('nav.home')">
        <NuxtLink v-for="link in links" :key="link.to" :to="link.to">
          <PsNavPill :active="isActive(link.to, link.exact)" as="button">{{ link.label }}</PsNavPill>
        </NuxtLink>
      </nav>

      <div class="flex items-center gap-sm">
        <PsLanguageSwitcher v-model="localeModel" :locales="LOCALES" />
        <PsThemeToggle v-model="themeModel" />
        <NuxtLink :to="localePath('/cart')" data-testid="cart-link">
          <PsNavPill :active="route.path.startsWith(localePath('/cart'))" as="button">
            {{ t('nav.cart') }}
            <span
              v-if="cart.count > 0"
              class="ml-xs inline-flex size-5 items-center justify-center rounded-full-pill bg-brand text-[11px] font-semibold text-on-brand"
              data-testid="cart-count"
              >{{ cart.count }}</span
            >
          </PsNavPill>
        </NuxtLink>
      </div>
    </div>
  </header>
</template>
