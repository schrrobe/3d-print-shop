import { describe, expect, it } from 'vitest'
import { classifyChannel, referrerHost } from '../src/tracking-channel.js'

describe('classifyChannel', () => {
  it('click ids win over everything (paid intent)', () => {
    expect(classifyChannel({ ttclid: 'x', utmSource: 'google', utmMedium: 'organic' })).toBe(
      'tiktok_ads',
    )
    expect(classifyChannel({ fbclid: 'x' })).toBe('meta_ads')
    expect(classifyChannel({ gclid: 'x' })).toBe('google_ads')
  })

  it('paid utm mediums map to the ad channel', () => {
    expect(classifyChannel({ utmSource: 'tiktok', utmMedium: 'cpc' })).toBe('tiktok_ads')
    expect(classifyChannel({ utmSource: 'facebook', utmMedium: 'paidsocial' })).toBe('meta_ads')
    expect(classifyChannel({ utmSource: 'google', utmMedium: 'cpc' })).toBe('google_ads')
  })

  it('non-paid google utm is organic', () => {
    expect(classifyChannel({ utmSource: 'google', utmMedium: 'organic' })).toBe('organic')
  })

  it('email utm/medium maps to email', () => {
    expect(classifyChannel({ utmSource: 'newsletter', utmMedium: 'email' })).toBe('email')
  })

  it('bare referrers: search engine → organic, else referral', () => {
    expect(classifyChannel({ referrerHost: 'www.google.com' })).toBe('organic')
    expect(classifyChannel({ referrerHost: 'www.bing.de' })).toBe('organic')
    expect(classifyChannel({ referrerHost: 'some-blog.example' })).toBe('referral')
  })

  it('no signal at all is direct', () => {
    expect(classifyChannel({})).toBe('direct')
    expect(classifyChannel({ utmSource: null, referrerHost: '' })).toBe('direct')
  })
})

describe('referrerHost', () => {
  it('extracts host, empty on garbage', () => {
    expect(referrerHost('https://www.google.com/search?q=x')).toBe('www.google.com')
    expect(referrerHost('not a url')).toBe('')
    expect(referrerHost(null)).toBe('')
  })
})
