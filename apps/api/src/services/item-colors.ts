import type { Prisma } from '@prisma/client'
import { prisma } from '../lib/prisma.js'

export interface ItemColor {
  slot: string
  /** Product-specific zone label, falls back to the slot key */
  label: string
  name: string
  hex: string | null
}

type ColorItem = { colorSelection: Prisma.JsonValue | null; productId: string | null }

/**
 * Resolves OrderItem.colorSelection (zone → colorId) to labelled colors for admin views.
 * Done server-side because shipping/production/support roles lack colors:read.
 * Returns a lookup so callers can attach colors to items nested anywhere in their payload.
 */
export async function itemColorResolver(
  items: ColorItem[],
): Promise<(item: ColorItem) => ItemColor[]> {
  const selectionOf = (i: ColorItem) => (i.colorSelection ?? {}) as Record<string, string>
  const productIds = [...new Set(items.flatMap((i) => (i.productId ? [i.productId] : [])))]
  const [colors, slots] = await Promise.all([
    prisma.color.findMany({
      where: { id: { in: items.flatMap((i) => Object.values(selectionOf(i))) } },
      select: { id: true, name: true, hex: true },
    }),
    prisma.productColorSlot.findMany({
      where: { productId: { in: productIds } },
      select: { productId: true, slot: true, label: true },
    }),
  ])
  const colorById = new Map(colors.map((c) => [c.id, c]))
  const labelOf = new Map(slots.map((s) => [`${s.productId}:${s.slot}`, s.label]))

  return (item) =>
    Object.entries(selectionOf(item))
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([slot, colorId]) => ({
        slot,
        label: labelOf.get(`${item.productId}:${slot}`) ?? slot,
        name: colorById.get(colorId)?.name ?? 'Unbekannte Farbe',
        hex: colorById.get(colorId)?.hex ?? null,
      }))
}
