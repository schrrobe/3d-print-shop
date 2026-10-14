<script setup lang="ts">
import { PsSection } from '@print-shop/ui'
import type { LegalDocument } from '@print-shop/utils'

defineProps<{ document: LegalDocument; testid?: string }>()
const { t, locale } = useI18n()
</script>

<template>
  <PsSection :title="document.title" heading-level="h1">
    <div class="max-w-[42rem] space-y-xl text-body-regular text-secondary" :data-testid="testid">
      <p v-if="locale !== 'de'" lang="en" class="rounded-card border border-subtle p-md">
        {{ t('legal.germanOnly') }}
      </p>
      <p>{{ document.updatedAt }}</p>
      <slot />
      <section v-for="section in document.sections" :key="section.heading" lang="de">
        <h2 class="text-heading-small text-primary">{{ section.heading }}</h2>
        <p v-for="paragraph in section.paragraphs" :key="paragraph" class="mt-sm">
          {{ paragraph }}
        </p>
        <div
          v-if="section.form"
          class="mt-md space-y-lg whitespace-pre-line rounded-card border border-subtle bg-surface-elevated p-lg text-primary"
        >
          <p v-for="line in section.form" :key="line">{{ line }}</p>
        </div>
      </section>
    </div>
  </PsSection>
</template>
