<script setup lang="ts">
import { useId } from 'vue'

defineProps<{
  label?: string
  type?: string
  placeholder?: string
  error?: string
  required?: boolean
  disabled?: boolean
  autocomplete?: string
  name?: string
}>()

const model = defineModel<string>({ default: '' })
const id = useId()
</script>

<template>
  <div class="flex flex-col gap-xs">
    <label v-if="label" :for="id" class="text-caption text-secondary">
      {{ label }}<span v-if="required" class="text-brand"> *</span>
    </label>
    <input
      :id="id"
      v-model="model"
      :type="type ?? 'text'"
      :name="name"
      :placeholder="placeholder"
      :required="required"
      :disabled="disabled"
      :autocomplete="autocomplete"
      :aria-invalid="error ? 'true' : undefined"
      :aria-describedby="error ? `${id}-error` : undefined"
      class="w-full rounded-card border border-subtle bg-surface-elevated px-md py-md-sm text-body-regular text-primary transition-colors placeholder:text-secondary focus:border-brand focus:outline-none disabled:opacity-50"
      :class="error ? 'border-red-500' : ''"
    />
    <p v-if="error" :id="`${id}-error`" class="text-caption text-red-500" role="alert">
      {{ error }}
    </p>
  </div>
</template>
