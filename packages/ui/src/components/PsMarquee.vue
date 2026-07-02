<script setup lang="ts">
withDefaults(defineProps<{ durationSeconds?: number; pauseOnHover?: boolean }>(), {
  durationSeconds: 30,
  pauseOnHover: true,
})
</script>

<template>
  <div class="overflow-hidden" :class="pauseOnHover ? 'ps-marquee--pausable' : ''">
    <div
      class="ps-marquee-track flex w-max"
      :style="{ animationDuration: `${durationSeconds}s` }"
    >
      <div class="flex shrink-0 items-center gap-lg pr-lg">
        <slot />
      </div>
      <div class="flex shrink-0 items-center gap-lg pr-lg" aria-hidden="true">
        <slot />
      </div>
    </div>
  </div>
</template>

<style scoped>
.ps-marquee-track {
  animation-name: ps-marquee;
  animation-timing-function: linear;
  animation-iteration-count: infinite;
}

.ps-marquee--pausable:hover .ps-marquee-track {
  animation-play-state: paused;
}

@keyframes ps-marquee {
  from {
    transform: translateX(0);
  }
  to {
    transform: translateX(-50%);
  }
}

@media (prefers-reduced-motion: reduce) {
  .ps-marquee-track {
    animation: none;
  }
}
</style>
