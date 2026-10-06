<script setup lang="ts">
import { PsAdminTable, PsRatingStars, PsReviewStatusBadge } from '@print-shop/ui'
import { REVIEW_STATUSES } from '@print-shop/types'
import type { ReviewStatus } from '@print-shop/types'

definePageMeta({ layout: 'admin', middleware: 'admin-auth' })

interface AdminReview {
  id: string
  rating: number
  title: string | null
  body: string
  displayName: string
  status: ReviewStatus
  flaggedAbuse: boolean
  createdAt: string
  order: { orderNumber: string }
  product: { slug: string }
}

const statusFilter = ref('')
const flaggedOnly = ref(false)
const { data, refresh } = await useFetch<{ reviews: AdminReview[] }>('/api/admin/reviews', {
  credentials: 'include',
  server: false,
  query: computed(() => ({
    ...(statusFilter.value ? { status: statusFilter.value } : {}),
    ...(flaggedOnly.value ? { flagged: 'true' } : {}),
  })),
})
watch([statusFilter, flaggedOnly], () => refresh())

const columns = [
  { key: 'rating', label: 'Bewertung' },
  { key: 'product', label: 'Produkt' },
  { key: 'displayName', label: 'Autor' },
  { key: 'status', label: 'Status' },
  { key: 'actions', label: '' },
]
</script>

<template>
  <div data-testid="admin-reviews">
    <div class="mb-lg flex flex-wrap items-center gap-md">
      <select
        v-model="statusFilter"
        class="rounded-card border border-subtle bg-surface-elevated px-md py-sm text-body-regular"
        data-testid="review-status-filter"
      >
        <option value="">Alle Status</option>
        <option v-for="s in REVIEW_STATUSES" :key="s" :value="s">{{ s }}</option>
      </select>
      <label class="flex items-center gap-sm text-body-regular">
        <input v-model="flaggedOnly" type="checkbox" data-testid="review-flagged-filter" /> Nur gemeldete
      </label>
    </div>

    <PsAdminTable :columns="columns" :rows="data?.reviews ?? []" empty="Keine Bewertungen">
      <template #cell-rating="{ row }">
        <div class="flex items-center gap-sm">
          <PsRatingStars :rating="(row as unknown as AdminReview).rating" />
          <span v-if="(row as unknown as AdminReview).flaggedAbuse" class="text-caption text-red-500">⚑</span>
        </div>
      </template>
      <template #cell-product="{ row }">
        {{ (row as unknown as AdminReview).product.slug }}
      </template>
      <template #cell-status="{ row }">
        <PsReviewStatusBadge :status="(row as unknown as AdminReview).status" />
      </template>
      <template #cell-actions="{ row }">
        <NuxtLink
          :to="`/admin/reviews/${(row as unknown as AdminReview).id}`"
          class="text-caption text-brand hover:underline"
          data-testid="review-row"
        >
          Details
        </NuxtLink>
      </template>
    </PsAdminTable>
  </div>
</template>
