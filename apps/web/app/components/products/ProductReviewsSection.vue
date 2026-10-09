<script setup lang="ts">
import { PsRatingStars, PsReviewCard } from '@print-shop/ui'
import type { PublicReview } from '~/composables/useReviews'

const props = defineProps<{
  reviews: PublicReview[]
  averageRating: number | null
  count: number
  locale: string
  titleLabel: string
  emptyLabel: string
  countLabel: string
  photoAltLabel: (displayName: string) => string
  ratingLabel: (rating: number | null) => string
}>()

const formattedReviews = computed(() =>
  props.reviews.map((review) => ({
    ...review,
    photoAltLabel: props.photoAltLabel(review.displayName),
    dateLabel: new Date(review.createdAt).toLocaleDateString(props.locale),
    ratingAriaLabel: props.ratingLabel(review.rating),
  })),
)
</script>

<template>
  <section
    class="mt-16 max-w-[52rem] md:mt-24"
    aria-labelledby="reviews-title"
    data-testid="product-reviews"
  >
    <div class="flex flex-wrap items-end gap-x-6 gap-y-2 border-b border-ink pb-3">
      <h2 id="reviews-title" class="kb-heading text-[1.75rem] md:text-[2.25rem]">
        {{ titleLabel }}
      </h2>
      <div v-if="reviews.length > 0" class="flex items-center gap-2 pb-1">
        <PsRatingStars :rating="averageRating ?? 0" :aria-label-text="ratingLabel(averageRating)" />
        <span class="kb-num text-sm text-ink-2">
          {{ countLabel }}
        </span>
      </div>
    </div>

    <p v-if="reviews.length === 0" class="mt-4 text-ink-2">
      {{ emptyLabel }}
    </p>
    <div v-else class="mt-6 flex flex-col gap-4">
      <PsReviewCard
        v-for="review in formattedReviews"
        :key="review.id"
        :rating="review.rating"
        :title="review.title"
        :body="review.body"
        :display-name="review.displayName"
        :photo-url="review.photoUrl"
        :photo-alt-label="review.photoAltLabel"
        :date-label="review.dateLabel"
        :rating-aria-label="review.ratingAriaLabel"
      />
    </div>
  </section>
</template>
