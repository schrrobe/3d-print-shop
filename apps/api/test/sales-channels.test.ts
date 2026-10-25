import { describe, expect, it, vi } from 'vitest'
import {
  REF_WINDOW_S,
  attributeSalesChannel,
  commissionFor,
  isBot,
  refCode,
} from '../src/services/sales-channels.js'

describe('commissionFor', () => {
  it('takes a percentage (basis points) of the base, rounded half-up', () => {
    expect(commissionFor({ commissionType: 'percent', commissionValue: 1000 }, 2990)).toBe(299)
    expect(commissionFor({ commissionType: 'percent', commissionValue: 750 }, 1490)).toBe(112) // 111.75
    expect(commissionFor({ commissionType: 'percent', commissionValue: 1000 }, 5)).toBe(1) // 0.5
  })

  it('pays a fixed amount per order, but never more than the base', () => {
    expect(commissionFor({ commissionType: 'fixed', commissionValue: 500 }, 2990)).toBe(500)
    expect(commissionFor({ commissionType: 'fixed', commissionValue: 500 }, 300)).toBe(300)
  })

  it('is zero on a zero base', () => {
    expect(commissionFor({ commissionType: 'percent', commissionValue: 10_000 }, 0)).toBe(0)
    expect(commissionFor({ commissionType: 'fixed', commissionValue: 500 }, 0)).toBe(0)
  })
})

describe('refCode', () => {
  const now = new Date('2026-10-25T12:00:00Z')
  const ts = (secondsAgo: number) => Math.floor(now.getTime() / 1000) - secondsAgo

  it('returns the code of a fresh cookie', () => {
    expect(refCode(`anna-insta.${ts(60)}`, now)).toBe('anna-insta')
  })

  it('accepts the window edge and rejects anything older', () => {
    expect(refCode(`anna.${ts(REF_WINDOW_S)}`, now)).toBe('anna')
    expect(refCode(`anna.${ts(REF_WINDOW_S + 1)}`, now)).toBeNull()
  })

  it('rejects cookies from the future beyond clock-skew tolerance', () => {
    expect(refCode(`anna.${ts(-60)}`, now)).toBe('anna')
    expect(refCode(`anna.${ts(-3600)}`, now)).toBeNull()
  })

  it('rejects missing or malformed values', () => {
    expect(refCode(undefined, now)).toBeNull()
    expect(refCode('', now)).toBeNull()
    expect(refCode('anna', now)).toBeNull()
    expect(refCode(`ANNA.${ts(1)}`, now)).toBeNull()
    expect(refCode(`a.${ts(1)}`, now)).toBeNull()
    expect(refCode(`anna.${ts(1)}; drop`, now)).toBeNull()
  })
})

describe('isBot', () => {
  it('ignores crawlers, link previews and missing user agents', () => {
    expect(isBot(undefined)).toBe(true)
    expect(isBot('facebookexternalhit/1.1')).toBe(true)
    expect(isBot('WhatsApp/2.23')).toBe(true)
    expect(isBot('Googlebot/2.1')).toBe(true)
    expect(isBot('curl/8.4.0')).toBe(true)
  })

  it('counts regular browsers', () => {
    expect(
      isBot(
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
      ),
    ).toBe(false)
  })
})

describe('attributeSalesChannel', () => {
  const now = new Date('2026-10-25T12:00:00Z')
  const cookie = `anna.${Math.floor(now.getTime() / 1000) - 60}`

  function db(byVoucher: unknown, byCode: unknown) {
    const findFirst = vi.fn(async ({ where }: { where: { voucherId?: string; code?: string } }) =>
      where.voucherId ? byVoucher : byCode,
    )
    return { db: { salesChannel: { findFirst } } as never, findFirst }
  }

  it('prefers the channel of the redeemed voucher over the cookie', async () => {
    const { db: client, findFirst } = db({ id: 'via-voucher' }, { id: 'via-cookie' })
    await expect(attributeSalesChannel(client, 'v1', cookie, now)).resolves.toEqual({
      id: 'via-voucher',
    })
    expect(findFirst).toHaveBeenCalledTimes(1)
    expect(findFirst).toHaveBeenCalledWith({ where: { voucherId: 'v1', active: true } })
  })

  it('falls back to the cookie when the voucher belongs to no channel', async () => {
    const { db: client, findFirst } = db(null, { id: 'via-cookie' })
    await expect(attributeSalesChannel(client, 'v1', cookie, now)).resolves.toEqual({
      id: 'via-cookie',
    })
    expect(findFirst).toHaveBeenLastCalledWith({ where: { code: 'anna', active: true } })
  })

  it('attributes nothing without voucher and valid cookie', async () => {
    const { db: client, findFirst } = db(null, { id: 'x' })
    await expect(attributeSalesChannel(client, null, undefined, now)).resolves.toBeNull()
    await expect(attributeSalesChannel(client, null, 'garbage', now)).resolves.toBeNull()
    expect(findFirst).not.toHaveBeenCalled()
  })
})
