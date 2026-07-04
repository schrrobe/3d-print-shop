<script setup lang="ts">
import { computed } from 'vue'

interface QcChecks {
  colorOk: boolean
  surfaceOk: boolean
  dimensionsOk: boolean
  stabilityOk: boolean
  completenessOk: boolean
  packagingOk: boolean
}

withDefaults(defineProps<{ disabled?: boolean }>(), { disabled: false })

// defineModel keeps a local copy that updates synchronously — consecutive
// toggles accumulate correctly even under rapid input (no stale-prop spread).
const model = defineModel<QcChecks>({ required: true })

const CHECKS: Array<{ key: keyof QcChecks; label: string }> = [
  { key: 'colorOk', label: 'Farbe korrekt' },
  { key: 'surfaceOk', label: 'Oberflächenqualität' },
  { key: 'dimensionsOk', label: 'Maßhaltigkeit' },
  { key: 'stabilityOk', label: 'Stabilität' },
  { key: 'completenessOk', label: 'Vollständigkeit' },
  { key: 'packagingOk', label: 'Verpackung' },
]

const checkedCount = computed(() => CHECKS.filter(({ key }) => model.value[key]).length)

function toggle(key: keyof QcChecks, event: Event) {
  const checked = (event.target as HTMLInputElement).checked
  model.value = { ...model.value, [key]: checked }
}
</script>

<template>
  <div class="flex flex-col gap-sm" data-testid="qc-checklist">
    <span class="text-caption text-secondary" data-testid="qc-progress">
      {{ checkedCount }}/6 geprüft
    </span>
    <label
      v-for="check in CHECKS"
      :key="check.key"
      class="flex items-center gap-sm text-body-regular text-primary"
      :class="disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'"
    >
      <input
        type="checkbox"
        class="size-4 shrink-0 accent-brand"
        :checked="model[check.key]"
        :disabled="disabled"
        :data-testid="`qc-check-${check.key}`"
        @change="toggle(check.key, $event)"
      />
      {{ check.label }}
    </label>
  </div>
</template>
