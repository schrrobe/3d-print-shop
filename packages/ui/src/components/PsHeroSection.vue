<script setup lang="ts">
import PsAnimatedHeadline from './PsAnimatedHeadline.vue'
import PsBadge from './PsBadge.vue'

defineProps<{
  eyebrow?: string
  title: string
  subtitle?: string
}>()
</script>

<template>
  <section
    class="flex min-h-[70vh] w-full flex-col justify-center px-md py-5xl"
    data-testid="hero"
  >
    <div class="mx-auto grid w-full max-w-6xl items-center gap-2xl lg:grid-cols-2">
      <div class="flex flex-col items-start gap-lg">
        <PsBadge v-if="eyebrow" variant="brand">{{ eyebrow }}</PsBadge>
        <PsAnimatedHeadline :text="title" tag="h1" class="text-display-large text-primary" />
        <p v-if="subtitle" class="max-w-2xl text-body-regular text-secondary">{{ subtitle }}</p>
        <div v-if="$slots.actions" class="flex flex-wrap items-center gap-md">
          <slot name="actions" />
        </div>
      </div>
      <div v-if="$slots.media">
        <slot name="media" />
      </div>
    </div>
  </section>
</template>
