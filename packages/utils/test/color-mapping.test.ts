import { describe, expect, it } from 'vitest'
import { extractZoneSlot, resolveColorSelection } from '../src/color-mapping.js'

const colors = [
  { id: 'green', active: true },
  { id: 'black', active: true },
  { id: 'gold', active: false },
]

const zones = [
  { slot: 'zone_1_main' as const, defaultColorId: 'black' },
  { slot: 'zone_2_accent' as const, defaultColorId: null },
]

describe('extractZoneSlot', () => {
  it('matches exact slot names', () => {
    expect(extractZoneSlot('zone_1_main')).toBe('zone_1_main')
    expect(extractZoneSlot('zone_4_text')).toBe('zone_4_text')
  })

  it('matches suffixed/prefixed mesh names (Blender exports)', () => {
    expect(extractZoneSlot('zone_1_main.001')).toBe('zone_1_main')
    expect(extractZoneSlot('Body_zone_2_accent')).toBe('zone_2_accent')
    expect(extractZoneSlot('ZONE_3_DETAIL')).toBe('zone_3_detail')
  })

  it('returns null for unrelated names', () => {
    expect(extractZoneSlot('Cube')).toBeNull()
    expect(extractZoneSlot('zone_5_extra')).toBeNull()
  })
})

describe('resolveColorSelection', () => {
  it('resolves a full valid selection', () => {
    const result = resolveColorSelection(
      zones,
      { zone_1_main: 'green', zone_2_accent: 'black' },
      colors,
    )
    expect(result.ok).toBe(true)
    expect(result.resolved).toEqual({ zone_1_main: 'green', zone_2_accent: 'black' })
  })

  it('falls back to the zone default color', () => {
    const result = resolveColorSelection(zones, { zone_2_accent: 'green' }, colors)
    expect(result.ok).toBe(true)
    expect(result.resolved).toEqual({ zone_1_main: 'black', zone_2_accent: 'green' })
  })

  it('fails when a zone has no selection and no default', () => {
    const result = resolveColorSelection(zones, { zone_1_main: 'green' }, colors)
    expect(result.ok).toBe(false)
    expect(result.errors).toContainEqual({ type: 'missing_color', slot: 'zone_2_accent' })
  })

  it('rejects inactive and unknown colors', () => {
    const inactive = resolveColorSelection(
      zones,
      { zone_1_main: 'gold', zone_2_accent: 'black' },
      colors,
    )
    expect(inactive.ok).toBe(false)
    expect(inactive.errors).toContainEqual({
      type: 'inactive_color',
      slot: 'zone_1_main',
      colorId: 'gold',
    })

    const unknown = resolveColorSelection(
      zones,
      { zone_1_main: 'neon', zone_2_accent: 'black' },
      colors,
    )
    expect(unknown.ok).toBe(false)
    expect(unknown.errors).toContainEqual({
      type: 'unknown_color',
      slot: 'zone_1_main',
      colorId: 'neon',
    })
  })

  it('rejects selections for slots the product does not have', () => {
    const result = resolveColorSelection(
      zones,
      { zone_1_main: 'green', zone_2_accent: 'black', zone_3_detail: 'black' },
      colors,
    )
    expect(result.ok).toBe(false)
    expect(result.errors).toContainEqual({ type: 'unknown_slot', slot: 'zone_3_detail' })
  })
})
