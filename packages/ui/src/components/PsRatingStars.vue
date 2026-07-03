<script setup lang="ts">
import { computed, useId } from 'vue'

const props = withDefaults(
  defineProps<{
    /** Display mode: rating from 1–5, fractional values supported (e.g. 4.3). */
    rating?: number
    /** Accessible label for display mode, e.g. '4,3 von 5 Sternen'. */
    ariaLabelText?: string
    /** Input mode: renders a radio group instead of a static display. */
    input?: boolean
    modelValue?: number
    legendText?: string
    /** Accessible labels for the 5 radio options, e.g. ['Sehr schlecht', …, 'Sehr gut']. */
    starLabels?: string[]
  }>(),
  { rating: 0 },
)

const emit = defineEmits<{ 'update:modelValue': [value: number] }>()

const groupName = useId()

const displayLabel = computed(() => props.ariaLabelText ?? `${props.rating}/5`)

/** Fill width of a single star (0–100%) for fractional display ratings. */
const fillPercent = (star: number) =>
  `${Math.round(Math.min(Math.max(props.rating - (star - 1), 0), 1) * 100)}%`

const STAR_PATH =
  'M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z'
</script>

<template>
  <fieldset
    v-if="input"
    class="m-0 inline-block border-0 p-0"
    data-testid="rating-stars"
  >
    <legend v-if="legendText" class="mb-sm p-0 text-label-medium text-primary">
      {{ legendText }}
    </legend>
    <div class="inline-flex items-center gap-xs">
      <label
        v-for="star in 5"
        :key="star"
        class="cursor-pointer"
      >
        <input
          type="radio"
          class="peer sr-only"
          :name="groupName"
          :value="star"
          :checked="modelValue === star"
          :data-testid="`rating-star-${star}`"
          @change="emit('update:modelValue', star)"
        />
        <span class="sr-only">{{ starLabels?.[star - 1] ?? String(star) }}</span>
        <svg
          viewBox="0 0 24 24"
          class="size-6 rounded-sm transition-colors duration-200 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-brand"
          :class="star <= (modelValue ?? 0) ? 'text-brand' : 'text-subtle hover:text-brand/60'"
          fill="currentColor"
          aria-hidden="true"
        >
          <path :d="STAR_PATH" />
        </svg>
      </label>
    </div>
  </fieldset>

  <div
    v-else
    role="img"
    :aria-label="displayLabel"
    class="inline-flex items-center gap-xs"
    data-testid="rating-stars"
  >
    <span
      v-for="star in 5"
      :key="star"
      class="relative inline-block size-5"
      aria-hidden="true"
    >
      <svg viewBox="0 0 24 24" class="absolute inset-0 size-full text-subtle" fill="currentColor">
        <path :d="STAR_PATH" />
      </svg>
      <span
        class="absolute inset-y-0 left-0 overflow-hidden"
        :style="{ width: fillPercent(star) }"
      >
        <svg viewBox="0 0 24 24" class="size-5 text-brand" fill="currentColor">
          <path :d="STAR_PATH" />
        </svg>
      </span>
    </span>
  </div>
</template>
