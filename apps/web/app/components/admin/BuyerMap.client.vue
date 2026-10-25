<script setup lang="ts">
/** Buyer heatmap (Unovis heatmap mode) cropped to DE/AT/CH — the map fits the three countries. */
import { WorldMapTopoJSON } from '@unovis/ts/maps'
import { VisSingleContainer, VisTopoJSONMap } from '@unovis/vue'

interface Place {
  lat: number
  lon: number
  count: number
}

const props = defineProps<{ places: Place[]; height: number }>()

const countries = WorldMapTopoJSON.objects.countries
const dach = {
  ...WorldMapTopoJSON,
  objects: {
    countries: {
      ...countries,
      geometries: countries.geometries.filter((g: { id?: string | number }) => ['DE', 'AT', 'CH'].includes(String(g.id))),
    },
  },
}

const max = computed(() => Math.max(1, ...props.places.map((p) => p.count)))
// sqrt instead of linear: one big customer must not make every other place invisible
const heat = (p: Place) => Math.sqrt(p.count / max.value)
</script>

<template>
  <VisSingleContainer :data="{ points: places }" :height="height" :padding="{ top: 8, right: 8, bottom: 8, left: 8 }">
    <VisTopoJSONMap
      :topojson="dach"
      map-feature-name="countries"
      :latitude="(p: Place) => p.lat"
      :longitude="(p: Place) => p.lon"
      :point-radius="(p: Place) => 3 + 9 * heat(p)"
      :point-color="(p: Place) => `color-mix(in oklab, #e5484d ${Math.round(heat(p) * 100)}%, var(--brand))`"
      :point-stroke-width="0"
      heatmap-mode
      :heatmap-mode-blur-std-deviation="5"
      disable-zoom
    />
  </VisSingleContainer>
</template>
