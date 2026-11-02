import { infoBannerSchema } from '@print-shop/validators'
import { describe, expect, it, vi } from 'vitest'

vi.mock('../src/lib/prisma.js', () => ({ prisma: { shopSettings: { findUnique: vi.fn() } } }))

const { prisma } = await import('../src/lib/prisma.js')
const { publicInfoBanner } = await import('../src/routes/public/info-banner.js')

describe('infoBannerSchema', () => {
  it('needs German text only while switched on', () => {
    expect(infoBannerSchema.safeParse({ enabled: false, text: {} }).success).toBe(true)
    const off = infoBannerSchema.safeParse({ enabled: true, text: { de: ' ', en: 'Hi' } })
    expect(off.success).toBe(false)
    expect(off.error?.issues[0]?.path).toEqual(['text', 'de'])
    expect(infoBannerSchema.parse({ enabled: true, text: { de: ' Hallo ' } }).text.de).toBe('Hallo')
  })
})

describe('publicInfoBanner', () => {
  const settings = (infoBannerEnabled: boolean) =>
    vi.mocked(prisma.shopSettings.findUnique).mockResolvedValue({
      infoBannerEnabled,
      infoBanner: { de: 'Versand ab 14. November' },
    } as never)

  it('is null when switched off', async () => {
    settings(false)
    expect(await publicInfoBanner()).toBeNull()
  })

  it('returns the text when switched on', async () => {
    settings(true)
    expect(await publicInfoBanner()).toEqual({ de: 'Versand ab 14. November' })
  })
})
