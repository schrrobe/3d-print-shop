<script setup lang="ts">
import { PsInput, PsPillButton, PsSection, PsTextarea } from '@print-shop/ui'

/**
 * Electronic withdrawal function (§ 356a BGB): enter name, contract and email,
 * then a separate "Widerruf bestätigen" step submits it. The API mails the
 * receipt confirmation with content + date/time.
 */
const { t, locale } = useI18n()
const localePath = useLocalePath()
const company = useRuntimeConfig().public.company

useSeo({
  title: () => t('withdraw.title'),
  description: () => t('seo.withdraw.description'),
})

// Order page links here with ?order=<number>
const route = useRoute()
const form = reactive({
  name: '',
  email: '',
  orderNumber: String(route.query.order ?? '').slice(0, 40),
  items: '',
  message: '',
})
const step = ref<'form' | 'review'>('form')
const submitting = ref(false)
const hydrated = ref(false)
onMounted(() => {
  hydrated.value = true
})
const errorMessage = ref('')
const result = ref<{ ticketNumber: string; receivedAt: string } | null>(null)

const receivedAt = computed(() =>
  result.value
    ? new Date(result.value.receivedAt).toLocaleString(locale.value, {
        dateStyle: 'long',
        timeStyle: 'short',
      })
    : '',
)

function review() {
  errorMessage.value = ''
  step.value = 'review'
}

async function confirm() {
  submitting.value = true
  errorMessage.value = ''
  try {
    result.value = await $fetch<{ ticketNumber: string; receivedAt: string }>('/api/withdrawals', {
      method: 'POST',
      body: {
        name: form.name,
        email: form.email,
        orderNumber: form.orderNumber,
        items: form.items || undefined,
        message: form.message || undefined,
        locale: locale.value,
      },
    })
  } catch (err) {
    errorMessage.value = t('withdraw.error', { email: company.email })
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
        {{
          t('withdraw.successText', {
            date: receivedAt,
            email: form.email,
            ticketNumber: result.ticketNumber,
          })
        }}
      </p>
    </div>

    <form
      v-else-if="step === 'form'"
      class="mx-auto flex max-w-[36rem] flex-col gap-lg"
      data-testid="withdraw-form"
      @submit.prevent="review"
    >
      <PsInput v-model="form.name" :label="t('withdraw.name')" name="name" required />
      <PsInput
        v-model="form.email"
        :label="t('withdraw.email')"
        type="email"
        name="email"
        required
      />
      <div>
        <PsInput
          v-model="form.orderNumber"
          :label="t('withdraw.orderNumber')"
          name="orderNumber"
          required
        />
        <p class="mt-xs text-caption text-secondary">{{ t('withdraw.orderNumberHint') }}</p>
      </div>
      <div>
        <PsTextarea v-model="form.items" :label="t('withdraw.items')" name="items" :rows="2" />
        <p class="mt-xs text-caption text-secondary">{{ t('withdraw.itemsHint') }}</p>
      </div>
      <PsTextarea v-model="form.message" :label="t('withdraw.message')" name="message" :rows="3" />
      <PsPillButton type="submit" size="lg" :disabled="!hydrated" data-testid="withdraw-next">
        {{ t('withdraw.next') }}
      </PsPillButton>
      <NuxtLink class="text-caption underline" :to="localePath('/legal/withdrawal')">
        {{ t('withdraw.legalLink') }}
      </NuxtLink>
    </form>

    <div v-else class="mx-auto flex max-w-[36rem] flex-col gap-lg" data-testid="withdraw-review">
      <h2 class="text-heading-small text-primary">{{ t('withdraw.reviewTitle') }}</h2>
      <blockquote class="border-l-4 border-ink pl-md text-body-regular text-primary">
        {{ t('withdraw.declaration', { orderNumber: form.orderNumber }) }}
      </blockquote>
      <dl class="grid gap-sm text-body-regular sm:grid-cols-[auto_1fr] sm:gap-x-lg">
        <dt class="text-secondary">{{ t('withdraw.name') }}</dt>
        <dd>{{ form.name }}</dd>
        <dt class="text-secondary">{{ t('withdraw.email') }}</dt>
        <dd>{{ form.email }}</dd>
        <dt class="text-secondary">{{ t('withdraw.orderNumber') }}</dt>
        <dd>{{ form.orderNumber }}</dd>
        <dt class="text-secondary">{{ t('withdraw.items') }}</dt>
        <dd class="whitespace-pre-line">{{ form.items || t('withdraw.wholeOrder') }}</dd>
        <template v-if="form.message">
          <dt class="text-secondary">{{ t('withdraw.message') }}</dt>
          <dd class="whitespace-pre-line">{{ form.message }}</dd>
        </template>
      </dl>
      <p
        v-if="errorMessage"
        class="text-caption text-red-500"
        role="alert"
        data-testid="withdraw-error"
      >
        {{ errorMessage }}
      </p>
      <div class="flex flex-wrap items-center gap-md">
        <PsPillButton
          size="lg"
          :disabled="submitting"
          data-testid="withdraw-confirm"
          @click="confirm"
        >
          {{ t('withdraw.confirm') }}
        </PsPillButton>
        <button
          type="button"
          class="text-caption underline"
          :disabled="submitting"
          @click="step = 'form'"
        >
          {{ t('withdraw.edit') }}
        </button>
      </div>
    </div>
  </PsSection>
</template>
