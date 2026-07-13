<script setup lang="ts">
import { PsSection } from '@print-shop/ui'
import type { LegalDocumentTranslation } from '../content/legal-translations'

defineProps<{ title: string; document: LegalDocumentTranslation }>()
</script>

<template>
  <PsSection :title="title" heading-level="h1">
    <div class="max-w-[42rem] space-y-xl text-body-regular text-secondary">
      <p>{{ document.updatedAt }}</p>
      <section v-for="section in document.sections" :key="section.heading">
        <h2 class="text-heading-small text-primary">{{ section.heading }}</h2>
        <p
          v-for="paragraph in section.paragraphs"
          :key="paragraph"
          class="mt-sm whitespace-pre-line"
        >
          {{ paragraph }}
        </p>
        <div
          v-if="section.form"
          class="mt-md whitespace-pre-line rounded-card border border-subtle bg-surface-elevated p-lg text-primary"
        >
          {{ section.form.join('\n\n') }}
        </div>
      </section>
    </div>
  </PsSection>
</template>
