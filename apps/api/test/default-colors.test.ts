import { beforeEach, describe, expect, it, vi } from 'vitest'

const tx = {
  $executeRaw: vi.fn(),
  shopSettings: { upsert: vi.fn() },
  productColorSlot: { updateMany: vi.fn() },
}
vi.mock('../src/lib/prisma.js', () => ({
  prisma: {
    shopSettings: { findUnique: vi.fn() },
    color: { count: vi.fn() },
    $transaction: vi.fn((fn: (t: typeof tx) => unknown) => fn(tx)),
  },
}))

const { prisma } = await import('../src/lib/prisma.js')
const { dropDefaultColor, loadDefaultColors, saveDefaultColors, withDefaultColors } =
  await import('../src/services/default-colors.js')

const BLACK = 'cmblack00000000000000000'
const WHITE = 'cmwhite00000000000000000'

beforeEach(() => vi.clearAllMocks())

describe('default colors', () => {
  it('loads stored defaults, ignoring junk', async () => {
    vi.mocked(prisma.shopSettings.findUnique).mockResolvedValue({
      defaultColors: { zone_1_main: BLACK },
    } as never)
    expect(await loadDefaultColors()).toEqual({ zone_1_main: BLACK })
    vi.mocked(prisma.shopSettings.findUnique).mockResolvedValue({ defaultColors: 'x' } as never)
    expect(await loadDefaultColors()).toEqual({})
    vi.mocked(prisma.shopSettings.findUnique).mockResolvedValue(null)
    expect(await loadDefaultColors()).toEqual({})
  })

  it('saves and copies each set zone onto all products', async () => {
    vi.mocked(prisma.color.count).mockResolvedValue(2)
    tx.productColorSlot.updateMany.mockResolvedValue({ count: 3 })
    const updated = await saveDefaultColors({ zone_1_main: BLACK, zone_2_accent: WHITE })
    expect(updated).toBe(6)
    expect(tx.shopSettings.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: { defaultColors: { zone_1_main: BLACK, zone_2_accent: WHITE } },
      }),
    )
    expect(tx.productColorSlot.updateMany).toHaveBeenCalledWith({
      where: { slot: 'zone_1_main' },
      data: { defaultColorId: BLACK },
    })
    expect(tx.productColorSlot.updateMany).toHaveBeenCalledTimes(2)
    expect(tx.$executeRaw).toHaveBeenCalledOnce()
  })

  it('rejects unknown colors without writing', async () => {
    vi.mocked(prisma.color.count).mockResolvedValue(0)
    await expect(saveDefaultColors({ zone_1_main: BLACK })).rejects.toThrow('Unknown color')
    expect(tx.shopSettings.upsert).not.toHaveBeenCalled()
  })

  it('drops a deleted color from the defaults, leaving others', async () => {
    const db = {
      $executeRaw: vi.fn(),
      shopSettings: {
        findUnique: vi.fn().mockResolvedValue({
          defaultColors: { zone_1_main: BLACK, zone_2_accent: WHITE, zone_3_detail: BLACK },
        }),
        update: vi.fn(),
      },
    }
    await dropDefaultColor(db as never, BLACK)
    expect(db.shopSettings.update).toHaveBeenCalledWith({
      where: { id: 'singleton' },
      data: { defaultColors: { zone_2_accent: WHITE } },
    })

    db.shopSettings.update.mockClear()
    await dropDefaultColor(db as never, 'cmother00000000000000000')
    expect(db.shopSettings.update).not.toHaveBeenCalled()
  })

  it('fills only slots without their own default', () => {
    expect(
      withDefaultColors(
        [
          { slot: 'zone_1_main' as const, label: 'Haupt' },
          { slot: 'zone_2_accent' as const, label: 'Akzent', defaultColorId: WHITE },
          { slot: 'zone_3_detail' as const, label: 'Detail', defaultColorId: null },
        ],
        { zone_1_main: BLACK, zone_2_accent: BLACK },
      ).map((s) => s.defaultColorId),
    ).toEqual([BLACK, WHITE, null])
  })
})
