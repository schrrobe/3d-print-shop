<script setup lang="ts">
import PsBadge from './PsBadge.vue'
import PsCard from './PsCard.vue'
import PsRatingStars from './PsRatingStars.vue'

defineProps<{
  rating: number
  title?: string | null
  body: string
  displayName: string
  dateLabel?: string
  photoUrl?: string | null
  photoAltLabel?: string
  /** Label for the verified-purchase badge, e.g. 'Verifizierter Kauf' (i18n via prop). */
  verifiedLabel?: string
  /** Accessible label for the star rating, e.g. '4 von 5 Sternen' (i18n via prop). */
  ratingAriaLabel?: string
}>()
</script>

<template>
  <PsCard data-testid="review-card">
    <div class="flex flex-col gap-sm">
      <PsRatingStars :rating="rating" :aria-label-text="ratingAriaLabel" />
      <h3 v-if="title" class="text-label-medium font-semibold text-primary">
        {{ title }}
      </h3>
      <p class="text-secondary">{{ body }}</p>
      <img
        v-if="photoUrl"
        :src="photoUrl"
        :alt="photoAltLabel ?? title ?? displayName"
        class="size-20 rounded-card border border-subtle object-cover"
        loading="lazy"
      />
      <footer class="flex flex-wrap items-center gap-sm text-caption text-secondary">
        <span class="font-medium text-primary">{{ displayName }}</span>
        <span v-if="dateLabel">{{ dateLabel }}</span>
        <PsBadge v-if="verifiedLabel" variant="brand">{{ verifiedLabel }}</PsBadge>
      </footer>
    </div>
  </PsCard>
</template>
