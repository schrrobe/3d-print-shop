<script setup lang="ts">
import { PsButton, PsCard, PsSection, PsTextarea } from '@print-shop/ui'
import { COMPLAINT_REASONS } from '@print-shop/types'

/** Open a complaint on an order. Auth = order number + access token (from the portal / email). */
const { t, locale } = useI18n()
const route = useRoute()
const router = useRouter()

useHead({
  meta: [
    { name: 'robots', content: 'noindex, nofollow' },
    { name: 'referrer', content: 'no-referrer' },
  ],
})

const orderNumber = String(route.query.order ?? '')
const token = String(route.query.token ?? '')

interface OrderItemView {
  id: string
  name: string
  quantity: number
}
interface OrderView {
  orderNumber: string
  items: OrderItemView[]
}

const { data, error } = await useFetch<{ order: OrderView }>(`/api/orders/${orderNumber}`, {
  query: { token },
  server: false,
})

const hasContext = computed(() => Boolean(orderNumber && token))
const order = computed(() => data.value?.order)

interface Selection {
  selected: boolean
  quantity: number
}
const selections = reactive<Record<string, Selection>>({})
watchEffect(() => {
  for (const item of order.value?.items ?? []) {
    if (!selections[item.id]) selections[item.id] = { selected: false, quantity: item.quantity }
  }
})

const reason = ref<(typeof COMPLAINT_REASONS)[number]>('quality_issue')
const description = ref('')
const photos = ref<File[]>([])
const submitting = ref(false)
const formError = ref('')

function onFiles(event: Event) {
  const input = event.target as HTMLInputElement
  photos.value = input.files ? Array.from(input.files).slice(0, 5) : []
}

const chosenItems = computed(() =>
  Object.entries(selections)
    .filter(([, s]) => s.selected)
    .map(([orderItemId, s]) => ({ orderItemId, quantity: s.quantity })),
)

async function submit() {
  formError.value = ''
  if (chosenItems.value.length === 0) {
    formError.value = t('complaints.form.noItems')
    return
  }
  if (description.value.trim().length < 10) {
    formError.value = t('complaints.form.descriptionTooShort')
    return
  }
  submitting.value = true
  try {
    const form = new FormData()
    form.append('orderNumber', orderNumber)
    form.append('token', token)
    form.append('reason', reason.value)
    form.append('description', description.value)
    form.append('locale', locale.value)
    form.append('items', JSON.stringify(chosenItems.value))
    for (const file of photos.value) form.append('photos', file)
    const res = await $fetch<{ complaintNumber: string; accessToken: string }>('/api/complaints', {
      method: 'POST',
      body: form,
    })
    await router.push(`/complaint/${res.complaintNumber}?token=${res.accessToken}`)
  } catch (err) {
    formError.value =
      (err as { data?: { message?: string } })?.data?.message ?? t('complaints.form.submitError')
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <PsSection>
    <div class="mx-auto max-w-[42rem]" data-testid="complaint-new">
      <h1 class="text-heading-medium">{{ t('complaints.form.title') }}</h1>

      <PsCard v-if="!hasContext || error" class="mt-xl">
        <p class="text-body-regular">{{ t('complaints.form.missingContext') }}</p>
        <NuxtLink
          :to="`/${locale === 'de' ? '' : locale + '/'}portal`"
          class="mt-md block text-brand hover:underline"
        >
          {{ t('complaints.form.goToPortal') }}
        </NuxtLink>
      </PsCard>

      <form v-else-if="order" class="mt-xl flex flex-col gap-lg" @submit.prevent="submit">
        <p
          class="rounded-card border border-amber-500/40 bg-amber-500/5 p-md text-caption"
          data-testid="complaint-custom-made-note"
        >
          {{ t('complaints.form.customMadeNote') }}
        </p>

        <div>
          <h2 class="mb-md text-label-medium">{{ t('complaints.form.selectItems') }}</h2>
          <div class="flex flex-col gap-sm">
            <label
              v-for="item in order.items"
              :key="item.id"
              class="flex items-center gap-md rounded-card border border-subtle bg-surface-elevated p-md"
              data-testid="complaint-item"
            >
              <input
                v-model="selections[item.id]!.selected"
                type="checkbox"
                data-testid="complaint-item-checkbox"
                :data-item="item.id"
              />
              <span class="flex-1 text-body-regular">{{ item.name }}</span>
              <input
                v-model.number="selections[item.id]!.quantity"
                type="number"
                min="1"
                :max="item.quantity"
                class="w-16 rounded-card border border-subtle bg-surface px-sm py-xs text-body-regular"
                :aria-label="t('complaints.form.quantity')"
              />
            </label>
          </div>
        </div>

        <label class="flex flex-col gap-sm">
          <span class="text-label-medium">{{ t('complaints.form.reason') }}</span>
          <select
            v-model="reason"
            class="rounded-card border border-subtle bg-surface-elevated px-md py-sm text-body-regular"
            data-testid="complaint-reason"
          >
            <option v-for="r in COMPLAINT_REASONS" :key="r" :value="r">
              {{ t(`complaints.reason.${r}`) }}
            </option>
          </select>
        </label>

        <PsTextarea
          v-model="description"
          :label="t('complaints.form.description')"
          name="description"
          :rows="5"
          required
          data-testid="complaint-description"
        />

        <label class="flex flex-col gap-sm">
          <span class="text-label-medium">{{ t('complaints.form.photos') }}</span>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            class="text-body-regular"
            data-testid="complaint-photos"
            @change="onFiles"
          />
          <span class="text-caption text-secondary">{{ t('complaints.form.photosHint') }}</span>
        </label>

        <p v-if="formError" class="text-body-regular text-red-500" data-testid="complaint-error">
          {{ formError }}
        </p>

        <PsButton type="submit" :disabled="submitting" data-testid="complaint-submit">
          {{ t('complaints.form.submit') }}
        </PsButton>
      </form>
    </div>
  </PsSection>
</template>
