<script setup lang="ts">
import type { Part, PartStatus } from '@print-shop/types'

/** Fertigungsstand aller Bauteile einer Bestellung als Prozentbalken (Anteil fertig). */
const props = defineProps<{ items: { parts: Record<Part, PartStatus> | null }[] }>()
const { t } = useI18n()

const counts = computed(() => {
  const c: Record<PartStatus, number> = { done: 0, in_progress: 0, open: 0 }
  for (const item of props.items)
    for (const status of Object.values(item.parts ?? {})) c[status as PartStatus]++
  return c
})
const total = computed(() => counts.value.done + counts.value.in_progress + counts.value.open)
const percent = computed(() => Math.round((counts.value.done / total.value) * 100))

// One hue, light→dark: open is the neutral track, in progress a lighter brand step.
const STEPS = ['done', 'in_progress', 'open'] as const
const COLORS: Record<PartStatus, string> = {
  done: 'var(--color-brand)',
  in_progress: 'color-mix(in srgb, var(--color-brand) 55%, var(--color-surface))',
  open: 'var(--border-subtle)',
}
const categories = computed(() =>
  Object.fromEntries(STEPS.map((s) => [s, { name: t(`order.parts.${s}`), color: COLORS[s] }])),
)
</script>

<template>
  <div v-if="total" data-testid="parts-progress" :data-percent="percent">
    <div class="flex items-baseline justify-between gap-md">
      <span class="text-label-medium">{{ t('order.parts.title') }}</span>
      <span class="text-label-medium">{{ t('order.parts.percentDone', { percent }) }}</span>
    </div>
    <ClientOnly>
      <div
        class="mt-sm"
        role="img"
        :aria-label="`${t('order.parts.title')}: ${t('order.parts.percentDone', { percent })}`"
      >
        <BarChart
          :data="[{ ...counts }]"
          :height="16"
          :categories="categories"
          :y-axis="[...STEPS]"
          :orientation="Orientation.Horizontal"
          :x-domain="[0, total]"
          :padding="{ top: 0, right: 0, bottom: 0, left: 0 }"
          :radius="4"
          stacked
          hide-legend
          hide-x-axis
          hide-y-axis
        />
      </div>
    </ClientOnly>
    <ul class="mt-xs flex flex-wrap gap-x-md text-caption text-secondary">
      <li v-for="s in STEPS" :key="s" class="flex items-center gap-xs">
        <span
          class="inline-block size-2.5 rounded-full"
          :style="{ backgroundColor: COLORS[s] }"
          aria-hidden="true"
        />
        {{ counts[s] }} {{ t(`order.parts.${s}`) }}
      </li>
    </ul>
  </div>
</template>
