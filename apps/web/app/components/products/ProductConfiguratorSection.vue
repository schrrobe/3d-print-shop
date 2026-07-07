<script setup lang="ts">
import { PsAccordion, PsColorPicker, PsConfigurationPreview } from '@print-shop/ui'
import type { ConfigurationZone } from '@print-shop/ui'
import type { ApiColor, ApiProduct } from '~/composables/useShop'
import type { PopularCombo } from '~/composables/useProductConfiguration'

defineProps<{
  product: ApiProduct
  colors: ApiColor[]
  selection: Record<string, string>
  previewZones: ConfigurationZone[]
  colorHexByZone: Record<string, string>
  popular: PopularCombo[]
  configWarning: string[]
  unavailableZones: { slot: string; label: string; colorName: string }[]
  accordionValue: string | undefined
  accordionDefaultValue: string
  accordionItems: { value: string; title: string; content: string }[]
  viewerHintLabel: string
  unavailableLabel: string
  popularLabel: string
  configureLabel: string
  resetLabel: string
  shareLabel: string
  unavailableZoneLabel: (zone: { label: string; colorName: string }) => string
}>()

const emit = defineEmits<{
  'update:selection': [selection: Record<string, string>]
  'update:accordion-value': [value: string | undefined]
  reset: []
  share: []
  'apply-combo': [combo: PopularCombo]
}>()
</script>

<template>
  <section class="mt-3xl scroll-mt-xl" data-testid="configurator">
    <PsAccordion
      :model-value="accordionValue"
      :items="accordionItems"
      :default-value="accordionDefaultValue"
      data-testid="configurator-accordion"
      @update:model-value="emit('update:accordion-value', $event)"
    >
      <template #configurator>
        <div class="grid gap-2xl text-primary lg:grid-cols-2">
          <div>
            <ClientOnly>
              <ModelViewer :src="productGlb(product)" :color-hex-by-zone="colorHexByZone" />
              <template #fallback>
                <div
                  class="aspect-square w-full rounded-card border border-subtle bg-surface-elevated"
                />
              </template>
            </ClientOnly>
            <p class="mt-sm text-center text-caption text-secondary">
              {{ viewerHintLabel }}
            </p>
            <div class="mt-md">
              <PsConfigurationPreview :zones="previewZones" :unavailable-label="unavailableLabel" />
            </div>
          </div>

          <div class="flex flex-col gap-lg">
            <div v-if="popular.length" data-testid="popular-combos">
              <h3 class="mb-sm text-label-medium">{{ popularLabel }}</h3>
              <div class="flex flex-wrap gap-sm">
                <button
                  v-for="(combo, i) in popular"
                  :key="i"
                  type="button"
                  class="flex items-center gap-xs rounded-card border border-subtle bg-surface-elevated px-sm py-xs hover:border-brand"
                  :class="{ 'opacity-50': !combo.available }"
                  data-testid="popular-combo"
                  @click="emit('apply-combo', combo)"
                >
                  <span
                    v-for="sw in combo.swatches"
                    :key="sw.slot"
                    class="inline-block h-4 w-4 rounded-full border border-subtle"
                    :style="{ backgroundColor: sw.hex }"
                    :title="sw.name"
                  />
                  <span class="text-caption text-secondary">×{{ combo.count }}</span>
                </button>
              </div>
            </div>

            <div>
              <h3 class="mb-md text-label-medium">{{ configureLabel }}</h3>
              <PsColorPicker
                :model-value="selection"
                :zones="product.colorSlots.map((s) => ({ slot: s.slot, label: s.label }))"
                :colors="colors"
                @update:model-value="emit('update:selection', $event)"
              />
              <div class="mt-md flex flex-wrap gap-sm">
                <button
                  type="button"
                  class="text-caption text-secondary hover:text-primary"
                  data-testid="config-reset"
                  @click="emit('reset')"
                >
                  ↺ {{ resetLabel }}
                </button>
                <button
                  type="button"
                  class="text-caption text-brand hover:underline"
                  data-testid="config-share"
                  @click="emit('share')"
                >
                  🔗 {{ shareLabel }}
                </button>
              </div>

              <p
                v-for="warn in configWarning"
                :key="warn"
                class="mt-sm text-caption text-amber-500"
                data-testid="config-warning"
              >
                ⚠️ {{ warn }}
              </p>
              <p
                v-for="zone in unavailableZones"
                :key="zone.slot"
                class="mt-sm text-caption text-amber-500"
                data-testid="config-unavailable"
              >
                ⚠️ {{ unavailableZoneLabel(zone) }}
              </p>
            </div>
          </div>
        </div>
      </template>
    </PsAccordion>
  </section>
</template>
