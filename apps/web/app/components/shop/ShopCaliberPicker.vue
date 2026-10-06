<script setup lang="ts">
import type { ApiCaliberSummary, CaliberGroup } from '~/composables/useCalibers'

/**
 * Caliber choice as a native radio group (arrow keys, form semantics, SR-friendly),
 * grouped by Kurzwaffe / Langwaffe / Randfeuer. `allLabel` adds an "all calibers" option ('').
 */
const props = defineProps<{
  calibers: ApiCaliberSummary[]
  legend: string
  legendVisible?: boolean
  allLabel?: string
  tone?: 'paper' | 'mirror'
}>()

const model = defineModel<string>({ default: '' })
const { t } = useI18n()
const name = useId()

const GROUPS: CaliberGroup[] = ['HANDGUN', 'RIFLE', 'RIMFIRE']
const grouped = computed(() =>
  GROUPS.map((group) => ({
    group,
    items: props.calibers.filter((c) => c.group === group),
  })).filter((g) => g.items.length > 0),
)
</script>

<template>
  <fieldset class="min-w-0" data-testid="caliber-picker">
    <legend :class="props.legendVisible ? 'kb-label mb-3' : 'sr-only'">{{ props.legend }}</legend>
    <div class="flex flex-col gap-4">
      <div v-if="props.allLabel" class="flex">
        <label class="kb-chip" :data-tone="props.tone ?? 'paper'">
          <input
            v-model="model"
            type="radio"
            :name="name"
            value=""
            class="sr-only"
            data-testid="caliber-all"
          />
          <span>{{ props.allLabel }}</span>
        </label>
      </div>
      <div v-for="g in grouped" :key="g.group" class="flex flex-col gap-2">
        <span
          class="kb-tick"
          :class="props.tone === 'mirror' ? 'text-on-mirror-2' : 'text-ink-2'"
          aria-hidden="true"
          >{{ t(`shop.caliberGroups.${g.group}`) }}</span
        >
        <div class="flex flex-wrap gap-2">
          <label
            v-for="c in g.items"
            :key="c.slug"
            class="kb-chip"
            :data-tone="props.tone ?? 'paper'"
            :data-caliber="c.slug"
          >
            <input v-model="model" type="radio" :name="name" :value="c.slug" class="sr-only" />
            <span class="kb-chip-dot" aria-hidden="true" />
            <span>{{ c.name }}</span>
            <span class="sr-only">({{ t(`shop.caliberGroups.${g.group}`) }})</span>
          </label>
        </div>
      </div>
    </div>
  </fieldset>
</template>

<style scoped>
.kb-chip {
  position: relative;
  display: inline-flex;
  min-height: 2.75rem;
  align-items: center;
  gap: 0.5rem;
  border: 1px solid var(--kb-rule-strong);
  border-radius: 2px;
  padding: 0.5rem 0.875rem;
  font-weight: 650;
  font-stretch: 86%;
  font-size: 1.0625rem;
  font-variant-numeric: tabular-nums;
  cursor: pointer;
  color: var(--kb-ink);
  background: transparent;
  transition:
    background-color 140ms ease-out,
    color 140ms ease-out,
    border-color 140ms ease-out;
}
.kb-chip:hover {
  border-color: var(--kb-ink);
}
.kb-chip:has(:checked) {
  border-color: var(--kb-ink);
  background: var(--kb-ink);
  color: var(--kb-paper);
}
.kb-chip:has(:focus-visible) {
  outline: 2px solid var(--kb-hit);
  outline-offset: 2px;
}
.kb-chip-dot {
  display: none;
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 999px;
  background: var(--kb-hit);
}
.kb-chip:has(:checked) .kb-chip-dot {
  display: inline-block;
}

.kb-chip[data-tone='mirror'] {
  border-color: color-mix(in oklab, var(--kb-on-mirror) 40%, transparent);
  color: var(--kb-on-mirror);
}
.kb-chip[data-tone='mirror']:hover {
  border-color: var(--kb-on-mirror);
}
.kb-chip[data-tone='mirror']:has(:checked) {
  border-color: var(--kb-on-mirror);
  background: var(--kb-on-mirror);
  color: var(--kb-mirror);
}
</style>
