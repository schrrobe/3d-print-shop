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
  <section class="mx-auto mt-3xl max-w-[52rem]" data-testid="product-reviews">
    <div class="flex flex-wrap items-center gap-md">
      <h2 class="text-heading-small">{{ titleLabel }}</h2>
      <div v-if="reviews.length > 0" class="flex items-center gap-sm">
        <PsRatingStars :rating="averageRating ?? 0" :aria-label-text="ratingLabel(averageRating)" />
        <span class="text-caption text-secondary">
          {{ countLabel }}
        </span>
      </div>
    </div>

    <p v-if="reviews.length === 0" class="mt-md text-body-regular text-secondary">
      {{ emptyLabel }}
    </p>
    <div v-else class="mt-lg flex flex-col gap-md">
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
