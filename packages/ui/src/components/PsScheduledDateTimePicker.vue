<script setup lang="ts">
import { computed, useId } from 'vue'

/**
 * Timezone-aware scheduling input: the admin types local wall-clock time
 * (native datetime-local), the model always holds an ISO-8601 UTC string.
 */
const props = defineProps<{
  label?: string
  error?: string
  required?: boolean
  disabled?: boolean
  min?: string
}>()

/** ISO-8601 UTC (e.g. 2026-07-03T14:30:00.000Z) or null */
const model = defineModel<string | null>({ default: null })
const id = useId()

function toLocalInputValue(iso: string | null): string {
  if (!iso) return ''
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

const localValue = computed({
  get: () => toLocalInputValue(model.value),
  set: (value: string) => {
    // datetime-local is wall-clock local time; Date() interprets it as such
    model.value = value ? new Date(value).toISOString() : null
  },
})

const minLocal = computed(() => (props.min ? toLocalInputValue(props.min) : undefined))

const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone
</script>

<template>
  <div class="flex flex-col gap-xs">
    <label v-if="label" :for="id" class="text-caption text-secondary">
      {{ label }}<span v-if="required" class="text-brand"> *</span>
    </label>
    <input
      :id="id"
      v-model="localValue"
      type="datetime-local"
      :min="minLocal"
      :required="required"
      :disabled="disabled"
      :aria-invalid="error ? 'true' : undefined"
      :aria-describedby="error ? `${id}-error` : `${id}-tz`"
      data-testid="scheduled-datetime"
      class="w-full rounded-card border border-subtle bg-surface-elevated px-md py-md-sm text-body-regular text-primary transition-colors focus:border-brand focus:outline-none disabled:opacity-50"
      :class="error ? 'border-red-500' : ''"
    />
    <p v-if="error" :id="`${id}-error`" class="text-caption text-red-500" role="alert">
      {{ error }}
    </p>
    <p v-else :id="`${id}-tz`" class="text-caption text-secondary">
      Zeitzone: {{ timeZone }} · gespeichert wird UTC
    </p>
  </div>
</template>
