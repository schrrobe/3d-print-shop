<script setup lang="ts">
import {
  SelectContent,
  SelectItem,
  SelectItemIndicator,
  SelectItemText,
  SelectPortal,
  SelectRoot,
  SelectTrigger,
  SelectValue,
  SelectViewport,
} from 'radix-vue'
import { useId } from 'vue'

defineProps<{
  label?: string
  options: { value: string; label: string; disabled?: boolean }[]
  placeholder?: string
  error?: string
  disabled?: boolean
  required?: boolean
  name?: string
}>()

const model = defineModel<string>()
const id = useId()
</script>

<template>
  <div class="flex flex-col gap-xs">
    <label v-if="label" :for="id" class="text-caption text-secondary">
      {{ label }}<span v-if="required" class="text-brand"> *</span>
    </label>
    <SelectRoot v-model="model" :disabled="disabled" :required="required" :name="name">
      <SelectTrigger
        :id="id"
        :aria-invalid="error ? 'true' : undefined"
        :aria-describedby="error ? `${id}-error` : undefined"
        class="inline-flex w-full cursor-pointer items-center justify-between gap-sm rounded-card border border-subtle bg-surface-elevated px-md py-md-sm text-body-regular text-primary transition-colors focus-visible:outline-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-50 data-[placeholder]:text-secondary"
        :class="error ? 'border-red-500' : 'hover:border-brand'"
      >
        <SelectValue :placeholder="placeholder ?? 'Bitte wählen'" />
        <span class="text-secondary" aria-hidden="true">▾</span>
      </SelectTrigger>
      <SelectPortal>
        <SelectContent
          class="z-50 min-w-40 overflow-hidden rounded-card border border-subtle bg-surface-elevated shadow-card"
          position="popper"
          :side-offset="4"
        >
          <SelectViewport class="p-xs">
            <SelectItem
              v-for="option in options"
              :key="option.value"
              :value="option.value"
              :disabled="option.disabled"
              class="flex cursor-pointer items-center justify-between gap-sm rounded-card px-md py-sm text-body-regular text-primary outline-none data-[disabled]:cursor-not-allowed data-[disabled]:opacity-40 data-[highlighted]:bg-brand data-[highlighted]:text-on-brand"
            >
              <SelectItemText>{{ option.label }}</SelectItemText>
              <SelectItemIndicator aria-hidden="true">✓</SelectItemIndicator>
            </SelectItem>
          </SelectViewport>
        </SelectContent>
      </SelectPortal>
    </SelectRoot>
    <p v-if="error" :id="`${id}-error`" class="text-caption text-red-500" role="alert">
      {{ error }}
    </p>
  </div>
</template>
