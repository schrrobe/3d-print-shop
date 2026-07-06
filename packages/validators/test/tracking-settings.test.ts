import { describe, expect, it } from 'vitest'
import { trackingSettingsSchema } from '../src/index.js'

describe('trackingSettingsSchema', () => {
  it('accepts valid IDs', () => {
    const result = trackingSettingsSchema.safeParse({
      metaPixelId: '123456789012345',
      ga4MeasurementId: 'G-ABC1234567',
      gtmContainerId: 'GTM-AB12CD3',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).toEqual({
        metaPixelId: '123456789012345',
        ga4MeasurementId: 'G-ABC1234567',
        gtmContainerId: 'GTM-AB12CD3',
      })
    }
  })

  it('trims whitespace before validating', () => {
    const result = trackingSettingsSchema.safeParse({
      metaPixelId: ' 123456789012345 ',
      ga4MeasurementId: '  G-ABC1234567',
      gtmContainerId: 'GTM-AB12CD3  ',
    })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.metaPixelId).toBe('123456789012345')
  })

  it('empty string and null both clear a value to null', () => {
    const result = trackingSettingsSchema.safeParse({
      metaPixelId: '',
      ga4MeasurementId: '   ',
      gtmContainerId: null,
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).toEqual({
        metaPixelId: null,
        ga4MeasurementId: null,
        gtmContainerId: null,
      })
    }
  })

  it('rejects malformed GA4 IDs', () => {
    for (const bad of ['g-abc1234567', 'G-abc', 'UA-12345678-1', 'G-', 'GA4-ABC1234567']) {
      expect(
        trackingSettingsSchema.safeParse({
          metaPixelId: null,
          ga4MeasurementId: bad,
          gtmContainerId: null,
        }).success,
      ).toBe(false)
    }
  })

  it('rejects malformed GTM container IDs', () => {
    for (const bad of ['GTM123456', 'gtm-abc123', 'GTM-', 'GTM-ab12cd3', 'GTM-ABCDEFGHIJKLMNOP']) {
      expect(
        trackingSettingsSchema.safeParse({
          metaPixelId: null,
          ga4MeasurementId: null,
          gtmContainerId: bad,
        }).success,
      ).toBe(false)
    }
  })

  it('rejects non-numeric or absurd Meta Pixel IDs', () => {
    for (const bad of ['abc', '1234', '123456789012345678901', '12345abc', '<script>']) {
      expect(
        trackingSettingsSchema.safeParse({
          metaPixelId: bad,
          ga4MeasurementId: null,
          gtmContainerId: null,
        }).success,
      ).toBe(false)
    }
  })

  it('rejects non-string values', () => {
    expect(
      trackingSettingsSchema.safeParse({
        metaPixelId: 123456789012345,
        ga4MeasurementId: null,
        gtmContainerId: null,
      }).success,
    ).toBe(false)
  })
})
