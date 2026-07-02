<script setup lang="ts">
defineProps<{
  title?: string
  subtitle?: string
  tight?: boolean
}>()
</script>

<template>
  <section class="mx-auto w-full max-w-6xl px-md" :class="tight ? 'py-3xl' : 'py-5xl'">
    <div v-if="title || subtitle" class="mb-xl flex flex-col gap-sm">
      <h2 v-if="title" class="text-heading-large text-primary">{{ title }}</h2>
      <p v-if="subtitle" class="max-w-2xl text-body-regular text-secondary">{{ subtitle }}</p>
    </div>
    <slot />
  </section>
</template>
