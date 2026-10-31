import { createApp } from './app.js'
import { env } from './env.js'
import { installErrorLog, startErrorLogPurgeCron } from './lib/error-log.js'
import { loadCompanySettings } from './services/company.js'
import { startSocialPublishingCron } from './services/social/index.js'
import { startTrackingOutboxCron } from './services/tracking/outbox.js'
import { startTrackingMaintenanceCron } from './services/tracking/retention.js'

installErrorLog()
await loadCompanySettings()
const app = createApp()

app.listen(env.API_PORT, () => {
  console.info(`[api] listening on ${env.API_URL} (env: ${env.NODE_ENV})`)
})

startErrorLogPurgeCron()
startSocialPublishingCron()
startTrackingMaintenanceCron()
startTrackingOutboxCron()
