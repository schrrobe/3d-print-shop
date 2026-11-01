import { Router } from 'express'
import { publicPromoBanner } from '../../services/promo-banner.js'

export const promoBannerRouter = Router()

/** Shop promo modal content (all locales; the shop picks its own with German fallback). */
promoBannerRouter.get('/', async (_req, res, next) => {
  try {
    res.set('Cache-Control', 'public, max-age=60')
    res.json({ banner: await publicPromoBanner() })
  } catch (err) {
    next(err)
  }
})
