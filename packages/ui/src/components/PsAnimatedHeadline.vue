<script setup lang="ts">
import gsap from 'gsap'
import { computed, onMounted, ref, useAttrs } from 'vue'
import { useReducedMotion } from '../composables/useReducedMotion.js'

const props = withDefaults(
  defineProps<{ text: string; tag?: string; stagger?: number }>(),
  { tag: 'h2', stagger: 0.04 },
)

const attrs = useAttrs()
const root = ref<HTMLElement | null>(null)
const reduced = useReducedMotion()
const words = computed(() => props.text.split(/\s+/).filter(Boolean))

onMounted(() => {
  if (reduced.value || !root.value) return
  const targets = root.value.querySelectorAll('[data-word]')
  if (targets.length === 0) return
  gsap.from(targets, {
    yPercent: 110,
    opacity: 0,
    duration: 0.8,
    ease: 'power3.out',
    stagger: props.stagger,
  })
})
</script>

<template>
  <component
    :is="tag"
    ref="root"
    :class="attrs.class ? undefined : 'text-display-medium'"
    data-testid="animated-headline"
  >
    <span
      v-for="(word, index) in words"
      :key="`${word}-${index}`"
      class="inline-block overflow-hidden align-bottom"
    >
      <span data-word class="inline-block will-change-transform"
        >{{ word }}<template v-if="index < words.length - 1">&nbsp;</template></span
      >
    </span>
  </component>
</template>
