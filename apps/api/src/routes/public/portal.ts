import { renderMagicLink } from '@print-shop/emails'
import { portalLinkRequestSchema } from '@print-shop/validators'
import { Router } from 'express'
import { env } from '../../env.js'
import { prisma } from '../../lib/prisma.js'
import { randomToken } from '../../lib/tokens.js'
import { notFound } from '../../middleware/error.js'
import {
  PORTAL_TOKEN_MAX_ACTIVE,
  PORTAL_TOKEN_TTL_DAYS,
  hashPortalToken,
  portalAccessLog,
  requirePortalToken,
} from '../../middleware/portal-auth.js'
import { authLimiter, sensitiveLimiter } from '../../middleware/rate-limit.js'
import { sendEmail } from '../../services/email.js'
import { generateInvoicePdf } from '../../services/invoice.js'
import { orderUrl } from '../../services/order-flow.js'
import { productionSummary, publicOrderDto } from '../../services/order-dto.js'

export const portalRouter = Router()

/**
 * Magic-link request. Anti-enumeration: ALWAYS answers 202 — the email is only
 * sent when at least one order exists for that address (and, if an order number
 * was given, it belongs to it). Rate-limited like login (credential-class).
 */
portalRouter.post('/request-link', authLimiter, async (req, res, next) => {
  try {
    const input = portalLinkRequestSchema.parse(req.body)
    const orderCount = await prisma.order.count({
      where: {
        email: { equals: input.email, mode: 'insensitive' },
        ...(input.orderNumber ? { orderNumber: input.orderNumber } : {}),
      },
    })

    if (orderCount > 0) {
      const token = randomToken(32)
      const row = await prisma.magicLinkToken.create({
        data: {
          email: input.email,
          tokenHash: hashPortalToken(token),
          expiresAt: new Date(Date.now() + PORTAL_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000),
          requestIp: req.ip ?? null,
        },
      })
      // Cap active tokens per email: revoke everything but the newest N.
      const active = await prisma.magicLinkToken.findMany({
        where: { email: input.email, revokedAt: null, expiresAt: { gt: new Date() } },
        orderBy: { createdAt: 'desc' },
        skip: PORTAL_TOKEN_MAX_ACTIVE,
        select: { id: true },
      })
      if (active.length > 0) {
        await prisma.magicLinkToken.updateMany({
          where: { id: { in: active.map((t) => t.id) } },
          data: { revokedAt: new Date() },
        })
      }
      await sendEmail(
        input.email,
        'magic_link',
        renderMagicLink(
          { portalUrl: `${env.WEB_URL}/portal/${token}`, expiresDays: PORTAL_TOKEN_TTL_DAYS },
          input.locale,
        ),
      )
      await prisma.portalAccessLog
        .create({ data: { tokenId: row.id, action: 'portal.link_issued', ip: req.ip ?? null } })
        .catch(() => {})
    }

    res.status(202).json({ ok: true })
  } catch (err) {
    next(err)
  }
})

// Everything below requires a valid magic-link token (Bearer header).
portalRouter.use(sensitiveLimiter, requirePortalToken)

portalRouter.get('/me', (req, res) => {
  res.json({ email: req.portalEmail })
})

/**
 * All orders of the token's email. Includes per-order deep links (existing
 * token pages) so payment reopen, complaints and reviews reuse those flows.
 */
portalRouter.get('/orders', async (req, res, next) => {
  try {
    const orders = await prisma.order.findMany({
      where: { email: { equals: req.portalEmail!, mode: 'insensitive' } },
      include: {
        items: true,
        payments: { include: { bitcoinPayment: true } },
        invoice: { select: { number: true, issuedAt: true } },
        printerJobs: { select: { status: true } },
        complaints: { select: { complaintNumber: true, status: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    })
    void portalAccessLog(req, 'portal.view_orders')
    res.json({
      orders: orders.map((order) => ({
        ...publicOrderDto(order),
        orderUrl: orderUrl(order),
        accessToken: order.accessToken,
        production: productionSummary(order.printerJobs),
        complaints: order.complaints,
        invoiceAvailable: order.invoice != null,
      })),
    })
  } catch (err) {
    next(err)
  }
})

async function orderForPortal(req: { portalEmail?: string }, orderNumber: string) {
  const order = await prisma.order.findUnique({
    where: { orderNumber },
    include: {
      items: true,
      payments: { include: { bitcoinPayment: true } },
      invoice: true,
      printerJobs: { select: { status: true } },
    },
  })
  if (!order || order.email.toLowerCase() !== req.portalEmail!.toLowerCase()) {
    throw notFound('Order not found')
  }
  return order
}

portalRouter.get('/orders/:orderNumber', async (req, res, next) => {
  try {
    const order = await orderForPortal(req, String(req.params.orderNumber))
    res.json({
      order: {
        ...publicOrderDto({
          ...order,
          invoice: order.invoice
            ? { number: order.invoice.number, issuedAt: order.invoice.issuedAt }
            : null,
        }),
        orderUrl: orderUrl(order),
        accessToken: order.accessToken,
        production: productionSummary(order.printerJobs),
      },
    })
  } catch (err) {
    next(err)
  }
})

/** Invoice download in the portal — same regenerate-if-missing as the admin route. */
portalRouter.get('/orders/:orderNumber/invoice.pdf', async (req, res, next) => {
  try {
    const order = await orderForPortal(req, String(req.params.orderNumber))
    if (!order.invoice) throw notFound('No invoice for this order yet')
    const pdfPath = order.invoice.pdfPath ?? (await generateInvoicePdf(order.invoice, order))
    void portalAccessLog(req, 'portal.invoice_download', order.id)
    res.download(pdfPath, `${order.invoice.number}.pdf`)
  } catch (err) {
    next(err)
  }
})

/** Upload quotes of this email (links to the existing token-gated quote pages). */
portalRouter.get('/quotes', async (req, res, next) => {
  try {
    const requests = await prisma.quoteRequest.findMany({
      where: { email: { equals: req.portalEmail!, mode: 'insensitive' } },
      include: {
        quotes: {
          where: { status: { not: 'draft' } },
          orderBy: { sentAt: 'desc' },
          select: { status: true, priceCents: true, token: true, validUntil: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })
    res.json({
      quoteRequests: requests.map((r) => ({
        id: r.id,
        status: r.status,
        description: r.description,
        createdAt: r.createdAt,
        quotes: r.quotes.map((q) => ({
          status: q.status,
          priceCents: q.priceCents,
          validUntil: q.validUntil,
          quoteUrl: `${env.WEB_URL}/quote/${q.token}`,
        })),
      })),
    })
  } catch (err) {
    next(err)
  }
})

/** Saved color combinations from this email's orders (restorable in the configurator). */
portalRouter.get('/configurations', async (req, res, next) => {
  try {
    const items = await prisma.orderItem.findMany({
      where: {
        order: { email: { equals: req.portalEmail!, mode: 'insensitive' } },
        productId: { not: null },
        colorSelection: { not: { equals: null } },
      },
      include: { product: { select: { slug: true, active: true } } },
      orderBy: { id: 'desc' },
      take: 100,
    })
    const colors = await prisma.color.findMany({
      select: { id: true, name: true, hex: true, active: true, outOfStock: true },
    })
    const colorById = new Map(colors.map((c) => [c.id, c]))
    const seen = new Set<string>()
    const configurations = []
    for (const item of items) {
      const selection = item.colorSelection as Record<string, string> | null
      if (!selection || Object.keys(selection).length === 0 || !item.product?.active) continue
      const key = `${item.productId}:${JSON.stringify(selection)}`
      if (seen.has(key)) continue
      seen.add(key)
      configurations.push({
        productId: item.productId,
        slug: item.product.slug,
        name: item.name,
        selectedColors: selection,
        swatches: Object.entries(selection).map(([slot, colorId]) => ({
          slot,
          hex: colorById.get(colorId)?.hex ?? '#000000',
          name: colorById.get(colorId)?.name ?? 'Unbekannt',
          available: (colorById.get(colorId)?.active ?? false) && !colorById.get(colorId)?.outOfStock,
        })),
      })
    }
    res.json({ configurations })
  } catch (err) {
    next(err)
  }
})
