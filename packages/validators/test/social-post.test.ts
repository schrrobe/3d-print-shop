import { describe, expect, it } from 'vitest'
import {
  SOCIAL_CAPTION_MAX_LENGTH,
  socialPostCreateSchema,
  socialPostPlatformsSchema,
  socialPostScheduleSchema,
  socialPostUpdateSchema,
  validateSocialPostReadyToSchedule,
} from '../src/index.js'

describe('social post validators', () => {
  const base = {
    platforms: ['instagram'],
    caption: 'Neue Spiralvase im Shop!',
    mediaUrls: ['/images/products/spiral-vase.svg'],
  }

  it('accepts a minimal draft', () => {
    const parsed = socialPostCreateSchema.parse(base)
    expect(parsed.schedule).toBe(false)
    expect(parsed.mediaUrls).toHaveLength(1)
  })

  it('accepts both platforms and a scheduled time', () => {
    const parsed = socialPostCreateSchema.parse({
      ...base,
      platforms: ['instagram', 'facebook'],
      scheduledAt: '2026-07-15T10:00:00.000Z',
      schedule: true,
    })
    expect(parsed.platforms).toEqual(['instagram', 'facebook'])
    expect(parsed.schedule).toBe(true)
  })

  it('rejects an empty platform selection', () => {
    expect(socialPostPlatformsSchema.safeParse([]).success).toBe(false)
  })

  it('rejects duplicate platforms', () => {
    expect(socialPostPlatformsSchema.safeParse(['instagram', 'instagram']).success).toBe(false)
  })

  it('rejects unknown platforms', () => {
    expect(socialPostPlatformsSchema.safeParse(['tiktok']).success).toBe(false)
  })

  it('rejects an empty caption', () => {
    expect(socialPostCreateSchema.safeParse({ ...base, caption: '   ' }).success).toBe(false)
  })

  it('rejects captions above the Instagram limit', () => {
    const caption = 'a'.repeat(SOCIAL_CAPTION_MAX_LENGTH + 1)
    expect(socialPostCreateSchema.safeParse({ ...base, caption }).success).toBe(false)
  })

  it('rejects malformed media urls', () => {
    expect(
      socialPostCreateSchema.safeParse({ ...base, mediaUrls: ['not-a-url'] }).success,
    ).toBe(false)
    expect(
      socialPostCreateSchema.safeParse({ ...base, mediaUrls: ['https://cdn.example.com/a.jpg'] })
        .success,
    ).toBe(true)
  })

  it('rejects invalid scheduledAt timestamps', () => {
    expect(
      socialPostScheduleSchema.safeParse({ scheduledAt: '15.07.2026 10:00' }).success,
    ).toBe(false)
    expect(
      socialPostScheduleSchema.safeParse({ scheduledAt: '2026-07-15T10:00:00.000Z' }).success,
    ).toBe(true)
  })

  it('update schema allows partial payloads but no empty caption', () => {
    expect(socialPostUpdateSchema.safeParse({}).success).toBe(true)
    expect(socialPostUpdateSchema.safeParse({ caption: '' }).success).toBe(false)
    expect(socialPostUpdateSchema.safeParse({ scheduledAt: null }).success).toBe(true)
  })

  it('instagram requires media to be scheduled, facebook may be text-only', () => {
    expect(
      validateSocialPostReadyToSchedule({ platform: 'instagram', mediaUrls: [] }).ok,
    ).toBe(false)
    expect(
      validateSocialPostReadyToSchedule({ platform: 'instagram', mediaUrls: ['/a.jpg'] }).ok,
    ).toBe(true)
    expect(validateSocialPostReadyToSchedule({ platform: 'facebook', mediaUrls: [] }).ok).toBe(true)
  })
})
