import { describe, expect, it } from 'vitest'
import {
  acceptAllConsent,
  canLoadGa4,
  canLoadMetaPixel,
  canLoadTracker,
  CONSENT_VERSION,
  createConsent,
  parseStoredConsent,
  rejectAllConsent,
} from '../src/consent.js'

describe('consent logic (GDPR opt-in)', () => {
  it('never loads trackers without stored consent', () => {
    expect(canLoadTracker('statistics', null)).toBe(false)
    expect(canLoadTracker('marketing', null)).toBe(false)
    expect(canLoadGa4(null)).toBe(false)
    expect(canLoadMetaPixel(null)).toBe(false)
  })

  it('necessary is always allowed', () => {
    expect(canLoadTracker('necessary', null)).toBe(true)
    expect(canLoadTracker('necessary', rejectAllConsent())).toBe(true)
  })

  it('GA4 requires statistics opt-in, Meta Pixel requires marketing opt-in', () => {
    const statsOnly = createConsent({ statistics: true, marketing: false })
    expect(canLoadGa4(statsOnly)).toBe(true)
    expect(canLoadMetaPixel(statsOnly)).toBe(false)

    const marketingOnly = createConsent({ statistics: false, marketing: true })
    expect(canLoadGa4(marketingOnly)).toBe(false)
    expect(canLoadMetaPixel(marketingOnly)).toBe(true)
  })

  it('accept all / reject all', () => {
    const all = acceptAllConsent()
    expect(all.statistics).toBe(true)
    expect(all.marketing).toBe(true)
    expect(all.necessary).toBe(true)

    const none = rejectAllConsent()
    expect(none.statistics).toBe(false)
    expect(none.marketing).toBe(false)
    expect(none.necessary).toBe(true)
  })

  it('invalidates consent from an older version', () => {
    const stale = { ...acceptAllConsent(), version: '0.9' }
    expect(canLoadTracker('statistics', stale)).toBe(false)
  })

  it('parses stored consent defensively', () => {
    const valid = JSON.stringify(acceptAllConsent())
    expect(parseStoredConsent(valid)?.statistics).toBe(true)
    expect(parseStoredConsent(null)).toBeNull()
    expect(parseStoredConsent('not json')).toBeNull()
    expect(parseStoredConsent('{"statistics":"yes"}')).toBeNull()
    expect(parseStoredConsent(JSON.stringify({ statistics: true }))).toBeNull()
  })

  it('stamps version and timestamp', () => {
    const now = new Date('2026-07-02T12:00:00Z')
    const consent = createConsent({ statistics: true, marketing: false }, now)
    expect(consent.version).toBe(CONSENT_VERSION)
    expect(consent.updatedAt).toBe('2026-07-02T12:00:00.000Z')
  })
})
