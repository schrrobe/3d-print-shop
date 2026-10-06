<script setup lang="ts">
/**
 * Schematic two-view drawing of a cartridge box (top view with sockets, front view with label),
 * coloured live from the configuration. The sibling size is drawn as a dashed outline so
 * 50 ↔ 100 reads as one form changing, not two pictures.
 * Illustrative only: socket layout is schematic, no real dimensions are claimed.
 */
const props = withDefaults(
  defineProps<{
    capacity?: number | null
    boxHex: string
    labelHex: string
    caliberLabel: string
    showSibling?: boolean
    compact?: boolean
    description?: string
    /** Relative socket size (1 = largest case head); schematic, see socketScale() */
    socketScale?: number
  }>(),
  { capacity: 50, showSibling: false, compact: false, description: undefined, socketScale: 0.8 },
)

const COLS = 10
const CELL = 28
const WALL = 12
const X0 = 48
const Y0 = 34
const W = COLS * CELL + WALL * 2
const depthFor = (rows: number) => rows * CELL + WALL * 2

const rows = computed(() => Math.max(1, Math.round((props.capacity ?? 50) / COLS)))
const depth = computed(() => depthFor(rows.value))
const siblingDepth = computed(() => depthFor(rows.value === 10 ? 5 : 10))
const MAX_DEPTH = depthFor(10)
const FRONT_Y = Y0 + MAX_DEPTH + 40
const FRONT_H = 92

const sockets = Array.from({ length: 100 }, (_, i) => ({
  i,
  row: Math.floor(i / COLS),
  cx: X0 + WALL + (i % COLS) * CELL + CELL / 2,
  cy: Y0 + WALL + Math.floor(i / COLS) * CELL + CELL / 2,
}))

const socketFill = computed(() => `color-mix(in oklab, ${props.boxHex} 55%, #000)`)
const rimStroke = computed(() => `color-mix(in oklab, ${props.boxHex} 70%, #fff)`)

const viewBox = computed(() =>
  props.compact
    ? `${X0 - 6} ${Y0 - 6} ${W + 12} ${depth.value + 12}`
    : `0 0 400 ${FRONT_Y + FRONT_H + 18}`,
)
const id = useId()
</script>

<template>
  <svg
    :viewBox="viewBox"
    class="block h-auto w-full"
    role="img"
    :aria-labelledby="props.description ? `${id}-desc` : undefined"
    :aria-hidden="props.description ? undefined : 'true'"
    data-testid="box-drawing"
    :data-capacity="props.capacity ?? undefined"
  >
    <title v-if="props.description" :id="`${id}-desc`">{{ props.description }}</title>

    <!-- dimension: 10 columns -->
    <g v-if="!props.compact" class="stroke-ink-2 text-ink-2" stroke-width="1">
      <line :x1="X0" :y1="Y0 - 18" :x2="X0 + W" :y2="Y0 - 18" />
      <path :d="`M${X0 + 7} ${Y0 - 22} L${X0} ${Y0 - 18} L${X0 + 7} ${Y0 - 14}`" fill="none" />
      <path
        :d="`M${X0 + W - 7} ${Y0 - 22} L${X0 + W} ${Y0 - 18} L${X0 + W - 7} ${Y0 - 14}`"
        fill="none"
      />
      <line :x1="X0" :y1="Y0 - 24" :x2="X0" :y2="Y0 - 4" />
      <line :x1="X0 + W" :y1="Y0 - 24" :x2="X0 + W" :y2="Y0 - 4" />
      <rect
        :x="X0 + W / 2 - 16"
        :y="Y0 - 27"
        width="32"
        height="18"
        class="fill-paper"
        stroke="none"
      />
      <text
        :x="X0 + W / 2"
        :y="Y0 - 17.5"
        class="kb-tick fill-ink-2"
        stroke="none"
        text-anchor="middle"
        dominant-baseline="central"
      >
        {{ COLS }}
      </text>

      <!-- dimension: rows -->
      <line :x1="X0 - 22" :y1="Y0" :x2="X0 - 22" :y2="Y0 + depth" class="kb-geo" />
      <path :d="`M${X0 - 26} ${Y0 + 7} L${X0 - 22} ${Y0} L${X0 - 18} ${Y0 + 7}`" fill="none" />
      <path
        :d="`M${X0 - 26} ${Y0 + depth - 7} L${X0 - 22} ${Y0 + depth} L${X0 - 18} ${Y0 + depth - 7}`"
        fill="none"
        class="kb-geo"
      />
      <rect
        :x="X0 - 34"
        :y="Y0 + depth / 2 - 10"
        width="24"
        height="20"
        class="kb-geo fill-paper"
        stroke="none"
      />
      <text
        :x="X0 - 22"
        :y="Y0 + depth / 2"
        class="kb-tick kb-geo fill-ink-2"
        stroke="none"
        text-anchor="middle"
        dominant-baseline="central"
      >
        {{ rows }}
      </text>
    </g>

    <!-- sibling size, dashed -->
    <rect
      v-if="props.showSibling"
      :x="X0"
      :y="Y0"
      :width="W"
      :height="siblingDepth"
      fill="none"
      class="kb-geo stroke-ink-2"
      stroke-width="1"
      stroke-dasharray="5 4"
    />

    <!-- top view -->
    <rect
      :x="X0"
      :y="Y0"
      :width="W"
      :height="depth"
      :fill="props.boxHex"
      class="kb-geo stroke-ink"
      stroke-width="1.25"
    />
    <rect
      :x="X0 + WALL / 2"
      :y="Y0 + WALL / 2"
      :width="W - WALL"
      :height="depth - WALL"
      fill="none"
      :stroke="rimStroke"
      stroke-opacity="0.35"
      stroke-width="1"
      class="kb-geo"
    />
    <circle
      v-for="s in sockets"
      :key="s.i"
      :cx="s.cx"
      :cy="s.cy"
      :r="CELL * 0.42 * props.socketScale"
      :fill="socketFill"
      class="kb-socket"
      :style="{ opacity: s.row < rows ? 1 : 0, transitionDelay: `${(s.row % 5) * 25}ms` }"
    />

    <template v-if="!props.compact">
      <text :x="X0" :y="Y0 + MAX_DEPTH + 18" class="kb-tick fill-ink-2" dominant-baseline="central">
        {{ props.capacity ?? '' }}
      </text>

      <!-- front view -->
      <rect
        :x="X0"
        :y="FRONT_Y"
        :width="W"
        :height="FRONT_H"
        :fill="props.boxHex"
        class="stroke-ink"
        stroke-width="1.25"
      />
      <line
        :x1="X0"
        :y1="FRONT_Y + 18"
        :x2="X0 + W"
        :y2="FRONT_Y + 18"
        :stroke="rimStroke"
        stroke-opacity="0.45"
        stroke-width="1"
      />
      <text
        :x="X0 + W / 2"
        :y="FRONT_Y + 18 + (FRONT_H - 18) / 2"
        :fill="props.labelHex"
        text-anchor="middle"
        dominant-baseline="central"
        class="kb-display"
        :font-size="props.caliberLabel.length > 9 ? 30 : 38"
      >
        {{ props.caliberLabel }}
      </text>
    </template>
  </svg>
</template>

<style scoped>
.kb-socket {
  transition: opacity 220ms cubic-bezier(0.22, 1, 0.36, 1);
}
.kb-geo {
  transition:
    height 360ms cubic-bezier(0.22, 1, 0.36, 1),
    y 360ms cubic-bezier(0.22, 1, 0.36, 1),
    d 360ms cubic-bezier(0.22, 1, 0.36, 1),
    y2 360ms cubic-bezier(0.22, 1, 0.36, 1);
}
</style>
