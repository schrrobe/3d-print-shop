<script setup lang="ts">
import { termsDocument } from '@print-shop/utils'

const { t } = useI18n()
const { company, shopUrl } = useLegalCompany()
const document = termsDocument(company, shopUrl)

useSeo({
  title: () => t('seo.legal.terms'),
  description: () => t('seo.legal.description'),
})
</script>

<template>
  <LegalDocumentView :document="document" testid="legal-terms" />
</template>
