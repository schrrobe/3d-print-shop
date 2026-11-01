<script setup lang="ts">
import { PsSection } from '@print-shop/ui'
import type { LegalDocumentTranslation } from '@print-shop/utils'

defineProps<{ title: string; document: LegalDocumentTranslation }>()
const localePath = useLocalePath()
const { t, locale } = useI18n()
</script>

<template>
  <PsSection :title="title" heading-level="h1">
    <!-- Non-German locales get the English text (see getLegalDocument) -->
    <div
      class="max-w-[42rem] space-y-xl text-body-regular text-secondary"
      :lang="locale === 'de' ? 'de' : 'en'"
    >
      <p>{{ document.updatedAt }}</p>
      <p v-if="locale !== 'de'" class="text-caption" :lang="locale">
        {{ t('legal.translationNote') }}
      </p>
      <section v-for="section in document.sections" :key="section.heading">
        <h2 class="text-heading-small text-primary">{{ section.heading }}</h2>
        <p
          v-for="paragraph in section.paragraphs"
          :key="paragraph"
          class="mt-sm whitespace-pre-line"
        >
          {{ paragraph }}
        </p>
        <p v-if="section.contactForm" class="mt-sm">
          <NuxtLink class="underline" :to="localePath('/support')">{{
            section.contactForm
          }}</NuxtLink>
        </p>
        <div
          v-if="section.form"
          class="mt-md whitespace-pre-line rounded-card border border-subtle bg-surface-elevated p-lg text-primary"
        >
          {{ section.form.join('\n\n') }}
        </div>
      </section>
      <slot />
    </div>
  </PsSection>
</template>
