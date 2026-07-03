<script setup lang="ts">
withDefaults(
  defineProps<{
    title?: string
    subtitle?: string
    tight?: boolean
    /** 'h1' for the page's main section (SEO), 'h2' for everything else. */
    headingLevel?: 'h1' | 'h2'
  }>(),
  { headingLevel: 'h2' },
)
</script>

<template>
  <section class="mx-auto w-full max-w-[72rem] px-md" :class="tight ? 'py-3xl' : 'py-5xl'">
    <div v-if="title || subtitle" class="mb-xl flex flex-col gap-sm">
      <component :is="headingLevel" v-if="title" class="text-heading-large text-primary">
        {{ title }}
      </component>
      <p v-if="subtitle" class="max-w-[42rem] text-body-regular text-secondary">{{ subtitle }}</p>
    </div>
    <slot />
  </section>
</template>
