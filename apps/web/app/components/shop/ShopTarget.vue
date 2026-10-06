<script setup lang="ts">
/**
 * The Ringscheibe: ten scoring rings, a black mirror over rings 4–10 and one hit.
 * Purely visual (aria-hidden) — the chosen caliber is announced by the picker and the CTA.
 * Changing `label` replays the shot: the hit flies into the centre, one ring pulses.
 */
const props = defineProps<{ label: string; sublabel?: string }>()

const C = 200
const ringRadius = (n: number) => 19 * (11 - n) // ring 1 → 190, ring 10 → 19
const rings = Array.from({ length: 10 }, (_, i) => i + 1)
const MIRROR_FROM = 4
const numbered = [1, 2, 3, 4, 5, 6, 7, 8]
const AXES: [number, number][] = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
]
</script>

<template>
  <div class="relative aspect-square w-full select-none" aria-hidden="true">
    <svg viewBox="0 0 400 400" class="absolute inset-0 size-full overflow-visible">
      <!-- card stock -->
      <circle :cx="C" :cy="C" r="190" class="fill-paper-raised stroke-ink" stroke-width="1.25" />
      <!-- mirror -->
      <circle :cx="C" :cy="C" :r="ringRadius(MIRROR_FROM)" class="fill-mirror" />
      <!-- ring lines -->
      <circle
        v-for="n in rings.slice(1)"
        :key="n"
        :cx="C"
        :cy="C"
        :r="ringRadius(n)"
        fill="none"
        stroke-width="1"
        :class="n > MIRROR_FROM ? 'stroke-on-mirror/25' : 'stroke-ink/70'"
      />
      <!-- ring numbers on both axes -->
      <g class="kb-tick" font-size="11" text-anchor="middle" dominant-baseline="central">
        <template v-for="n in numbered" :key="n">
          <text
            v-for="[dx, dy] in n >= MIRROR_FROM ? AXES.filter(([, y]) => y === -1) : AXES"
            :key="`${n}-${dx}-${dy}`"
            :x="C + dx * (ringRadius(n) - 9.5)"
            :y="C + dy * (ringRadius(n) - 9.5)"
            :class="n >= MIRROR_FROM ? 'fill-on-mirror/55' : 'fill-ink/70'"
          >
            {{ n }}
          </text>
        </template>
      </g>
      <!-- crosshair ticks outside the card -->
      <g class="stroke-ink" stroke-width="1">
        <line :x1="C" y1="0" :x2="C" y2="6" />
        <line :x1="C" y1="394" :x2="C" y2="400" />
        <line x1="0" :y1="C" x2="6" :y2="C" />
        <line x1="394" :y1="C" x2="400" :y2="C" />
      </g>
      <!-- the shot: keyed so every caliber change replays it -->
      <g :key="props.label">
        <circle
          :cx="C"
          :cy="C"
          :r="ringRadius(9)"
          fill="none"
          class="kb-pulse stroke-hit"
          stroke-width="2"
        />
        <g class="kb-shot">
          <circle :cx="C + 5" :cy="C - 4" r="8.5" class="fill-hit" />
          <circle
            :cx="C + 5"
            :cy="C - 4"
            r="8.5"
            fill="none"
            class="stroke-on-mirror"
            stroke-width="1.5"
          />
        </g>
      </g>
    </svg>

    <!-- caliber set inside the mirror -->
    <div class="absolute inset-x-[20%] top-[56%] flex justify-center text-center">
      <Transition name="kb-swap" mode="out-in">
        <div :key="props.label" class="flex flex-col items-center gap-2 px-2">
          <span
            class="kb-display text-on-mirror"
            :style="{
              fontSize:
                props.label.length > 8
                  ? 'clamp(1.75rem, 8.5cqi, 3.5rem)'
                  : 'clamp(2rem, 10.5cqi, 4.25rem)',
            }"
          >
            {{ props.label }}
          </span>
          <span v-if="props.sublabel" class="kb-tick text-on-mirror-2">{{ props.sublabel }}</span>
        </div>
      </Transition>
    </div>
  </div>
</template>

<style scoped>
div.relative {
  container-type: inline-size;
}

.kb-shot {
  transform-origin: 200px 200px;
  animation: kb-shot 520ms cubic-bezier(0.16, 1, 0.3, 1) both;
}
@keyframes kb-shot {
  from {
    transform: translate(150px, -170px) scale(0.4);
    opacity: 0;
  }
  60% {
    opacity: 1;
  }
  to {
    transform: none;
    opacity: 1;
  }
}

.kb-pulse {
  transform-origin: 200px 200px;
  animation: kb-pulse 900ms 380ms cubic-bezier(0.16, 1, 0.3, 1) both;
}
@keyframes kb-pulse {
  from {
    transform: scale(0.3);
    opacity: 0.9;
  }
  to {
    transform: scale(7.5);
    opacity: 0;
  }
}

.kb-swap-enter-active,
.kb-swap-leave-active {
  transition:
    clip-path 260ms cubic-bezier(0.16, 1, 0.3, 1),
    transform 260ms cubic-bezier(0.16, 1, 0.3, 1);
}
.kb-swap-enter-from {
  clip-path: inset(100% 0 0 0);
  transform: translateY(0.4em);
}
.kb-swap-leave-to {
  clip-path: inset(0 0 100% 0);
  transform: translateY(-0.4em);
}

@media (prefers-reduced-motion: reduce) {
  .kb-shot,
  .kb-pulse {
    animation: none;
  }
  .kb-pulse {
    opacity: 0;
  }
}
</style>
