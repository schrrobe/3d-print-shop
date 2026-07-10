<script setup lang="ts">
import { PsButton, PsCard, PsComplaintStatusBadge, PsSection, PsTextarea } from '@print-shop/ui'
import type { ComplaintStatus } from '@print-shop/types'

/** Customer complaint view (token-gated). Reply only while info is requested. */
const { t } = useI18n()
const route = useRoute()

useHead({
  meta: [
    { name: 'robots', content: 'noindex, nofollow' },
    { name: 'referrer', content: 'no-referrer' },
  ],
})

const complaintNumber = String(route.params.complaintNumber)
const token = String(route.query.token ?? '')

interface ComplaintView {
  complaintNumber: string
  status: ComplaintStatus
  reason: string
  description: string
  createdAt: string
  orderNumber: string
  items: { name: string; quantity: number; note: string | null }[]
  attachments: { id: string; originalName: string; createdAt: string }[]
  decisions: { resolution: string; note: string | null; decidedAt: string }[]
}

const { data, error, refresh } = await useFetch<{ complaint: ComplaintView }>(
  `/api/complaints/${complaintNumber}`,
  { query: { token }, server: false },
)

if (error.value) {
  throw createError({ statusCode: 404, statusMessage: 'Complaint not found' })
}

const complaint = computed(() => data.value?.complaint)
const attachmentUrl = (id: string) =>
  `/api/complaints/${complaintNumber}/attachments/${id}?token=${encodeURIComponent(token)}`

const reply = ref('')
const replyPhotos = ref<File[]>([])
const submitting = ref(false)

function onFiles(event: Event) {
  const input = event.target as HTMLInputElement
  replyPhotos.value = input.files ? Array.from(input.files).slice(0, 5) : []
}

async function sendReply() {
  submitting.value = true
  try {
    const form = new FormData()
    form.append('token', token)
    form.append('message', reply.value)
    for (const file of replyPhotos.value) form.append('photos', file)
    await $fetch(`/api/complaints/${complaintNumber}/reply`, { method: 'POST', body: form })
    reply.value = ''
    replyPhotos.value = []
    await refresh()
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <PsSection>
    <div v-if="complaint" class="mx-auto max-w-[42rem]" data-testid="complaint-detail">
      <div class="flex flex-wrap items-center justify-between gap-md">
        <h1 class="text-heading-medium">{{ complaint.complaintNumber }}</h1>
        <PsComplaintStatusBadge
          :status="complaint.status"
          :label="t(`complaints.status.${complaint.status}`)"
          data-testid="complaint-status"
        />
      </div>
      <p class="mt-sm text-caption text-secondary">
        {{ t('complaints.view.order') }}: {{ complaint.orderNumber }} ·
        {{ t(`complaints.reason.${complaint.reason}`) }}
      </p>

      <PsCard class="mt-lg">
        <h2 class="text-label-medium">{{ t('complaints.view.description') }}</h2>
        <p class="mt-sm whitespace-pre-line text-body-regular text-secondary">
          {{ complaint.description }}
        </p>
      </PsCard>

      <PsCard class="mt-lg">
        <h2 class="text-label-medium">{{ t('complaints.view.items') }}</h2>
        <ul class="mt-sm flex flex-col gap-xs text-body-regular">
          <li v-for="(item, i) in complaint.items" :key="i">
            {{ item.quantity }}× {{ item.name }}
          </li>
        </ul>
      </PsCard>

      <PsCard v-if="complaint.attachments.length" class="mt-lg">
        <h2 class="text-label-medium">{{ t('complaints.view.photos') }}</h2>
        <div class="mt-sm grid grid-cols-3 gap-sm" data-testid="complaint-photos-view">
          <a
            v-for="a in complaint.attachments"
            :key="a.id"
            :href="attachmentUrl(a.id)"
            target="_blank"
            rel="noopener"
            class="block overflow-hidden rounded-card border border-subtle"
          >
            <img
              :src="attachmentUrl(a.id)"
              :alt="a.originalName"
              class="aspect-square w-full object-cover"
            />
          </a>
        </div>
      </PsCard>

      <PsCard v-if="complaint.decisions.length" class="mt-lg" data-testid="complaint-decisions">
        <h2 class="text-label-medium">{{ t('complaints.view.decisions') }}</h2>
        <ul class="mt-sm flex flex-col gap-sm text-body-regular">
          <li v-for="(d, i) in complaint.decisions" :key="i">
            <span class="text-brand">{{ t(`complaints.resolution.${d.resolution}`) }}</span>
            <span v-if="d.note" class="text-secondary"> — {{ d.note }}</span>
          </li>
        </ul>
      </PsCard>

      <PsCard v-if="complaint.status === 'info_needed'" class="mt-lg" data-testid="complaint-reply">
        <h2 class="text-label-medium">{{ t('complaints.view.replyTitle') }}</h2>
        <p class="mt-sm text-body-regular text-secondary">{{ t('complaints.view.replyIntro') }}</p>
        <form class="mt-md flex flex-col gap-md" @submit.prevent="sendReply">
          <PsTextarea
            v-model="reply"
            :label="t('complaints.view.replyLabel')"
            name="reply"
            :rows="4"
            required
            data-testid="complaint-reply-message"
          />
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            class="text-body-regular"
            @change="onFiles"
          />
          <PsButton
            type="submit"
            :disabled="submitting || reply.trim().length < 2"
            data-testid="complaint-reply-submit"
          >
            {{ t('complaints.view.replySubmit') }}
          </PsButton>
        </form>
      </PsCard>
    </div>
  </PsSection>
</template>
