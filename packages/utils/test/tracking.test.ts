import { describe, expect, it } from 'vitest'
import { acceptAllConsent, createConsent, rejectAllConsent } from '../src/consent.js'
import {
  allowedProviders,
  configuredProviders,
  isSensitiveTrackingPath,
  type TrackingSettings,
} from '../src/tracking.js'

const settings = (overrides: Partial<TrackingSettings> = {}): TrackingSettings => ({
  metaPixelId: null,
  ga4MeasurementId: null,
  gtmContainerId: null,
  ...overrides,
})

const names = (providers: { name: string }[]) => providers.map((p) => p.name)

describe('tracking provider mapping', () => {
  it('nothing configured → nothing to load, regardless of consent', () => {
    expect(configuredProviders(settings())).toEqual([])
    expect(allowedProviders(settings(), acceptAllConsent())).toEqual([])
  })

  it('only providers with an ID count as configured', () => {
    const s = settings({ ga4MeasurementId: 'G-TEST123456', metaPixelId: '123456789012345' })
    expect(names(configuredProviders(s))).toEqual(['google-analytics', 'meta-pixel'])
  })

  it('no consent → no providers, even when fully configured', () => {
    const s = settings({
      ga4MeasurementId: 'G-TEST123456',
      gtmContainerId: 'GTM-TEST123',
      metaPixelId: '123456789012345',
    })
    expect(allowedProviders(s, null)).toEqual([])
    expect(allowedProviders(s, rejectAllConsent())).toEqual([])
  })

  it('statistics only → GA4 loads, GTM (needs both) and Meta Pixel do not', () => {
    const s = settings({
      ga4MeasurementId: 'G-TEST123456',
      gtmContainerId: 'GTM-TEST123',
      metaPixelId: '123456789012345',
    })
    const statsOnly = createConsent({ statistics: true, marketing: false })
    expect(names(allowedProviders(s, statsOnly))).toEqual(['google-analytics'])
  })

  it('marketing only → Meta Pixel loads, GA4 and GTM do not', () => {
    const s = settings({
      ga4MeasurementId: 'G-TEST123456',
      gtmContainerId: 'GTM-TEST123',
      metaPixelId: '123456789012345',
    })
    const marketingOnly = createConsent({ statistics: false, marketing: true })
    expect(names(allowedProviders(s, marketingOnly))).toEqual(['meta-pixel'])
  })

  it('full consent → all configured providers', () => {
    const s = settings({
      ga4MeasurementId: 'G-TEST123456',
      gtmContainerId: 'GTM-TEST123',
      metaPixelId: '123456789012345',
    })
    expect(names(allowedProviders(s, acceptAllConsent()))).toEqual([
      'google-analytics',
      'google-tag-manager',
      'meta-pixel',
    ])
  })

  it('full consent but only GTM configured → only GTM', () => {
    const s = settings({ gtmContainerId: 'GTM-TEST123' })
    expect(names(allowedProviders(s, acceptAllConsent()))).toEqual(['google-tag-manager'])
  })
})

describe('sensitive tracking paths', () => {
  it.each([
    '/checkout/success?token=secret',
    '/order/PS-2026-1?token=secret',
    '/en/portal/magic-secret',
    '/de/quote/quote-secret',
    '/support/ticket/ticket-secret',
    '/complaint/REK-1?token=secret',
    '/fr/admin/orders',
  ])('blocks %s', (path) => {
    expect(isSensitiveTrackingPath(path)).toBe(true)
  })

  it.each(['/', '/products/item', '/en/cart', '/products/item?config=public-share'])(
    'allows %s',
    (path) => {
      expect(isSensitiveTrackingPath(path)).toBe(false)
    },
  )
})
