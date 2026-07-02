import { COLOR_ZONE_SLOTS, type ColorSelection, type ColorZoneSlot } from '@print-shop/types'

export function isColorZoneSlot(value: string): value is ColorZoneSlot {
  return (COLOR_ZONE_SLOTS as readonly string[]).includes(value)
}

/**
 * Maps a GLB mesh or material name to a color zone slot.
 * Matches exact names ("zone_1_main") and prefixed/suffixed variants
 * ("zone_1_main.001", "Body_zone_2_accent").
 */
export function extractZoneSlot(meshOrMaterialName: string): ColorZoneSlot | null {
  const name = meshOrMaterialName.toLowerCase()
  for (const slot of COLOR_ZONE_SLOTS) {
    if (name === slot || name.includes(slot)) return slot
  }
  return null
}

export interface ZoneDefinition {
  slot: ColorZoneSlot
  defaultColorId: string | null
}

export interface SelectableColor {
  id: string
  active: boolean
}

export type ColorSelectionError =
  | { type: 'unknown_slot'; slot: string }
  | { type: 'unknown_color'; slot: ColorZoneSlot; colorId: string }
  | { type: 'inactive_color'; slot: ColorZoneSlot; colorId: string }
  | { type: 'missing_color'; slot: ColorZoneSlot }

export interface ResolvedColorSelection {
  ok: boolean
  resolved: Record<ColorZoneSlot, string> | null
  errors: ColorSelectionError[]
}

/**
 * Validates a customer color selection against a product's zone definitions
 * and the global color list. Missing selections fall back to the zone default.
 */
export function resolveColorSelection(
  zones: ZoneDefinition[],
  selection: ColorSelection,
  colors: SelectableColor[],
): ResolvedColorSelection {
  const errors: ColorSelectionError[] = []
  const colorById = new Map(colors.map((c) => [c.id, c]))
  const zoneSlots = new Set(zones.map((z) => z.slot))
  const resolved = {} as Record<ColorZoneSlot, string>

  for (const slot of Object.keys(selection)) {
    if (!isColorZoneSlot(slot) || !zoneSlots.has(slot)) {
      errors.push({ type: 'unknown_slot', slot })
    }
  }

  for (const zone of zones) {
    const chosen = selection[zone.slot] ?? zone.defaultColorId
    if (!chosen) {
      errors.push({ type: 'missing_color', slot: zone.slot })
      continue
    }
    const color = colorById.get(chosen)
    if (!color) {
      errors.push({ type: 'unknown_color', slot: zone.slot, colorId: chosen })
      continue
    }
    if (!color.active) {
      errors.push({ type: 'inactive_color', slot: zone.slot, colorId: chosen })
      continue
    }
    resolved[zone.slot] = chosen
  }

  return errors.length > 0 ? { ok: false, resolved: null, errors } : { ok: true, resolved, errors }
}
