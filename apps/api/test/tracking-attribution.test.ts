import { describe, expect, it } from 'vitest'
import {
  computeAttribution,
  type AttributionSession,
} from '../src/services/tracking/attribution.js'

const paidAt = new Date('2026-07-16T12:00:00Z')

function session(
  partial: Partial<AttributionSession> & { id: string; daysAgo: number; channel: string },
): AttributionSession {
  return {
    id: partial.id,
    startedAt: new Date(paidAt.getTime() - partial.daysAgo * 24 * 60 * 60_000),
    channel: partial.channel,
    utmSource: partial.utmSource ?? null,
    utmMedium: partial.utmMedium ?? null,
    utmCampaign: partial.utmCampaign ?? null,
    fbclid: partial.fbclid ?? null,
    ttclid: partial.ttclid ?? null,
    gclid: partial.gclid ?? null,
  }
}

describe('computeAttribution (last-non-direct, 30d)', () => {
  it('picks the latest non-direct touch and records first-touch', () => {
    const sessions = [
      session({
        id: 's1',
        daysAgo: 20,
        channel: 'tiktok_ads',
        utmCampaign: 'launch',
        ttclid: 'abc',
      }),
      session({
        id: 's2',
        daysAgo: 10,
        channel: 'meta_ads',
        utmCampaign: 'retarget',
        fbclid: 'def',
      }),
      session({ id: 's3', daysAgo: 0, channel: 'direct' }),
    ]
    const r = computeAttribution(sessions, sessions[2]!, paidAt)
    expect(r.lastChannel).toBe('meta_ads')
    expect(r.lastSessionId).toBe('s2')
    expect(r.lastClickIdType).toBe('fbclid')
    expect(r.firstChannel).toBe('tiktok_ads')
    expect(r.touchpointCount).toBe(3)
    expect(r.daysToConversion).toBe(10)
  })

  it('falls back to the direct checkout session when all touches are direct', () => {
    const checkout = session({ id: 'c', daysAgo: 0, channel: 'direct' })
    const r = computeAttribution([checkout], checkout, paidAt)
    expect(r.lastChannel).toBe('direct')
    expect(r.lastSessionId).toBe('c')
  })

  it('ignores touches outside the 30-day window', () => {
    const sessions = [
      session({ id: 'old', daysAgo: 40, channel: 'meta_ads' }),
      session({ id: 'now', daysAgo: 1, channel: 'direct' }),
    ]
    const r = computeAttribution(sessions, sessions[1]!, paidAt)
    // 'old' is outside the window → last non-direct falls back to the direct checkout
    expect(r.lastChannel).toBe('direct')
    expect(r.touchpointCount).toBe(1)
  })

  it('does not revive an out-of-window checkout session as the direct fallback', () => {
    const checkout = session({ id: 'old-checkout', daysAgo: 31, channel: 'direct' })
    const r = computeAttribution([checkout], checkout, paidAt)
    expect(r.lastChannel).toBe('direct')
    expect(r.lastSessionId).toBeNull()
    expect(r.lastTouchAt).toBeNull()
    expect(r.touchpointCount).toBe(0)
  })
})
