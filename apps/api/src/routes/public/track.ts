import { parseTrackBatch } from '@print-shop/validators'
import { Router, text } from 'express'
import { env } from '../../env.js'
import { badRequest, forbidden } from '../../middleware/error.js'
import { trackLimiter } from '../../middleware/rate-limit.js'
import { prisma } from '../../lib/prisma.js'
import { recordClientBatch } from '../../services/tracking/events.js'
import { sendClientConversions } from '../../services/tracking/outbox.js'

export const trackRouter = Router()
const webOrigin = new URL(env.WEB_URL).origin

trackRouter.use((req, _res, next) => {
  const origin = req.get('origin')
  const fetchSite = req.get('sec-fetch-site')
  // CORS does not prevent a browser from sending a simple text/plain POST.
  // Reject cross-site browser traffic before it can pollute analytics.
  if (fetchSite === 'cross-site' || (origin && origin !== webOrigin)) {
    next(forbidden('Cross-site tracking ingest is not allowed'))
    return
  }
  next()
})

// Rate-limit before the body parser so oversized/malformed floods are rejected
// without spending parser work on them.
trackRouter.use(trackLimiter)

// navigator.sendBeacon posts a Blob as text/plain and cannot set headers, so this
// router parses both JSON and text bodies (64kb cap; a batch is ≤20 small events).
trackRouter.use(text({ type: ['text/plain', 'application/json'], limit: '64kb' }))

/**
 * Behavioural event ingest. Successful batches answer 202; transient database
 * failures remain 5xx so the fire-and-forget client can retry them. A malformed
 * envelope is 400, but a single malformed event is dropped (not fatal) so it can
 * never discard its valid co-batched siblings. No auth: same-origin via the
 * Nitro proxy + rate limit + strict schema + browser origin checks.
 * Revenue/commerce events are impossible here (server-only event names).
 */
trackRouter.post('/events', async (req, res, next) => {
  try {
    let raw: unknown
    try {
      raw = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body
    } catch {
      throw badRequest('Invalid JSON body')
    }
    const { batch, droppedInvalid } = parseTrackBatch(raw)
    const userAgent = req.get('user-agent') ?? undefined
    // Reach measurement (stored rows) is a statistics purpose only; marketing-only
    // visitors are forwarded to the conversion APIs without first-party storage.
    const result = batch.consent.statistics
      ? await recordClientBatch(batch, { userAgent })
      : { accepted: 0, duplicates: 0, dropped: 0 }
    if (batch.consent.marketing) {
      // Fire-and-forget: response time must not depend on Meta/TikTok.
      void sendClientConversions(prisma, {
        sessionId: batch.sessionId,
        events: batch.events,
        attribution: { ...batch.attribution, ip: req.ip, userAgent },
        clickIds: batch.session?.clickIds,
      }).catch((err) => console.error('[tracking] client conversions failed:', err))
    }
    res.status(202).json({ ...result, rejected: droppedInvalid })
  } catch (err) {
    next(err)
  }
})
