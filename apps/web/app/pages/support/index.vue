<script setup lang="ts">
import { TICKET_CATEGORIES } from '@print-shop/types'
import { PsInput, PsPillButton, PsSection, PsTextarea } from '@print-shop/ui'

/** Public support form → creates a ticket with a token link for the customer. */
const { t, locale } = useI18n()
const localePath = useLocalePath()

const form = reactive({
  name: '',
  email: '',
  subject: '',
  orderNumber: '',
  category: 'other',
  message: '',
})
const submitting = ref(false)
const hydrated = ref(false)
onMounted(() => {
  hydrated.value = true
})
const errorMessage = ref('')
const result = ref<{ ticketNumber: string; accessToken: string } | null>(null)

async function submit() {
  submitting.value = true
  errorMessage.value = ''
  try {
    result.value = await $fetch<{ ticketNumber: string; accessToken: string }>('/api/tickets', {
      method: 'POST',
      body: {
        name: form.name,
        email: form.email,
        subject: form.subject,
        message: form.message,
        category: form.category,
        orderNumber: form.orderNumber || undefined,
        locale: locale.value,
      },
    })
  } catch (err) {
    errorMessage.value = t('common.error')
    console.error(err)
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <PsSection :title="t('support.title')" :subtitle="t('support.subtitle')">
    <div
      v-if="result"
      class="mx-auto max-w-[36rem] py-2xl text-center"
      data-testid="support-success"
    >
      <h2 class="text-heading-small text-brand">{{ t('support.successTitle') }}</h2>
      <p class="mt-md text-body-regular text-secondary">
        {{ t('support.successText') }}
        <strong data-testid="support-ticket-number">{{ result.ticketNumber }}</strong>
      </p>
      <NuxtLink
        :to="localePath(`/support/ticket/${result.accessToken}`)"
        class="mt-lg inline-block"
        data-testid="support-ticket-link"
      >
        <PsPillButton size="lg">{{ t('support.viewTicket') }}</PsPillButton>
      </NuxtLink>
    </div>

    <form
      v-else
      class="mx-auto flex max-w-[36rem] flex-col gap-lg"
      data-testid="support-form"
      @submit.prevent="submit"
    >
      <div class="grid gap-md sm:grid-cols-2">
        <PsInput v-model="form.name" :label="t('support.name')" name="name" required />
        <PsInput v-model="form.email" :label="t('support.email')" type="email" name="email" required />
      </div>
      <PsInput v-model="form.subject" :label="t('support.subject')" name="subject" required />
      <div class="flex flex-col gap-xs">
        <label for="support-category" class="text-caption text-secondary">
          {{ t('support.category') }}
        </label>
        <select
          id="support-category"
          v-model="form.category"
          name="category"
          class="rounded-card border border-subtle bg-surface-elevated px-md py-md-sm text-body-regular text-primary"
          data-testid="support-category"
        >
          <option v-for="c in TICKET_CATEGORIES" :key="c" :value="c">
            {{ t(`support.categories.${c}`) }}
          </option>
        </select>
      </div>
      <div>
        <PsInput v-model="form.orderNumber" :label="t('support.orderNumber')" name="orderNumber" />
        <p class="mt-xs text-caption text-secondary">{{ t('support.orderNumberHint') }}</p>
      </div>
      <PsTextarea v-model="form.message" :label="t('support.message')" name="message" required :rows="6" />

      <p v-if="errorMessage" class="text-caption text-red-500" role="alert" data-testid="support-error">
        {{ errorMessage }}
      </p>
      <PsPillButton type="submit" size="lg" :disabled="submitting || !hydrated" data-testid="support-submit">
        {{ t('support.submit') }}
      </PsPillButton>
    </form>
  </PsSection>
</template>
