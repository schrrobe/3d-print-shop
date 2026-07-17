import { createApp } from './app.js'
import { env } from './env.js'
import { startSocialPublishingCron } from './services/social/index.js'
import { startTrackingOutboxCron } from './services/tracking/outbox.js'
import { startTrackingMaintenanceCron } from './services/tracking/retention.js'

const app = createApp()

app.listen(env.API_PORT, () => {
  console.info(`[api] listening on ${env.API_URL} (env: ${env.NODE_ENV})`)
})

startSocialPublishingCron()
startTrackingMaintenanceCron()
startTrackingOutboxCron()
