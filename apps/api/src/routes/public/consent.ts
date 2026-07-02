import { consentLogSchema } from '@print-shop/validators'
import { Router } from 'express'
import { prisma } from '../../lib/prisma.js'

export const consentRouter = Router()

/** GDPR consent log — stores every consent decision (banner + settings dialog). */
consentRouter.post('/', async (req, res, next) => {
  try {
    const input = consentLogSchema.parse(req.body)
    const anonymousId =
      typeof req.body?.anonymousId === 'string' ? req.body.anonymousId.slice(0, 64) : null
    await prisma.consentLog.create({
      data: {
        anonymousId,
        necessary: true,
        statistics: input.categories.statistics,
        marketing: input.categories.marketing,
        version: input.version,
        locale: input.locale,
        userAgent: req.get('user-agent')?.slice(0, 255) ?? null,
      },
    })
    res.status(201).json({ ok: true })
  } catch (err) {
    next(err)
  }
})
