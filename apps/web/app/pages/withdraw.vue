<script setup lang="ts">
import { PsInput, PsPillButton, PsSection, PsTextarea } from '@print-shop/ui'

/**
 * § 356a BGB electronic withdrawal function: reached via the "Vertrag
 * widerrufen" button (footer, order page, portal), collects name, contract id
 * and the email for the receipt, then the consumer sends it with
 * "Widerruf bestätigen". Prefill: ?order=…&email=…
 */
const { t, locale } = useI18n()
const localePath = useLocalePath()
const route = useRoute()

useSeo({
  title: () => t('withdraw.title'),
  description: () => t('withdraw.intro'),
})
useHead({ meta: [{ name: 'robots', content: 'noindex' }] })

const form = reactive({
  name: '',
  orderNumber: String(route.query.order ?? '').slice(0, 40),
  email: String(route.query.email ?? '').slice(0, 254),
  partial: false,
  items: '',
})
const submitting = ref(false)
const hydrated = ref(false)
onMounted(() => {
  hydrated.value = true
})
const errorMessage = ref('')
const result = ref<{ ticketNumber: string; receivedAt: string } | null>(null)
const receivedAtText = computed(() =>
  result.value
    ? new Intl.DateTimeFormat(locale.value, {
        dateStyle: 'long',
        timeStyle: 'medium',
        timeZone: 'Europe/Berlin',
      }).format(new Date(result.value.receivedAt))
    : '',
)

async function submit() {
  submitting.value = true
  errorMessage.value = ''
  try {
    result.value = await $fetch<{ ticketNumber: string; receivedAt: string }>('/api/withdrawals', {
      method: 'POST',
      body: {
        name: form.name,
        orderNumber: form.orderNumber,
        email: form.email,
        items: form.partial && form.items ? form.items : undefined,
        locale: locale.value,
      },
    })
  } catch (err) {
    errorMessage.value = t('withdraw.error')
    console.error(err)
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <PsSection :title="t('withdraw.title')" :subtitle="t('withdraw.intro')" heading-level="h1">
    <div
      v-if="result"
      class="mx-auto max-w-[36rem] py-2xl text-center"
      role="status"
      data-testid="withdraw-success"
    >
      <h2 class="text-heading-small text-brand">{{ t('withdraw.successTitle') }}</h2>
      <p class="mt-md text-body-regular text-secondary">
        {{ t('withdraw.successText', { date: receivedAtText, email: form.email }) }}
      </p>
      <p class="mt-sm text-body-regular text-secondary">
        {{ t('withdraw.reference') }}
        <strong data-testid="withdraw-ticket-number">{{ result.ticketNumber }}</strong>
      </p>
    </div>

    <form
      v-else
      class="mx-auto flex max-w-[36rem] flex-col gap-lg"
      data-testid="withdraw-form"
      @submit.prevent="submit"
    >
      <PsInput
        v-model="form.name"
        :label="t('withdraw.name')"
        name="name"
        autocomplete="name"
        required
      />
      <div class="grid gap-md sm:grid-cols-2">
        <PsInput
          v-model="form.orderNumber"
          :label="t('withdraw.orderNumber')"
          name="orderNumber"
          required
        />
        <PsInput
          v-model="form.email"
          :label="t('withdraw.email')"
          type="email"
          name="email"
          autocomplete="email"
          required
        />
      </div>
      <p class="-mt-sm text-caption text-secondary">{{ t('withdraw.emailHint') }}</p>

      <fieldset class="flex flex-col gap-sm">
        <legend class="text-caption text-secondary">{{ t('withdraw.scope') }}</legend>
        <label class="flex items-center gap-sm text-body-regular text-primary">
          <input v-model="form.partial" type="radio" name="scope" :value="false" />
          {{ t('withdraw.scopeAll') }}
        </label>
        <label class="flex items-center gap-sm text-body-regular text-primary">
          <input v-model="form.partial" type="radio" name="scope" :value="true" />
          {{ t('withdraw.scopePartial') }}
        </label>
      </fieldset>
      <PsTextarea
        v-if="form.partial"
        v-model="form.items"
        :label="t('withdraw.items')"
        name="items"
        required
        :rows="3"
      />

      <p class="text-caption text-secondary">
        {{ t('withdraw.legalNote') }}
        <NuxtLink :to="localePath('/legal/withdrawal')" class="underline">{{
          t('legal.withdrawalTitle')
        }}</NuxtLink>
      </p>
      <p
        v-if="errorMessage"
        class="text-caption text-red-500"
        role="alert"
        data-testid="withdraw-error"
      >
        {{ errorMessage }}
      </p>
      <PsPillButton
        type="submit"
        size="lg"
        :disabled="submitting || !hydrated"
        data-testid="withdraw-submit"
      >
        {{ t('withdraw.confirm') }}
      </PsPillButton>
    </form>
  </PsSection>
</template>
