<script setup lang="ts">
import { PsConfigurationPreview, PsPillButton, PsPrice } from '@print-shop/ui'
import type { ConfigurationZone } from '@print-shop/ui'
import type { ApiProduct } from '~/composables/useShop'

defineProps<{
  product: ApiProduct
  previewZones: ConfigurationZone[]
  quantity: number
  editMode: boolean
  configuratorLabel: string
  unavailableLabel: string
  quantityLabel: string
  addToCartLabel: string
  saveChangesLabel: string
}>()

const emit = defineEmits<{
  'update:quantity': [quantity: number]
  'open-configurator': []
  'add-to-cart': []
}>()

function normalizeQuantity(value: string) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return 1
  return Math.min(99, Math.max(1, Math.round(parsed)))
}
</script>

<template>
  <div
    class="flex flex-col gap-md rounded-card border border-subtle bg-surface-elevated p-md"
    data-testid="purchase-panel"
  >
    <PsPrice :cents="product.priceCents" size="lg" class="block text-brand" />
    <button
      v-if="product.colorSlots.length > 0"
      type="button"
      class="rounded-card border border-transparent p-sm text-left transition-colors hover:border-brand hover:bg-surface focus-visible:outline-2 focus-visible:outline-brand"
      :aria-label="configuratorLabel"
      data-testid="purchase-configuration-summary"
      @click="emit('open-configurator')"
    >
      <PsConfigurationPreview :zones="previewZones" :unavailable-label="unavailableLabel" />
    </button>
    <div class="flex flex-wrap items-center gap-md">
      <label class="flex items-center gap-sm text-caption text-secondary">
        {{ quantityLabel }}
        <input
          :value="quantity"
          type="number"
          min="1"
          max="99"
          class="w-20 rounded-card border border-subtle bg-surface-elevated px-md py-sm text-body-regular text-primary"
          data-testid="quantity-input"
          @input="emit('update:quantity', normalizeQuantity(($event.target as HTMLInputElement).value))"
        />
      </label>
      <PsPillButton size="lg" data-testid="add-to-cart" @click="emit('add-to-cart')">
        {{ editMode ? saveChangesLabel : addToCartLabel }}
      </PsPillButton>
    </div>
  </div>
</template>
