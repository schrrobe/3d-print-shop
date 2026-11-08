import { deliveryNoticeSchema } from '@print-shop/validators'
import { describe, expect, it, vi } from 'vitest'

vi.mock('../src/lib/prisma.js', () => ({ prisma: { shopSettings: { findUnique: vi.fn() } } }))

const { prisma } = await import('../src/lib/prisma.js')
const { publicDeliveryNotice } = await import('../src/routes/public/delivery-notice.js')

describe('deliveryNoticeSchema', () => {
  it('needs a boolean', () => {
    expect(deliveryNoticeSchema.safeParse({ enabled: true }).success).toBe(true)
    expect(deliveryNoticeSchema.safeParse({ enabled: 'yes' }).success).toBe(false)
  })
})

describe('publicDeliveryNotice', () => {
  it('is off without a settings row', async () => {
    vi.mocked(prisma.shopSettings.findUnique).mockResolvedValue(null)
    expect(await publicDeliveryNotice()).toBe(false)
  })

  it('follows the admin switch', async () => {
    vi.mocked(prisma.shopSettings.findUnique).mockResolvedValue({
      deliveryDelayNotice: true,
    } as never)
    expect(await publicDeliveryNotice()).toBe(true)
  })
})
