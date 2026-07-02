<script setup lang="ts">
import { LOCALES } from '@print-shop/types'
import {
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuRoot,
  DropdownMenuTrigger,
} from 'radix-vue'

withDefaults(defineProps<{ locales?: readonly string[] }>(), { locales: () => LOCALES })

const model = defineModel<string>({ default: 'de' })
</script>

<template>
  <DropdownMenuRoot>
    <DropdownMenuTrigger
      class="inline-flex cursor-pointer items-center gap-sm rounded-full-pill bg-white-translucent px-md py-sm text-caption uppercase text-primary transition-colors duration-200 hover:bg-surface-elevated focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
      aria-label="Sprache wählen"
      data-testid="language-switcher"
    >
      {{ model.toUpperCase() }}
      <span class="text-secondary" aria-hidden="true">▾</span>
    </DropdownMenuTrigger>
    <DropdownMenuPortal>
      <DropdownMenuContent
        class="z-50 min-w-24 rounded-card border border-subtle bg-surface-elevated p-xs shadow-card"
        :side-offset="4"
        align="end"
      >
        <DropdownMenuItem
          v-for="locale in locales"
          :key="locale"
          class="flex cursor-pointer items-center justify-between gap-sm rounded-card px-md py-sm text-body-regular uppercase text-primary outline-none data-[highlighted]:bg-brand data-[highlighted]:text-on-brand"
          :data-locale="locale"
          @select="model = locale"
        >
          {{ locale.toUpperCase() }}
          <span v-if="locale === model" aria-hidden="true">✓</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenuPortal>
  </DropdownMenuRoot>
</template>
