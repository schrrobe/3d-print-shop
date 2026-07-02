<script setup lang="ts">
import gsap from 'gsap'
import { onMounted, onUnmounted, ref } from 'vue'
import { useReducedMotion } from '../composables/useReducedMotion.js'

const props = withDefaults(
  defineProps<{
    value: number
    suffix?: string
    label?: string
    durationSeconds?: number
  }>(),
  { durationSeconds: 1.6 },
)

const reduced = useReducedMotion()
const display = ref(0)
let tween: gsap.core.Tween | null = null

onMounted(() => {
  if (reduced.value) {
    display.value = Math.round(props.value)
    return
  }
  const counter = { n: 0 }
  tween = gsap.to(counter, {
    n: props.value,
    duration: props.durationSeconds,
    ease: 'power2.out',
    onUpdate: () => {
      display.value = Math.round(counter.n)
    },
  })
})

onUnmounted(() => tween?.kill())
</script>

<template>
  <div class="flex flex-col gap-xs" data-testid="stat-counter">
    <span class="text-display-medium tabular-nums text-brand">{{ display }}{{ suffix }}</span>
    <span v-if="label" class="text-caption text-secondary">{{ label }}</span>
  </div>
</template>
