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
    <div class="flex flex-col gap-2.5">
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
      <div
        v-for="g in grouped"
        :key="g.group"
        class="grid grid-cols-[5.75rem_1fr] items-start gap-x-3 sm:grid-cols-[6.5rem_1fr]"
      >
        <span
          class="kb-tick pt-[0.95rem]"
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
            <svg class="kb-chip-ring" width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
              <circle cx="8" cy="8" r="7" fill="none" stroke="currentColor" stroke-width="1" />
              <circle cx="8" cy="8" r="3.6" fill="none" stroke="currentColor" stroke-width="1" />
              <circle class="kb-chip-hit" cx="8" cy="8" r="2.6" />
            </svg>
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
.kb-chip-ring {
  flex: none;
  opacity: 0.7;
}
.kb-chip-hit {
  fill: transparent;
  transition: fill 140ms ease-out;
}
.kb-chip:has(:checked) .kb-chip-ring {
  opacity: 1;
}
.kb-chip:has(:checked) .kb-chip-hit {
  fill: var(--kb-hit);
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
