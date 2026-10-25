import { Router } from 'express'
import { env } from '../../env.js'
import { prisma } from '../../lib/prisma.js'
import { trackLimiter } from '../../middleware/rate-limit.js'
import { REF_COOKIE, REF_WINDOW_S, isBot, refCode } from '../../services/sales-channels.js'

/** `/r/<code>` on the web is redirected here (nuxt routeRules). */
export const salesChannelRedirectRouter = Router()

// Each hit writes a click row — bound it per IP like the tracking ingest.
salesChannelRedirectRouter.get('/:code', trackLimiter, async (req, res, next) => {
  try {
    const site = env.WEB_URL.replace(/\/$/, '')
    const code = String(req.params.code).toLowerCase()
    const channel = await prisma.salesChannel.findUnique({
      where: { code },
      include: { product: { select: { slug: true, active: true } } },
    })
    if (!channel) {
      res.redirect(302, `${site}/`)
      return
    }
    // Inactive product would 404 — land on the home page instead.
    const target = channel.product?.active ? `${site}/products/${channel.product.slug}` : `${site}/`
    // Inactive channel: the link still works but neither counts nor attributes.
    if (channel.active) {
      // A returning visitor (cookie already set for this code) is not a new click.
      const returning =
        refCode((req.cookies as Record<string, string> | undefined)?.[REF_COOKIE], new Date()) ===
        channel.code
      if (!returning && !isBot(req.get('user-agent'))) {
        await prisma.salesChannelClick.create({ data: { salesChannelId: channel.id } })
      }
      res.cookie(REF_COOKIE, `${channel.code}.${Math.floor(Date.now() / 1000)}`, {
        httpOnly: true,
        // lax: the cookie must survive the cross-site click from Instagram & co.
        sameSite: 'lax',
        secure: env.COOKIE_SECURE,
        maxAge: REF_WINDOW_S * 1000,
        path: '/',
      })
    }
    res.redirect(302, target)
  } catch (err) {
    next(err)
  }
})
