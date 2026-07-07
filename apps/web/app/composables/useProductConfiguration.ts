import type { ConfigurationZone } from '@print-shop/ui'
import type { ColorSelection } from '@print-shop/types'
import type { Ref } from 'vue'
import { computed, ref, watch } from 'vue'
import type { ApiColor, ApiProduct } from '~/composables/useShop'
import type { LoadedConfiguration } from '~/composables/useWishlist'

export interface PopularCombo {
  selectedColors: ColorSelection
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
  const selection = ref<ColorSelection>({})
  const configWarning = ref<string[]>([])

  function defaultSelectionForProduct(product: ApiProduct) {
    const next: ColorSelection = {}
    for (const zone of product.colorSlots) {
      if (zone.defaultColorId) next[zone.slot] = zone.defaultColorId
    }
    return next
  }

  watch(
    () => options.product.value.id,
    () => {
      selection.value = defaultSelectionForProduct(options.product.value)
      configWarning.value = []
    },
    { immediate: true },
  )

  function resetToDefaults() {
    selection.value = defaultSelectionForProduct(options.product.value)
    configWarning.value = []
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

  function isColorUnavailable(color: ApiColor | undefined) {
    return color ? color.outOfStock === true || color.active === false : false
  }

  const unavailableZones = computed(() =>
    options.product.value.colorSlots
      .map((zone) => {
        const color = options.colors.value.find((c) => c.id === selection.value[zone.slot])
        const unavailable = isColorUnavailable(color)
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
        unavailable: isColorUnavailable(color),
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
    configWarning.value = []
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
