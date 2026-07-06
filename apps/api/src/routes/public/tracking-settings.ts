import { Router } from 'express'
import { prisma } from '../../lib/prisma.js'

export const trackingSettingsRouter = Router()

/**
 * Public tracking configuration for the shop frontend. Exposes only the
 * tracking IDs (public in page source by nature); the frontend loads the
 * trackers exclusively after the matching consent category was granted.
 */
trackingSettingsRouter.get('/', async (_req, res, next) => {
  try {
    const row = await prisma.shopSettings.findUnique({ where: { id: 'singleton' } })
    res.set('Cache-Control', 'public, max-age=300')
    res.json({
      metaPixelId: row?.metaPixelId ?? null,
      ga4MeasurementId: row?.ga4MeasurementId ?? null,
      gtmContainerId: row?.gtmContainerId ?? null,
    })
  } catch (err) {
    next(err)
  }
})
