<script setup lang="ts">
const { t } = useI18n()
const localePath = useLocalePath()
const route = useRoute()
const cart = useCartStore()
const wishlist = useWishlistStore()

onMounted(() => {
  cart.hydrate()
  wishlist.hydrate()
})

const links = computed(() => [
  { to: localePath('/products'), label: t('shop.nav.boxes') },
  { to: localePath('/wishlist'), label: t('shop.nav.wishlist'), count: wishlist.count },
  { to: localePath('/support'), label: t('nav.support') },
])

function isActive(to: string) {
  return route.path.startsWith(to)
}

const menu = ref<HTMLDialogElement | null>(null)
const menuOpen = ref(false)

function openMenu() {
  menuOpen.value = true
  nextTick(() => menu.value?.showModal())
}
function closeMenu() {
  menu.value?.close()
}

// Close the menu on navigation
watch(
  () => route.fullPath,
  () => closeMenu(),
)

const cartLabel = computed(() =>
  cart.count > 0 ? t('shop.nav.cartWithCount', { count: cart.count }) : t('nav.cart'),
)
</script>

<template>
  <header
    class="sticky top-0 z-30 border-b border-rule bg-paper/95 supports-[backdrop-filter]:bg-paper/85 supports-[backdrop-filter]:backdrop-blur-md"
    data-testid="site-header"
  >
    <div class="kb-wrap flex h-16 items-center gap-4">
      <NuxtLink
        :to="localePath('/')"
        class="-ml-1 inline-flex min-h-11 items-center px-1"
        :aria-label="t('shop.nav.homeLabel')"
      >
        <ShopMark />
      </NuxtLink>

      <nav class="ml-6 hidden md:block" :aria-label="t('shop.nav.main')">
        <ul class="flex items-center gap-1">
          <li v-for="link in links" :key="link.to">
            <NuxtLink
              :to="link.to"
              class="relative inline-flex min-h-11 items-center gap-1.5 px-3 font-semibold text-ink-2 hover:text-ink aria-[current=page]:text-ink"
              :aria-current="isActive(link.to) ? 'page' : undefined"
            >
              {{ link.label }}
              <span v-if="link.count" class="kb-num text-sm font-medium text-ink-2"
                >({{ link.count }})</span
              >
              <span
                v-if="isActive(link.to)"
                class="absolute inset-x-3 -bottom-[11px] h-0.5 bg-hit"
                aria-hidden="true"
              />
            </NuxtLink>
          </li>
        </ul>
      </nav>

      <div class="ml-auto flex items-center gap-1">
        <div class="hidden md:block">
          <ShopLanguageMenu />
        </div>
        <NuxtLink
          :to="localePath('/cart')"
          class="kb-btn kb-btn-icon relative gap-2 md:px-3"
          :class="route.path.startsWith(localePath('/cart')) ? 'text-hit' : ''"
          :aria-label="cartLabel"
          data-testid="cart-link"
        >
          <ShopIcon name="cart" :size="22" />
          <span class="hidden font-semibold md:inline">{{ t('nav.cart') }}</span>
          <span
            v-if="cart.count > 0"
            class="kb-num absolute right-0.5 top-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-hit px-1 text-xs font-bold text-on-hit md:static md:h-6 md:min-w-6"
            data-testid="cart-count"
            aria-hidden="true"
            >{{ cart.count }}</span
          >
        </NuxtLink>
        <button
          type="button"
          class="kb-btn kb-btn-icon md:hidden"
          :aria-label="t('shop.nav.openMenu')"
          aria-haspopup="dialog"
          :aria-expanded="menuOpen"
          data-testid="menu-open"
          @click="openMenu"
        >
          <ShopIcon name="menu" :size="24" />
        </button>
      </div>
    </div>

    <dialog
      ref="menu"
      class="m-0 h-dvh max-h-none w-full max-w-none bg-paper p-0 text-ink backdrop:bg-transparent"
      :aria-label="t('shop.nav.menu')"
      data-testid="mobile-menu"
      @close="menuOpen = false"
    >
      <div v-if="menuOpen" class="flex min-h-full flex-col">
        <div class="kb-wrap flex h-16 items-center justify-between border-b border-rule">
          <ShopMark />
          <button
            type="button"
            class="kb-btn kb-btn-icon -mr-2"
            :aria-label="t('shop.nav.closeMenu')"
            autofocus
            @click="closeMenu"
          >
            <ShopIcon name="close" :size="24" />
          </button>
        </div>
        <nav class="kb-wrap py-6" :aria-label="t('shop.nav.main')">
          <ul class="border-t border-rule">
            <li
              v-for="link in [{ to: localePath('/'), label: t('nav.home') }, ...links]"
              :key="link.to"
            >
              <NuxtLink
                :to="link.to"
                class="kb-heading flex min-h-16 items-center justify-between border-b border-rule text-[1.75rem]"
              >
                {{ link.label }}
                <ShopIcon name="arrow-right" :size="22" class="text-ink-2" />
              </NuxtLink>
            </li>
          </ul>
        </nav>
        <div class="kb-wrap mt-auto flex flex-col gap-6 pb-10">
          <div>
            <p class="kb-label">{{ t('shop.nav.language') }}</p>
            <ShopLanguageMenu inline />
          </div>
          <ShopThemeSwitch />
        </div>
      </div>
    </dialog>
  </header>
</template>
