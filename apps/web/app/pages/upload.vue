<script setup lang="ts">
import {
  PsInput,
  PsPillButton,
  PsSection,
  PsStepper,
  PsTextarea,
  PsUploadDropzone,
  useToast,
} from '@print-shop/ui'

/** Customer model upload → quote request (.stl/.3mf, max 50 MB). */
const { t, locale } = useI18n()
const toast = useToast()

useSeo({
  title: () => t('seo.upload.title'),
  description: () => t('seo.upload.description'),
})

const files = ref<File[]>([])
const form = reactive({ name: '', email: '', phone: '', description: '', quantity: 1 })
const submitting = ref(false)
const hydrated = ref(false)
onMounted(() => {
  hydrated.value = true
})
const submitted = ref(false)
const errorMessage = ref('')

const steps = computed(() => [
  { key: 'upload', label: t('upload.steps.upload') },
  { key: 'review', label: t('upload.steps.review') },
  { key: 'quote', label: t('upload.steps.quote') },
  { key: 'payment', label: t('upload.steps.payment') },
  { key: 'production', label: t('upload.steps.production') },
])

function onFiles(selected: File[]) {
  files.value = [...files.value, ...selected].slice(0, 5)
}

function onFileError(message: string) {
  toast.show(message, { variant: 'error' })
}

async function submit() {
  if (files.value.length === 0) {
    errorMessage.value = t('upload.accepted')
    return
  }
  submitting.value = true
  errorMessage.value = ''
  try {
    const body = new FormData()
    for (const file of files.value) body.append('files', file)
    body.append('name', form.name)
    body.append('email', form.email)
    if (form.phone) body.append('phone', form.phone)
    body.append('description', form.description)
    body.append('quantity', String(form.quantity))
    body.append('locale', locale.value)
    await $fetch('/api/upload-requests', { method: 'POST', body })
    submitted.value = true
  } catch (err) {
    errorMessage.value = t('common.error')
    console.error(err)
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <PsSection :title="t('upload.title')" :subtitle="t('upload.subtitle')" heading-level="h1">
    <PsStepper :steps="steps" :current="submitted ? 'review' : 'upload'" class="mb-2xl" />

    <div v-if="submitted" class="mx-auto max-w-[36rem] py-2xl text-center" data-testid="upload-success">
      <h2 class="text-heading-small text-brand">{{ t('upload.successTitle') }}</h2>
      <p class="mt-md text-body-regular text-secondary">{{ t('upload.successText') }}</p>
    </div>

    <form v-else class="mx-auto flex max-w-[36rem] flex-col gap-lg" data-testid="upload-form" @submit.prevent="submit">
      <PsUploadDropzone accept=".stl,.3mf" :multiple="true" @files="onFiles" @error="onFileError">
        <p class="text-label-medium">{{ t('upload.dropzone') }}</p>
        <p class="mt-xs text-caption text-secondary">{{ t('upload.accepted') }}</p>
      </PsUploadDropzone>
      <ul v-if="files.length" class="flex flex-col gap-xs" data-testid="upload-file-list">
        <li
          v-for="(file, index) in files"
          :key="index"
          class="flex items-center justify-between rounded-card border border-subtle bg-surface-elevated px-md py-sm text-body-regular"
        >
          <span class="truncate">{{ file.name }}</span>
          <button
            type="button"
            class="cursor-pointer text-secondary hover:text-primary"
            @click="files = files.filter((_, i) => i !== index)"
          >
            ✕
          </button>
        </li>
      </ul>

      <PsInput v-model="form.name" :label="t('upload.name')" name="name" required />
      <PsInput v-model="form.email" :label="t('checkout.email')" type="email" name="email" required />
      <PsInput v-model="form.phone" :label="t('checkout.phone')" type="tel" name="phone" />
      <PsTextarea v-model="form.description" :label="t('upload.description')" name="description" required :rows="5" />
      <PsInput
        :model-value="String(form.quantity)"
        :label="t('upload.quantity')"
        type="number"
        name="quantity"
        @update:model-value="form.quantity = Number($event)"
      />

      <!-- Placeholder for future legal upload terms -->
      <p class="rounded-card border border-subtle bg-surface-elevated p-md text-caption text-secondary" data-testid="upload-terms-placeholder">
        {{ t('upload.termsPlaceholder') }}
      </p>

      <p v-if="errorMessage" class="text-caption text-red-500" role="alert" data-testid="upload-error">
        {{ errorMessage }}
      </p>
      <PsPillButton type="submit" size="lg" :disabled="submitting || !hydrated" data-testid="upload-submit">
        {{ t('upload.submit') }}
      </PsPillButton>
    </form>
  </PsSection>
</template>
