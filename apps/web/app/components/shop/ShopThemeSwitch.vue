<script setup lang="ts">
/** Native radio group for light / dark / system — arrow keys work out of the box. */
const { t } = useI18n()
const colorMode = useColorMode()
const name = useId()

const options = ['light', 'dark', 'system'] as const
</script>

<template>
  <fieldset class="min-w-0" data-testid="theme-toggle">
    <legend class="kb-label">{{ t('shop.nav.theme') }}</legend>
    <div class="inline-grid grid-cols-3 border border-rule-strong">
      <label
        v-for="option in options"
        :key="option"
        :data-theme-option="option"
        class="relative flex min-h-11 cursor-pointer items-center justify-center px-3 text-sm font-semibold has-[:checked]:bg-ink has-[:checked]:text-paper has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-hit"
      >
        <input
          v-model="colorMode.preference"
          type="radio"
          :name="name"
          :value="option"
          class="sr-only"
        />
        {{ t(`shop.nav.themes.${option}`) }}
      </label>
    </div>
  </fieldset>
</template>
