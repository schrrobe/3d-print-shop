<script setup lang="ts">
import { useId } from 'vue'

withDefaults(
  defineProps<{
    label?: string
    placeholder?: string
    error?: string
    required?: boolean
    disabled?: boolean
    rows?: number
    name?: string
  }>(),
  { rows: 4 },
)

const model = defineModel<string>({ default: '' })
const id = useId()
</script>

<template>
  <div class="flex flex-col gap-xs">
    <label v-if="label" :for="id" class="text-caption text-secondary">
      {{ label }}<span v-if="required" class="text-brand"> *</span>
    </label>
    <textarea
      :id="id"
      v-model="model"
      :name="name"
      :rows="rows"
      :placeholder="placeholder"
      :required="required"
      :disabled="disabled"
      :aria-invalid="error ? 'true' : undefined"
      :aria-describedby="error ? `${id}-error` : undefined"
      class="w-full resize-y rounded-card border border-subtle bg-surface-elevated px-md py-md-sm text-body-regular text-primary transition-colors placeholder:text-secondary focus:border-brand focus:outline-none disabled:opacity-50"
      :class="error ? 'border-red-500' : ''"
    ></textarea>
    <p v-if="error" :id="`${id}-error`" class="text-caption text-red-500" role="alert">
      {{ error }}
    </p>
  </div>
</template>
