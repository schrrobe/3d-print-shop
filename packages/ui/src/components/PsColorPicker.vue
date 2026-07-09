<script setup lang="ts">
import type { ColorSelection, ColorZoneSlot } from '@print-shop/types'
import PsColorSwatch from './PsColorSwatch.vue'

defineProps<{
  zones: { slot: ColorZoneSlot; label: string }[]
  colors: { id: string; name: string; hex: string }[]
}>()

const model = defineModel<ColorSelection>({ default: () => ({}) })

function selectColor(zoneSlot: ColorZoneSlot, colorId: string): void {
  model.value = { ...model.value, [zoneSlot]: colorId }
}
</script>

<template>
  <div class="flex flex-col gap-md" data-testid="color-picker">
    <div v-for="zone in zones" :key="zone.slot" class="flex flex-col gap-sm" :data-zone="zone.slot">
      <span class="text-caption text-secondary">{{ zone.label }}</span>
      <div class="flex flex-wrap items-center gap-sm" role="group" :aria-label="zone.label">
        <PsColorSwatch
          v-for="color in colors"
          :key="color.id"
          :hex="color.hex"
          :name="color.name"
          :selected="model[zone.slot] === color.id"
          @select="selectColor(zone.slot, color.id)"
        />
      </div>
    </div>
  </div>
</template>
