import type { Prisma } from '@prisma/client'
import { Router } from 'express'
import { prisma } from '../../lib/prisma.js'

export type InfoBannerText = Partial<Record<string, string>>

/** Stored JSON (written only through infoBannerSchema) → text per locale. */
export const infoBannerText = (json: Prisma.JsonValue | null | undefined): InfoBannerText =>
  json && typeof json === 'object' && !Array.isArray(json) ? (json as InfoBannerText) : {}

/** Text for the shop, null when switched off. */
export async function publicInfoBanner(): Promise<InfoBannerText | null> {
  const row = await prisma.shopSettings.findUnique({
    where: { id: 'singleton' },
    select: { infoBannerEnabled: true, infoBanner: true },
  })
  return row?.infoBannerEnabled ? infoBannerText(row.infoBanner) : null
}

export const infoBannerRouter = Router()

/** Notice strip above the shop header (all locales; the shop picks its own with German fallback). */
infoBannerRouter.get('/', async (_req, res, next) => {
  try {
    res.set('Cache-Control', 'public, max-age=60')
    res.json({ text: await publicInfoBanner() })
  } catch (err) {
    next(err)
  }
})
