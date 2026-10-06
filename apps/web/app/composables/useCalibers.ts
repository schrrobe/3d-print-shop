import type { ColorSelection } from '@print-shop/types'
import type { ApiCaliber, ApiCaliberGroup, ApiColor, ApiProduct } from '~/composables/useShop'

export type CaliberGroup = ApiCaliberGroup
export type ApiCaliberSummary = ApiCaliber

export function useCalibers() {
  return useFetch<{ calibers: ApiCaliberSummary[] }>('/api/calibers', {
    key: 'calibers',
    default: () => ({ calibers: [] }),
  })
}

/** One card in the shop = one caliber box in all its sizes (50 / 100). */
export interface ProductFamily {
  key: string
  lead: ApiProduct
  products: ApiProduct[]
  caliberName: string
  group: CaliberGroup | null
  fromPriceCents: number
}

export function groupFamilies(products: ApiProduct[], locale: string): ProductFamily[] {
  const map = new Map<string, ApiProduct[]>()
  for (const product of products) {
    const key = product.familyKey ?? product.slug
    map.set(key, [...(map.get(key) ?? []), product])
  }
  return [...map.entries()].map(([key, items]) => {
    const sorted = [...items].sort((a, b) => (a.capacity ?? 0) - (b.capacity ?? 0))
    const lead = sorted[0]!
    const caliber = lead.calibers?.[0]
    return {
      key,
      lead,
      products: sorted,
      caliberName: caliber?.name ?? pickTranslation(lead, locale).name,
      group: caliber?.group ?? null,
      fromPriceCents: Math.min(...sorted.map((p) => p.priceCents)),
    }
  })
}

/** The box body and the printed label are the two colour zones of every cartridge box. */
export function boxZones(product: ApiProduct) {
  const slots = product.colorSlots
  const box = slots.find((s) => s.slot === 'zone_1_main') ?? slots[0]
  const label = slots.find((s) => s.slot === 'zone_4_text') ?? slots[slots.length - 1]
  return { box, label: label && label !== box ? label : undefined }
}

const FALLBACK_BOX = '#2b2f36'
const FALLBACK_LABEL = '#f3f1ea'

export function boxColors(
  product: ApiProduct,
  colors: ApiColor[],
  selection?: ColorSelection,
): { box: string; label: string; boxName: string; labelName: string } {
  const { box, label } = boxZones(product)
  const find = (slot: typeof box) => {
    if (!slot) return undefined
    const id = selection?.[slot.slot] ?? slot.defaultColorId
    return colors.find((c) => c.id === id)
  }
  const boxColor = find(box)
  const labelColor = find(label)
  return {
    box: boxColor?.hex ?? FALLBACK_BOX,
    label: labelColor?.hex ?? FALLBACK_LABEL,
    boxName: boxColor?.name ?? '',
    labelName: labelColor?.name ?? '',
  }
}
