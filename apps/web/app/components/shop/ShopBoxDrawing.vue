<script setup lang="ts">
/**
 * Schematic top view of a cartridge box lid, coloured live from the configuration.
 * Three lid sizes after the real boxes: small (≥25 rounds) near-square with one latch,
 * medium (≥50) narrow portrait with one latch, large (≥100) wide with two latches.
 * Illustrative only, no real dimensions are claimed.
 */
const props = withDefaults(
  defineProps<{
    capacity?: number | null
    boxHex: string
    labelHex: string
    caliberLabel: string
    /** Bottleneck cartridge icon instead of the straight-walled one */
    rifle?: boolean
    compact?: boolean
    description?: string
  }>(),
  { capacity: 50, rifle: false, compact: false, description: undefined },
)

const LIDS = {
  small: { w: 200, h: 180, latches: 1 },
  medium: { w: 140, h: 260, latches: 1 },
  large: { w: 280, h: 250, latches: 2 },
} as const

const FRAME = 320
const TAB_H = 10
const LATCH_W = 62
const LATCH_OUT = 18

const size = computed(() => {
  const c = props.capacity ?? 50
  return c < 50 ? 'small' : c < 100 ? 'medium' : 'large'
})
const lid = computed(() => LIDS[size.value])
const x = computed(() => (FRAME - lid.value.w) / 2)
const y = computed(() => (FRAME - lid.value.h - TAB_H - LATCH_OUT) / 2 + TAB_H)

// Hinge tabs on the back edge: one pair per latch
const tabs = computed(() => {
  const { w, latches } = lid.value
  const centers = latches === 1 ? [w / 2] : [w * 0.27, w * 0.73]
  return centers.flatMap((c) => [c - 26, c + 8])
})
const latchCenters = computed(() => {
  const { w, latches } = lid.value
  return latches === 1 ? [w / 2] : [w * 0.25, w * 0.75]
})

// Icon is drawn in a 24×72 box and scaled to the lid
const ICON_PISTOL = 'M2 30C2 12 7 2 12 2S22 12 22 30ZM2 30H22V66H2ZM0 66H24V71H0Z'
const ICON_RIFLE = 'M8 24L12 2L16 24ZM8 24V32L3 40V66H21V40L16 32V24M1 66H23V71H1Z'
const iconScale = computed(() => (lid.value.h * 0.34) / 72)
const labelSize = computed(() =>
  Math.min(40, (lid.value.w - 28) / (props.caliberLabel.length * 0.48)),
)

const latchFill = computed(() => `color-mix(in oklab, ${props.boxHex} 88%, #000)`)
const rimStroke = computed(() => `color-mix(in oklab, ${props.boxHex} 70%, #fff)`)
const id = useId()
</script>

<template>
  <svg
    :viewBox="`0 0 ${FRAME} ${FRAME}`"
    class="block h-auto w-full"
    role="img"
    :aria-labelledby="props.description ? `${id}-desc` : undefined"
    :aria-hidden="props.description ? undefined : 'true'"
    data-testid="box-drawing"
    :data-capacity="props.capacity ?? undefined"
    :data-size="size"
  >
    <title v-if="props.description" :id="`${id}-desc`">{{ props.description }}</title>

    <g :transform="`translate(${x} ${y})`">
      <!-- hinge tabs (back) -->
      <rect
        v-for="tx in tabs"
        :key="tx"
        :x="tx"
        :y="-TAB_H"
        width="18"
        :height="TAB_H + 6"
        rx="3"
        :fill="latchFill"
        class="stroke-ink"
        stroke-width="1.25"
      />

      <!-- lid -->
      <rect
        :width="lid.w"
        :height="lid.h"
        rx="14"
        :fill="props.boxHex"
        class="stroke-ink"
        stroke-width="1.25"
      />
      <rect
        x="6"
        y="6"
        :width="lid.w - 12"
        :height="lid.h - 12"
        rx="10"
        fill="none"
        :stroke="rimStroke"
        stroke-opacity="0.35"
      />

      <!-- engraving -->
      <path
        :d="props.rifle ? ICON_RIFLE : ICON_PISTOL"
        :transform="`translate(${lid.w / 2 - 12 * iconScale} ${lid.h * 0.12}) scale(${iconScale})`"
        fill="none"
        :stroke="props.labelHex"
        :stroke-width="2.2 / iconScale"
        stroke-linejoin="round"
      />
      <text
        :x="lid.w / 2"
        :y="lid.h * 0.62"
        :fill="props.labelHex"
        text-anchor="middle"
        dominant-baseline="central"
        class="kb-display"
        :font-size="labelSize"
      >
        {{ props.caliberLabel }}
      </text>

      <!-- latches (front) -->
      <g
        v-for="lx in latchCenters"
        :key="lx"
        :transform="`translate(${lx - LATCH_W / 2} ${lid.h - 26})`"
      >
        <path
          :d="`M0 0H${LATCH_W}V${26 + LATCH_OUT - 8}Q${LATCH_W} ${26 + LATCH_OUT} ${LATCH_W - 8} ${26 + LATCH_OUT}H8Q0 ${26 + LATCH_OUT} 0 ${26 + LATCH_OUT - 8}Z`"
          :fill="latchFill"
          class="stroke-ink"
          stroke-width="1.25"
        />
        <path
          :d="`M10 0Q${LATCH_W / 2} 16 ${LATCH_W - 10} 0`"
          fill="none"
          :stroke="rimStroke"
          stroke-opacity="0.5"
        />
        <text
          v-if="!props.compact"
          :x="LATCH_W / 2"
          :y="31"
          :fill="props.labelHex"
          text-anchor="middle"
          dominant-baseline="central"
          class="kb-display"
          :font-size="Math.min(12, (LATCH_W - 10) / (props.caliberLabel.length * 0.48))"
        >
          {{ props.caliberLabel }}
        </text>
      </g>
    </g>
  </svg>
</template>
