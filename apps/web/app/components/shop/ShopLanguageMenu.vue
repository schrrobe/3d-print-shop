<script setup lang="ts">
import { LOCALES } from '@print-shop/types'

/** Disclosure-style language picker (button + list). `inline` renders the list without a popover. */
const props = defineProps<{ inline?: boolean }>()

const { t, locale, setLocale } = useI18n()
const open = ref(false)
const root = ref<HTMLElement | null>(null)
const listId = useId()

const names: Record<string, string> = {
  de: 'Deutsch',
  en: 'English',
  pl: 'Polski',
  fr: 'Français',
  nl: 'Nederlands',
  cs: 'Čeština',
}

function choose(code: string) {
  open.value = false
  void setLocale(code as typeof locale.value)
}

function onDocumentClick(event: MouseEvent) {
  if (open.value && root.value && !root.value.contains(event.target as Node)) open.value = false
}

onMounted(() => document.addEventListener('click', onDocumentClick))
onBeforeUnmount(() => document.removeEventListener('click', onDocumentClick))
</script>

<template>
  <div v-if="props.inline" role="group" :aria-label="t('shop.nav.language')">
    <ul class="grid grid-cols-2 gap-px border border-rule bg-rule sm:grid-cols-3">
      <li v-for="code in LOCALES" :key="code">
        <button
          type="button"
          class="flex min-h-12 w-full items-center justify-between gap-2 bg-paper px-4 text-left"
          :class="code === locale ? 'font-bold' : ''"
          :aria-current="code === locale ? 'true' : undefined"
          :lang="code"
          @click="choose(code)"
        >
          {{ names[code] }}
          <ShopIcon v-if="code === locale" name="check" :size="18" class="text-hit" />
        </button>
      </li>
    </ul>
  </div>

  <div v-else ref="root" class="relative" @keydown.esc="open = false">
    <button
      type="button"
      class="kb-btn kb-btn-icon gap-1 px-2 text-sm uppercase"
      :aria-expanded="open"
      :aria-controls="listId"
      :aria-label="t('shop.nav.languageCurrent', { language: names[locale] })"
      data-testid="language-switcher"
      @click="open = !open"
    >
      <span class="kb-num font-semibold">{{ locale }}</span>
      <ShopIcon name="chevron-down" :size="16" />
    </button>
    <ul
      v-show="open"
      :id="listId"
      class="absolute right-0 top-full z-50 mt-1 min-w-[11rem] border border-ink bg-paper-raised py-1 shadow-[0_8px_24px_-8px_rgba(0,0,0,0.35)]"
    >
      <li v-for="code in LOCALES" :key="code">
        <button
          type="button"
          class="flex min-h-11 w-full items-center justify-between gap-3 px-4 text-left hover:bg-paper-sunk"
          :class="code === locale ? 'font-bold' : ''"
          :aria-current="code === locale ? 'true' : undefined"
          :lang="code"
          :data-locale="code"
          @click="choose(code)"
        >
          {{ names[code] }}
          <ShopIcon v-if="code === locale" name="check" :size="18" class="text-hit" />
        </button>
      </li>
    </ul>
  </div>
</template>
