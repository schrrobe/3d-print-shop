import type { ColorSelection, ColorZoneSlot } from '@print-shop/types'
import { colorSelectionSchema } from '@print-shop/validators'
import { prisma } from '../lib/prisma.js'
import { badRequest } from '../middleware/error.js'

const SINGLETON_ID = 'singleton'

export async function loadDefaultColors(): Promise<ColorSelection> {
  const row = await prisma.shopSettings.findUnique({
    where: { id: SINGLETON_ID },
    select: { defaultColors: true },
  })
  const parsed = colorSelectionSchema.safeParse(row?.defaultColors ?? {})
  return parsed.success ? parsed.data : {}
}

/** Saves the shop-wide defaults and copies them onto every product's slot of that zone. */
export async function saveDefaultColors(input: ColorSelection): Promise<number> {
  const entries = Object.entries(input).filter((e): e is [ColorZoneSlot, string] => Boolean(e[1]))
  const ids = [...new Set(entries.map(([, id]) => id))]
  const found = await prisma.color.count({ where: { id: { in: ids } } })
  if (found !== ids.length) throw badRequest('Unknown color')

  const defaultColors = Object.fromEntries(entries)
  return prisma.$transaction(async (tx) => {
    await tx.shopSettings.upsert({
      where: { id: SINGLETON_ID },
      create: { id: SINGLETON_ID, defaultColors },
      update: { defaultColors },
    })
    let updated = 0
    for (const [slot, defaultColorId] of entries) {
      const r = await tx.productColorSlot.updateMany({
        where: { slot },
        data: { defaultColorId },
      })
      updated += r.count
    }
    return updated
  })
}

/** New products start with the shop-wide default where they don't set their own. */
export function withDefaultColors<
  T extends { slot: ColorZoneSlot; defaultColorId?: string | null },
>(slots: T[], defaults: ColorSelection): T[] {
  return slots.map((s) => ({ ...s, defaultColorId: s.defaultColorId ?? defaults[s.slot] ?? null }))
}
