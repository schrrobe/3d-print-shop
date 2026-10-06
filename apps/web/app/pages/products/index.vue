<script setup lang="ts">
import type { ApiProduct } from '~/composables/useShop'

const { t, locale } = useI18n()
const localePath = useLocalePath()
const route = useRoute()
const router = useRouter()

// Caliber filter lives in the URL (?caliber=9mm-luger) so it can be shared and survives back/forward
const caliber = computed<string>({
  get: () => (typeof route.query.caliber === 'string' ? route.query.caliber : ''),
  set: (value) => {
    void router.replace({ query: { ...route.query, caliber: value || undefined } })
  },
})

const searchInput = ref('')
const searchQuery = ref('')
let debounce: ReturnType<typeof setTimeout>
watch(searchInput, (value) => {
  clearTimeout(debounce)
  debounce = setTimeout(() => {
    searchQuery.value = value
  }, 300)
})

const [{ data, status }, { data: caliberData }, { data: colorData }] = await Promise.all([
  useFetch<{ products: ApiProduct[] }>('/api/products', {
    query: {
      q: computed(() => searchQuery.value.trim() || undefined),
      caliber: computed(() => caliber.value || undefined),
    },
  }),
  useCalibers(),
  useColors(),
])

const calibers = computed(() => caliberData.value?.calibers ?? [])
const colors = computed(() => colorData.value?.colors ?? [])
const families = computed(() => groupFamilies(data.value?.products ?? [], locale.value))
const activeCaliber = computed(() => calibers.value.find((c) => c.slug === caliber.value))
const filtered = computed(() => Boolean(caliber.value || searchQuery.value.trim()))
const noResults = computed(
  () => status.value !== 'pending' && families.value.length === 0 && filtered.value,
)

const wishQuery = computed(() => ({
  topic: 'caliber',
  caliber: searchQuery.value.trim() || activeCaliber.value?.name || undefined,
}))

function resetFilters() {
  searchInput.value = ''
  searchQuery.value = ''
  caliber.value = ''
}

useSeo({
  title: () =>
    activeCaliber.value
      ? t('shop.list.titleFor', { caliber: activeCaliber.value.name })
      : t('products.title'),
  description: () => t('seo.products.description'),
})
</script>

<template>
  <div class="kb-wrap pb-16 pt-8 md:pb-24 md:pt-12">
    <h1 class="kb-display text-[3rem] sm:text-[4rem]">{{ t('products.title') }}</h1>
    <p class="mt-3 max-w-[52ch] text-[1.125rem] text-ink-2">{{ t('shop.list.lead') }}</p>

    <div
      class="mt-8 grid gap-6 border-y border-ink py-6 lg:grid-cols-[1fr_20rem] lg:items-start lg:gap-10"
    >
      <ShopCaliberPicker
        v-if="calibers.length"
        v-model="caliber"
        :calibers="calibers"
        :legend="t('shop.list.filterLegend')"
        legend-visible
        :all-label="t('shop.list.allCalibers')"
      />
      <div data-testid="product-search">
        <label for="product-search-input" class="kb-label">{{ t('shop.list.searchLabel') }}</label>
        <div class="relative">
          <ShopIcon
            name="search"
            :size="18"
            class="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-2"
          />
          <input
            id="product-search-input"
            v-model="searchInput"
            type="search"
            class="kb-input pl-10"
            :placeholder="t('products.search.placeholder')"
            autocomplete="off"
            enterkeyhint="search"
          />
        </div>
      </div>
    </div>

    <p class="kb-tick mt-6 text-ink-2" role="status" aria-live="polite">
      <template v-if="status === 'pending'">{{ t('common.loading') }}</template>
      <template v-else>{{
        t('shop.list.count', { count: families.length }, families.length)
      }}</template>
    </p>

    <div
      v-if="noResults"
      class="mt-4 border border-ink p-6 md:p-8"
      data-testid="product-search-empty"
    >
      <p class="kb-heading text-[1.75rem]">{{ t('products.search.noResults') }}</p>
      <p class="mt-2 max-w-[56ch] text-ink-2">{{ t('shop.caliberMissing.text') }}</p>
      <div class="mt-5 flex flex-wrap gap-3">
        <NuxtLink
          :to="localePath({ path: '/support', query: wishQuery })"
          class="kb-btn kb-btn-ink"
        >
          {{ t('shop.caliberMissing.cta') }}
        </NuxtLink>
        <button type="button" class="kb-btn kb-btn-line" @click="resetFilters">
          {{ t('shop.list.reset') }}
        </button>
      </div>
    </div>

    <ul v-else class="mt-2 divide-y divide-rule border-b border-ink" data-testid="product-grid">
      <li v-for="family in families" :key="family.key" :data-testid="`product-${family.lead.slug}`">
        <ShopProductRow :family="family" :colors="colors" />
      </li>
    </ul>

    <aside
      class="mt-12 flex flex-col gap-4 bg-paper-sunk p-6 sm:flex-row sm:items-center sm:justify-between md:p-8"
    >
      <div>
        <h2 class="font-bold">{{ t('shop.caliberMissing.title') }}</h2>
        <p class="mt-1 text-ink-2">{{ t('shop.caliberMissing.text') }}</p>
      </div>
      <NuxtLink
        :to="localePath({ path: '/support', query: wishQuery })"
        class="kb-btn kb-btn-line shrink-0"
      >
        {{ t('shop.caliberMissing.cta') }}
      </NuxtLink>
    </aside>
  </div>
</template>
