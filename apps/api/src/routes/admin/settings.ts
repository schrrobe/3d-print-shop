import { trackingSettingsSchema } from '@print-shop/validators'
import { Router } from 'express'
import { audit } from '../../lib/audit.js'
import { prisma } from '../../lib/prisma.js'
import { requirePermission } from '../../middleware/auth.js'

export const adminSettingsRouter = Router()

const SINGLETON_ID = 'singleton'

const toDto = (row: {
  metaPixelId: string | null
  ga4MeasurementId: string | null
  gtmContainerId: string | null
} | null) => ({
  metaPixelId: row?.metaPixelId ?? null,
  ga4MeasurementId: row?.ga4MeasurementId ?? null,
  gtmContainerId: row?.gtmContainerId ?? null,
})

adminSettingsRouter.get('/tracking', requirePermission('settings:read'), async (_req, res, next) => {
  try {
    const row = await prisma.shopSettings.findUnique({ where: { id: SINGLETON_ID } })
    res.json({ settings: toDto(row) })
  } catch (err) {
    next(err)
  }
})

adminSettingsRouter.put('/tracking', requirePermission('settings:write'), async (req, res, next) => {
  try {
    const input = trackingSettingsSchema.parse(req.body)
    const row = await prisma.shopSettings.upsert({
      where: { id: SINGLETON_ID },
      create: { id: SINGLETON_ID, ...input },
      update: input,
    })
    // Audit which fields were set/cleared, not the raw IDs (don't log them unnecessarily)
    await audit(
      req,
      'settings.tracking.update',
      { type: 'settings', id: SINGLETON_ID },
      {
        metaPixelId: input.metaPixelId ? 'set' : 'cleared',
        ga4MeasurementId: input.ga4MeasurementId ? 'set' : 'cleared',
        gtmContainerId: input.gtmContainerId ? 'set' : 'cleared',
      },
    )
    res.json({ settings: toDto(row) })
  } catch (err) {
    next(err)
  }
})
