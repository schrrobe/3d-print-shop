import { renderQuoteAvailable } from '@print-shop/emails'
import { quoteCreateSchema } from '@print-shop/validators'
import { Router } from 'express'
import { z } from 'zod'
import { env } from '../../env.js'
import { audit } from '../../lib/audit.js'
import { prisma } from '../../lib/prisma.js'
import { randomToken } from '../../lib/tokens.js'
import { requirePermission } from '../../middleware/auth.js'
import { notFound } from '../../middleware/error.js'
import { sendEmail } from '../../services/email.js'

export const adminQuoteRequestsRouter = Router()

adminQuoteRequestsRouter.get('/', requirePermission('uploads:read'), async (req, res, next) => {
  try {
    const status = req.query.status ? String(req.query.status) : undefined
    const requests = await prisma.quoteRequest.findMany({
      where: status ? { status: status as never } : undefined,
      include: { files: true, quotes: true },
      orderBy: { createdAt: 'desc' },
    })
    res.json({ requests })
  } catch (err) {
    next(err)
  }
})

adminQuoteRequestsRouter.get('/:id', requirePermission('uploads:read'), async (req, res, next) => {
  try {
    const request = await prisma.quoteRequest.findUnique({
      where: { id: String(req.params.id) },
      include: { files: true, quotes: { include: { order: { select: { orderNumber: true } } } } },
    })
    if (!request) throw notFound('Quote request not found')
    res.json({ request })
  } catch (err) {
    next(err)
  }
})

const statusSchema = z.object({ status: z.enum(['in_review', 'rejected', 'cancelled']) })

adminQuoteRequestsRouter.post(
  '/:id/status',
  requirePermission('uploads:review'),
  async (req, res, next) => {
    try {
      const { status } = statusSchema.parse(req.body)
      const existing = await prisma.quoteRequest.findUnique({ where: { id: String(req.params.id) } })
      if (!existing) throw notFound('Quote request not found')
      const request = await prisma.quoteRequest.update({
        where: { id: existing.id },
        data: { status },
      })
      await audit(req, 'quote_request.status', { type: 'quote_request', id: request.id }, { status })
      res.json({ request })
    } catch (err) {
      next(err)
    }
  },
)

/** Creates and sends a quote for an upload request (quotes:write). */
adminQuoteRequestsRouter.post(
  '/:id/quotes',
  requirePermission('quotes:write'),
  async (req, res, next) => {
    try {
      const input = quoteCreateSchema.parse({ ...req.body, quoteRequestId: String(req.params.id) })
      const request = await prisma.quoteRequest.findUnique({ where: { id: String(req.params.id) } })
      if (!request) throw notFound('Quote request not found')

      const token = randomToken(32)
      const validUntil = new Date(Date.now() + input.validDays * 24 * 60 * 60 * 1000)
      const quote = await prisma.quote.create({
        data: {
          quoteRequestId: request.id,
          priceCents: input.priceCents,
          message: input.message,
          token,
          validUntil,
          status: 'sent',
          sentAt: new Date(),
        },
      })
      await prisma.quoteRequest.update({
        where: { id: request.id },
        data: { status: 'quoted' },
      })

      const quoteUrl = `${env.WEB_URL}/quote/${token}`
      await sendEmail(
        request.email,
        'quote_available',
        renderQuoteAvailable(
          {
            name: request.name,
            priceCents: input.priceCents,
            quoteUrl,
            validUntil: validUntil.toISOString().slice(0, 10),
            message: input.message,
          },
          request.locale,
        ),
      )
      await audit(req, 'quote.create', { type: 'quote', id: quote.id }, { priceCents: input.priceCents })
      res.status(201).json({ quote: { ...quote, url: quoteUrl } })
    } catch (err) {
      next(err)
    }
  },
)
