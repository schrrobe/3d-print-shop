<script setup lang="ts">
import { PsButton, PsCard, PsRatingStars, PsTextarea } from '@print-shop/ui'
import { REVIEW_STATUS_TRANSITIONS } from '@print-shop/utils'
import type { ReviewStatus } from '@print-shop/types'

definePageMeta({ layout: 'admin', middleware: 'admin-auth' })

const route = useRoute()
const id = String(route.params.id)

interface ReviewDetail {
  id: string
  rating: number
  title: string | null
  body: string
  displayName: string
  status: ReviewStatus
  flaggedAbuse: boolean
  internalNote: string | null
  createdAt: string
  photoPath: string | null
  order: { orderNumber: string; email: string }
  orderItem: { name: string }
  product: { slug: string }
  moderatedBy: { name: string } | null
  moderatedAt: string | null
}

const { data, refresh } = await useFetch<{ review: ReviewDetail }>(`/api/admin/reviews/${id}`, {
  credentials: 'include',
  server: false,
})
const review = computed(() => data.value?.review)

const statusLabels: Record<ReviewStatus, string> = {
  pending: 'Ausstehend',
  approved: 'Freigegeben',
  rejected: 'Abgelehnt',
  hidden: 'Verborgen',
}
const actionLabels: Record<ReviewStatus, string> = {
  approved: 'Freigeben',
  rejected: 'Ablehnen',
  hidden: 'Verbergen',
  pending: 'Zurückstellen',
}
const nextStatuses = computed(() =>
  review.value ? REVIEW_STATUS_TRANSITIONS[review.value.status] : [],
)

const note = ref('')
watchEffect(() => {
  note.value = review.value?.internalNote ?? ''
})

const { run } = useAdminAction({ refresh })

function moderate(patch: { status?: ReviewStatus; internalNote?: string; flaggedAbuse?: boolean }) {
  return run(
    () => $fetch(`/api/admin/reviews/${id}`, { method: 'PATCH', body: patch, credentials: 'include' }),
    { success: 'Bewertung aktualisiert', error: 'Fehler' },
  )
}

const testIdForStatus: Record<ReviewStatus, string> = {
  approved: 'review-approve',
  rejected: 'review-reject',
  hidden: 'review-hide',
  pending: 'review-pending',
}
</script>

<template>
  <div v-if="review" class="flex flex-col gap-lg" data-testid="admin-review-detail">
    <div class="flex flex-wrap items-center gap-md">
      <PsRatingStars :rating="review.rating" />
      <span class="text-caption text-secondary">{{ statusLabels[review.status] }}</span>
      <span v-if="review.flaggedAbuse" class="text-caption text-red-500">⚑ Gemeldet</span>
    </div>

    <div class="grid gap-lg lg:grid-cols-[2fr_1fr]">
      <div class="flex flex-col gap-lg">
        <PsCard>
          <h3 v-if="review.title" class="text-label-medium">{{ review.title }}</h3>
          <p class="mt-sm whitespace-pre-line text-body-regular text-secondary">{{ review.body }}</p>
          <p class="mt-md text-caption text-secondary">
            {{ review.displayName }} · {{ new Date(review.createdAt).toLocaleDateString('de') }} ·
            {{ review.product.slug }} ({{ review.orderItem.name }})
          </p>
        </PsCard>

        <PsCard v-if="review.photoPath">
          <h3 class="text-label-medium">Foto</h3>
          <img
            :src="`/api/admin/reviews/${id}/photo`"
            alt=""
            class="mt-sm max-h-80 rounded-card border border-subtle object-contain"
          />
        </PsCard>
      </div>

      <div class="flex flex-col gap-lg">
        <PsCard>
          <h3 class="text-label-medium">Moderation</h3>
          <div class="mt-md flex flex-wrap gap-sm">
            <PsButton
              v-for="status in nextStatuses"
              :key="status"
              variant="secondary"
              size="sm"
              :data-testid="testIdForStatus[status]"
              @click="moderate({ status })"
            >
              {{ actionLabels[status] }}
            </PsButton>
          </div>
          <label class="mt-md flex items-center gap-sm text-body-regular">
            <input
              type="checkbox"
              :checked="review.flaggedAbuse"
              data-testid="review-flag"
              @change="moderate({ flaggedAbuse: !review.flaggedAbuse })"
            />
            Als Missbrauch markieren
          </label>
          <p v-if="review.moderatedBy" class="mt-md text-caption text-secondary">
            Zuletzt: {{ review.moderatedBy.name }} ·
            {{ review.moderatedAt ? new Date(review.moderatedAt).toLocaleString('de') : '' }}
          </p>
        </PsCard>

        <PsCard>
          <h3 class="text-label-medium">Interne Notiz</h3>
          <PsTextarea v-model="note" label="" name="internalNote" :rows="4" class="mt-sm" data-testid="review-note" />
          <PsButton size="sm" class="mt-sm" @click="moderate({ internalNote: note })">Speichern</PsButton>
        </PsCard>
      </div>
    </div>
  </div>
</template>
