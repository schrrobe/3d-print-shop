<script setup lang="ts">
import { PsButton, PsInput, PsSection } from '@print-shop/ui'
import { requestPortalLink } from '~/composables/usePortal'

/** Request a magic link. Anti-enumeration: the server always answers 202. */
const { t, locale } = useI18n()

// Not a private token page, but there is nothing here worth indexing
useHead({ meta: [{ name: 'robots', content: 'noindex, nofollow' }] })

const email = ref('')
const orderNumber = ref('')
const submitting = ref(false)
const submitted = ref(false)
const requestFailed = ref(false)

async function submit() {
  submitting.value = true
  requestFailed.value = false
  try {
    await requestPortalLink({
      email: email.value,
      orderNumber: orderNumber.value,
      locale: locale.value,
    })
    submitted.value = true
  } catch {
    requestFailed.value = true
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <PsSection>
    <div class="mx-auto max-w-[36rem]" data-testid="portal-request">
      <h1 class="text-heading-medium">{{ t('portal.request.title') }}</h1>
      <p class="mt-md text-body-regular text-secondary">{{ t('portal.request.intro') }}</p>

      <div
        v-if="submitted"
        class="mt-xl rounded-card border border-brand/40 bg-brand/5 p-lg text-body-regular"
        data-testid="portal-request-confirmation"
      >
        {{ t('portal.request.confirmation') }}
      </div>

      <form v-else class="mt-xl flex flex-col gap-md" @submit.prevent="submit">
        <PsInput
          v-model="email"
          type="email"
          required
          :label="t('portal.request.email')"
          name="email"
          data-testid="portal-request-email"
        />
        <PsInput
          v-model="orderNumber"
          :label="t('portal.request.orderNumber')"
          name="orderNumber"
          data-testid="portal-request-order"
        />
        <PsButton
          type="submit"
          :disabled="submitting || !email"
          data-testid="portal-request-submit"
        >
          {{ t('portal.request.submit') }}
        </PsButton>
        <p v-if="requestFailed" class="text-caption text-danger" data-testid="portal-request-error">
          {{ t('portal.request.error') }}
        </p>
        <p class="text-caption text-secondary">{{ t('portal.request.privacy') }}</p>
      </form>
    </div>
  </PsSection>
</template>
