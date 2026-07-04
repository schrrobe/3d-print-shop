import { createApp } from './app.js'
import { env } from './env.js'
import { startSocialPublishingCron } from './services/social/index.js'

const app = createApp()

app.listen(env.API_PORT, () => {
  console.info(`[api] listening on ${env.API_URL} (env: ${env.NODE_ENV})`)
})

startSocialPublishingCron()
