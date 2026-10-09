<script setup lang="ts">
import type { ColorSelection, ColorZoneSlot } from '@print-shop/types'
import type { ApiColor } from '~/composables/useShop'

/**
 * Filament swatches per colour zone. Toggle buttons (aria-pressed) inside a labelled group;
 * the chosen colour's name is always printed beside the zone label, so colour is never the
 * only carrier of the choice. Out-of-stock colours stay selectable but are struck through
 * (the configurator warns and production decides).
 */
const props = defineProps<{
  zones: { slot: ColorZoneSlot; label: string }[]
  colors: ApiColor[]
}>()

const model = defineModel<ColorSelection>({ default: () => ({}) })
const { t } = useI18n()

function select(slot: ColorZoneSlot, colorId: string) {
  model.value = { ...model.value, [slot]: colorId }
}
function chosen(slot: ColorZoneSlot) {
  return props.colors.find((c) => c.id === model.value[slot])
}
function unavailable(c: ApiColor) {
  return Boolean(c.outOfStock) || !c.active
}
// Light swatches need a dark tick, dark ones a light tick
function tickClass(hex: string) {
  const n = Number.parseInt(hex.replace('#', '').padEnd(6, '0').slice(0, 6), 16)
  const lum = (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255
  return lum > 0.6 ? 'text-[#121417]' : 'text-white'
}
</script>

<template>
  <div class="flex flex-col gap-7" data-testid="color-picker">
    <div v-for="zone in zones" :key="zone.slot" :data-zone="zone.slot">
      <p
        :id="`zone-${zone.slot}`"
        class="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1"
      >
        <span class="font-bold">{{ zone.label }}</span>
        <span class="text-ink-2" aria-live="polite">
          {{ chosen(zone.slot)?.name ?? t('shop.configurator.noColor') }}
          <template v-if="chosen(zone.slot) && unavailable(chosen(zone.slot)!)">
            · <span class="font-semibold text-warn">{{ t('configurator.unavailableShort') }}</span>
          </template>
        </span>
      </p>
      <div
        class="mt-3 grid grid-cols-[repeat(auto-fill,minmax(2.75rem,1fr))] gap-1.5"
        role="group"
        :aria-labelledby="`zone-${zone.slot}`"
      >
        <button
          v-for="color in colors"
          :key="color.id"
          type="button"
          class="relative grid aspect-square min-h-11 place-items-center border border-ink/25 outline-offset-2 transition-transform aria-pressed:z-10 aria-pressed:scale-[1.06] aria-pressed:border-ink aria-pressed:outline aria-pressed:outline-2 aria-pressed:outline-ink"
          :style="{ backgroundColor: color.hex }"
          :aria-pressed="model[zone.slot] === color.id"
          :aria-label="
            unavailable(color)
              ? `${color.name} (${t('configurator.unavailableShort')})`
              : color.name
          "
          :title="color.name"
          data-testid="color-swatch"
          @click="select(zone.slot, color.id)"
        >
          <svg
            v-if="unavailable(color)"
            class="absolute inset-0 size-full"
            viewBox="0 0 10 10"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <line x1="0" y1="10" x2="10" y2="0" stroke="#b42318" stroke-width="0.6" />
          </svg>
          <ShopIcon
            v-if="model[zone.slot] === color.id"
            name="check"
            :size="20"
            :class="tickClass(color.hex)"
          />
        </button>
      </div>
    </div>
  </div>
</template>
