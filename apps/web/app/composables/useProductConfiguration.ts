import type { ConfigurationZone } from '@print-shop/ui'
import type { Ref } from 'vue'
import { computed, ref, watchEffect } from 'vue'
import type { ApiColor, ApiProduct } from '~/composables/useShop'
import type { LoadedConfiguration } from '~/composables/useWishlist'

export interface PopularCombo {
  selectedColors: Record<string, string>
  count: number
  swatches: { slot: string; colorId: string; hex: string; name: string }[]
  available: boolean
}

interface UseProductConfigurationOptions {
  product: Ref<ApiProduct>
  colors: Ref<ApiColor[]>
  loadConfiguration: (shareToken: string) => Promise<LoadedConfiguration>
  availabilityLabel: (state: LoadedConfiguration['availability'][string]) => string
  loadError: () => void
}

export function useProductConfiguration(options: UseProductConfigurationOptions) {
  const selection = ref<Record<string, string>>({})
  const configWarning = ref<string[]>([])

  watchEffect(() => {
    for (const zone of options.product.value.colorSlots) {
      if (!selection.value[zone.slot] && zone.defaultColorId) {
        selection.value[zone.slot] = zone.defaultColorId
      }
    }
  })

  function resetToDefaults() {
    const next: Record<string, string> = {}
    for (const zone of options.product.value.colorSlots) {
      if (zone.defaultColorId) next[zone.slot] = zone.defaultColorId
    }
    selection.value = next
  }

  const colorHexByZone = computed(() => {
    const map: Record<string, string> = {}
    for (const [zone, colorId] of Object.entries(selection.value)) {
      const color = options.colors.value.find((c) => c.id === colorId)
      if (color) map[zone] = color.hex
    }
    return map
  })

  const selectedColorNames = computed(() =>
    Object.values(selection.value)
      .map((id) => options.colors.value.find((c) => c.id === id)?.name)
      .filter((name): name is string => Boolean(name)),
  )

  const unavailableZones = computed(() =>
    options.product.value.colorSlots
      .map((zone) => {
        const color = options.colors.value.find((c) => c.id === selection.value[zone.slot])
        const unavailable = color ? color.outOfStock === true || color.active === false : false
        return { slot: zone.slot, label: zone.label, colorName: color?.name ?? '', unavailable }
      })
      .filter((z) => z.unavailable),
  )

  const previewZones = computed<ConfigurationZone[]>(() =>
    options.product.value.colorSlots.map((zone) => {
      const color = options.colors.value.find((c) => c.id === selection.value[zone.slot])
      return {
        slot: zone.slot,
        label: zone.label,
        colorName: color?.name ?? '',
        hex: color?.hex ?? '#000000',
        unavailable: color ? color.outOfStock === true || color.active === false : false,
      }
    }),
  )

  async function applyConfigToken(shareToken: string) {
    try {
      const config = await options.loadConfiguration(shareToken)
      selection.value = { ...selection.value, ...config.selectedColors }
      configWarning.value = Object.entries(config.availability)
        .filter(([, state]) => state !== 'ok')
        .map(([zoneSlot, state]) => {
          const zone = options.product.value.colorSlots.find((z) => z.slot === zoneSlot)
          return `${zone?.label ?? zoneSlot}: ${options.availabilityLabel(state)}`
        })
    } catch {
      options.loadError()
    }
  }

  function applyCombo(combo: PopularCombo) {
    selection.value = { ...selection.value, ...combo.selectedColors }
  }

  return {
    selection,
    configWarning,
    colorHexByZone,
    selectedColorNames,
    unavailableZones,
    previewZones,
    resetToDefaults,
    applyConfigToken,
    applyCombo,
  }
}
