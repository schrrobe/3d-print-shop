<script setup lang="ts">
import { WITHDRAWAL_FUNCTION_PATH, withdrawalDocument } from '@print-shop/utils'

const { t } = useI18n()
const localePath = useLocalePath()
const { company, shopUrl } = useLegalCompany()
const document = withdrawalDocument(company, shopUrl)

useSeo({
  title: () => t('legal.withdrawalTitle'),
  description: () => t('seo.legal.description'),
})
</script>

<template>
  <LegalDocumentView :document="document" testid="legal-withdrawal">
    <NuxtLink
      :to="localePath(WITHDRAWAL_FUNCTION_PATH)"
      class="kb-btn kb-btn-ink inline-flex"
      data-testid="withdrawal-function-link"
    >
      {{ t('withdraw.button') }}
    </NuxtLink>
  </LegalDocumentView>
</template>
