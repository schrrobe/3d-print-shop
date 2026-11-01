<script setup lang="ts">
/** Buyer heatmap (Unovis heatmap mode) cropped to DE/AT/CH plus every other country with orders. */
import { WorldMapTopoJSON } from '@unovis/ts/maps'
import { VisSingleContainer, VisTopoJSONMap } from '@unovis/vue'

interface Place {
  lat: number
  lon: number
  count: number
}

const props = defineProps<{ places: Place[]; countries: string[]; height: number }>()

type Geometry = { id?: string | number; type: string; arcs: number[][] | number[][][] }

const world = WorldMapTopoJSON.objects.countries
const { arcs, transform } = WorldMapTopoJSON

// The map zooms to fit every shown polygon, so overseas parts (Réunion, Antilles, Canaries) would
// shrink Europe to a dot. Keep polygons north of 34°N, judged by the first point of their outer ring.
// ponytail: fine for the European checkout countries; revisit if we ever ship outside Europe.
const inEurope = (polygon: number[][]) => {
  const i = polygon[0]![0]!
  const y = arcs[i < 0 ? ~i : i]![0]![1]!
  return y * transform.scale[1] + transform.translate[1] > 34
}
const mainland = (g: Geometry): Geometry =>
  g.type === 'MultiPolygon' ? { ...g, arcs: (g.arcs as number[][][]).filter(inEurope) } : g

const shown = computed(() => new Set(['DE', 'AT', 'CH', ...props.countries]))
const map = computed(() => ({
  ...WorldMapTopoJSON,
  objects: {
    countries: {
      ...world,
      geometries: (world.geometries as Geometry[]).filter((g) => shown.value.has(String(g.id))).map(mainland),
    },
  },
}))

const max = computed(() => Math.max(1, ...props.places.map((p) => p.count)))
// sqrt instead of linear: one big customer must not make every other place invisible
const heat = (p: Place) => Math.sqrt(p.count / max.value)
</script>

<template>
  <VisSingleContainer :data="{ points: places }" :height="height" :padding="{ top: 8, right: 8, bottom: 8, left: 8 }">
    <VisTopoJSONMap
      :topojson="map"
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
