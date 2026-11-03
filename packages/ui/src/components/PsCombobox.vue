<script setup lang="ts">
import {
  ComboboxAnchor,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxPortal,
  ComboboxRoot,
  ComboboxTrigger,
  ComboboxViewport,
} from 'radix-vue'
import { computed, useId } from 'vue'

const props = defineProps<{
  label?: string
  options: { value: string; label: string; disabled?: boolean }[]
  placeholder?: string
  emptyText?: string
  error?: string
  disabled?: boolean
  required?: boolean
  name?: string
}>()

const model = defineModel<string>()
const id = useId()

const labels = computed(() => new Map(props.options.map((o) => [o.value, o.label])))
const labelOf = (value: string) => labels.value.get(value) ?? ''

// radix-vue filters item values by default; ours are ids, so match on the visible label.
function filterByLabel(values: string[], term: string): string[] {
  const needle = term.trim().toLowerCase()
  return needle ? values.filter((v) => labelOf(v).toLowerCase().includes(needle)) : values
}
</script>

<template>
  <div class="flex flex-col gap-xs">
    <label v-if="label" :for="id" class="text-caption text-secondary">
      {{ label }}<span v-if="required" class="text-brand"> *</span>
    </label>
    <ComboboxRoot
      v-model="model"
      :disabled="disabled"
      :name="name"
      :display-value="labelOf"
      :filter-function="filterByLabel as never"
    >
      <ComboboxAnchor
        class="inline-flex w-full items-center justify-between gap-sm rounded-card border border-subtle bg-surface-elevated px-md py-md-sm text-body-regular text-primary transition-colors focus-within:outline-2 focus-within:outline-brand"
        :class="[error ? 'border-red-500' : 'hover:border-brand', disabled && 'opacity-50']"
      >
        <ComboboxInput
          :id="id"
          :placeholder="placeholder ?? 'Suchen …'"
          :required="required"
          :aria-invalid="error ? 'true' : undefined"
          :aria-describedby="error ? `${id}-error` : undefined"
          class="min-w-0 flex-1 bg-transparent outline-none placeholder:text-secondary disabled:cursor-not-allowed"
        />
        <ComboboxTrigger class="cursor-pointer text-secondary" aria-label="Optionen anzeigen">
          ▾
        </ComboboxTrigger>
      </ComboboxAnchor>
      <ComboboxPortal>
        <ComboboxContent
          class="z-50 flex max-h-[min(24rem,var(--radix-combobox-content-available-height))] w-[var(--radix-combobox-trigger-width)] min-w-40 flex-col overflow-hidden rounded-card border border-subtle bg-surface-elevated shadow-card"
          position="popper"
          :side-offset="4"
        >
          <ComboboxViewport class="p-xs">
            <ComboboxEmpty class="px-md py-sm text-body-regular text-secondary">
              {{ emptyText ?? 'Keine Treffer' }}
            </ComboboxEmpty>
            <ComboboxItem
              v-for="option in options"
              :key="option.value"
              :value="option.value"
              :disabled="option.disabled"
              class="flex cursor-pointer items-center rounded-card px-md py-sm text-body-regular text-primary outline-none data-[disabled]:cursor-not-allowed data-[disabled]:opacity-40 data-[highlighted]:bg-brand data-[highlighted]:text-on-brand"
            >
              {{ option.label }}
            </ComboboxItem>
          </ComboboxViewport>
        </ComboboxContent>
      </ComboboxPortal>
    </ComboboxRoot>
    <p v-if="error" :id="`${id}-error`" class="text-caption text-red-500" role="alert">
      {{ error }}
    </p>
  </div>
</template>
