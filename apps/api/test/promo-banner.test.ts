import { promoBannerSchema } from '@print-shop/validators'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../src/lib/prisma.js', () => ({
  prisma: { shopSettings: { findUnique: vi.fn() }, voucher: { findUnique: vi.fn() } },
}))

const { prisma } = await import('../src/lib/prisma.js')
const { publicPromoBanner } = await import('../src/services/promo-banner.js')

const de = { title: 'Wir haben eröffnet!', text: '10 % für die ersten 20', cta: 'Los' }
const voucher = {
  type: 'percent',
  value: 10,
  active: true,
  validFrom: null,
  validUntil: null,
  maxRedemptions: 20,
  redemptionCount: 0,
  minOrderCents: 5000,
}

describe('promoBannerSchema', () => {
  it('requires every German field, other locales optional', () => {
    expect(promoBannerSchema.safeParse({ enabled: true, code: '', content: { de } }).success).toBe(
      true,
    )
    const missing = promoBannerSchema.safeParse({
      enabled: false,
      code: null,
      content: { de: { ...de, cta: ' ' }, en: { title: 'Open' } },
    })
    expect(missing.success).toBe(false)
    expect(missing.error?.issues[0]?.path).toEqual(['content', 'de', 'cta'])
  })

  it('normalizes the code: trimmed uppercase, blank → null, rejects junk', () => {
    const parse = (code: string) =>
      promoBannerSchema.parse({ enabled: true, code, content: { de } })
    expect(parse(' open10 ').code).toBe('OPEN10')
    expect(parse('  ').code).toBeNull()
    expect(() => parse('OPEN 10')).toThrow()
  })
})

describe('publicPromoBanner', () => {
  const settings = (promoBannerEnabled: boolean) =>
    vi.mocked(prisma.shopSettings.findUnique).mockResolvedValue({
      promoBannerEnabled,
      promoBanner: { code: 'OPEN10', content: { de } },
    } as never)

  beforeEach(() => vi.mocked(prisma.voucher.findUnique).mockResolvedValue(voucher as never))

  it('is null when switched off', async () => {
    settings(false)
    expect(await publicPromoBanner()).toBeNull()
  })

  it('shows content while the voucher is redeemable, ignoring its minimum order', async () => {
    settings(true)
    expect(await publicPromoBanner()).toEqual({ code: 'OPEN10', content: { de } })
  })

  it('hides itself once the voucher is used up or missing', async () => {
    settings(true)
    vi.mocked(prisma.voucher.findUnique).mockResolvedValue({
      ...voucher,
      redemptionCount: 20,
    } as never)
    expect(await publicPromoBanner()).toBeNull()
    vi.mocked(prisma.voucher.findUnique).mockResolvedValue(null)
    expect(await publicPromoBanner()).toBeNull()
  })
})
