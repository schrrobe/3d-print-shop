import { env } from '../../env.js'
import { MetaPublishingService } from './meta.js'
import { MockSocialMediaPublisher } from './mock.js'
import type { SocialMediaPublisher } from './publisher.js'

export * from './publisher.js'
export { MOCK_FAILURE_MARKER, MockSocialMediaPublisher } from './mock.js'
export { FacebookPagePublisher, InstagramPublisher, mapMetaError, MetaPublishingService } from './meta.js'
export * from './scheduler.js'

export function createSocialMediaPublisher(): SocialMediaPublisher {
  switch (env.SOCIAL_PUBLISHING_PROVIDER) {
    case 'mock':
      return new MockSocialMediaPublisher()
    case 'meta':
      return new MetaPublishingService()
  }
}

export const socialMediaPublisher = createSocialMediaPublisher()
