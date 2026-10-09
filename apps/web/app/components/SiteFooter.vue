<script setup lang="ts">
const { t } = useI18n()
const localePath = useLocalePath()
const consent = useConsentStore()

const year = new Date().getFullYear()
</script>

<template>
  <footer class="bg-mirror text-on-mirror" data-testid="site-footer">
    <div class="kb-wrap grid gap-10 py-14 md:grid-cols-[1.4fr_1fr_1fr] md:gap-8">
      <div class="max-w-[24rem]">
        <p class="kb-display text-[2rem] text-on-mirror">
          kaliberbox<span class="text-on-mirror-2">.de</span>
        </p>
        <p class="mt-3 text-on-mirror-2">{{ t('shop.footer.claim') }}</p>
        <p class="mt-6 flex gap-3 text-sm text-on-mirror-2">
          <ShopIcon name="lock" :size="18" class="mt-0.5" />
          <span>{{ t('shop.legalNotice.short') }}</span>
        </p>
      </div>

      <nav :aria-label="t('shop.footer.shopNav')">
        <h2 class="kb-tick text-on-mirror-2">{{ t('shop.footer.shop') }}</h2>
        <ul class="mt-3">
          <li>
            <NuxtLink
              :to="localePath('/products')"
              class="flex min-h-11 items-center hover:underline"
            >
              {{ t('shop.nav.boxes') }}
            </NuxtLink>
          </li>
          <li>
            <NuxtLink
              :to="localePath('/wishlist')"
              class="flex min-h-11 items-center hover:underline"
            >
              {{ t('shop.nav.wishlist') }}
            </NuxtLink>
          </li>
          <li>
            <NuxtLink
              :to="localePath('/support')"
              class="flex min-h-11 items-center hover:underline"
            >
              {{ t('nav.support') }}
            </NuxtLink>
          </li>
          <li>
            <NuxtLink
              :to="localePath({ path: '/support', query: { topic: 'caliber' } })"
              class="flex min-h-11 items-center hover:underline"
            >
              {{ t('shop.caliberMissing.link') }}
            </NuxtLink>
          </li>
        </ul>
      </nav>

      <nav :aria-label="t('shop.footer.legalNav')">
        <h2 class="kb-tick text-on-mirror-2">{{ t('shop.footer.legal') }}</h2>
        <ul class="mt-3">
          <li>
            <NuxtLink
              :to="localePath('/legal/imprint')"
              class="flex min-h-11 items-center hover:underline"
            >
              {{ t('footer.imprint') }}
            </NuxtLink>
          </li>
          <li>
            <NuxtLink
              :to="localePath('/legal/privacy')"
              class="flex min-h-11 items-center hover:underline"
            >
              {{ t('footer.privacy') }}
            </NuxtLink>
          </li>
          <li>
            <NuxtLink
              :to="localePath('/legal/terms')"
              class="flex min-h-11 items-center hover:underline"
            >
              {{ t('footer.terms') }}
            </NuxtLink>
          </li>
          <li>
            <NuxtLink
              :to="localePath('/legal/withdrawal')"
              class="flex min-h-11 items-center hover:underline"
            >
              {{ t('footer.withdrawal') }}
            </NuxtLink>
          </li>
          <li>
            <button
              type="button"
              class="flex min-h-11 cursor-pointer items-center text-left hover:underline"
              data-testid="open-consent-settings"
              @click="consent.settingsOpen = true"
            >
              {{ t('consent.settings') }}
            </button>
          </li>
        </ul>
      </nav>
    </div>

    <div class="border-t border-on-mirror/15">
      <div
        class="kb-wrap flex flex-col gap-6 py-6 text-sm text-on-mirror-2 md:flex-row md:items-end md:justify-between"
      >
        <!-- Re-scope the light tokens so the switch reads on the mirror field -->
        <div
          class="[--kb-ink:var(--kb-on-mirror)] [--kb-paper:var(--kb-mirror)] [--kb-rule-strong:var(--kb-on-mirror-2)]"
        >
          <ShopThemeSwitch />
        </div>
        <p>© {{ year }} kaliberbox.de · {{ t('shop.footer.vat') }}</p>
      </div>
    </div>
  </footer>
</template>
