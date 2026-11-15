import { hasPermission } from '@print-shop/utils'
import { Router } from 'express'
import { prisma } from '../../lib/prisma.js'
import { requirePermission } from '../../middleware/auth.js'
import { conflict, forbidden, notFound } from '../../middleware/error.js'
import { generateInvoicePdf } from '../../services/invoice.js'
import { cancellationPdf } from '../../services/order-flow.js'

export const adminInvoicesRouter = Router()

adminInvoicesRouter.get('/', requirePermission('invoices:read'), async (_req, res, next) => {
  try {
    const invoices = await prisma.invoice.findMany({
      include: { order: { select: { orderNumber: true, email: true } } },
      orderBy: { issuedAt: 'desc' },
      take: 200,
    })
    res.json({ invoices })
  } catch (err) {
    next(err)
  }
})

/** Downloads the invoice PDF (regenerates it if the file is missing). */
adminInvoicesRouter.get('/:id/pdf', requirePermission('invoices:read'), async (req, res, next) => {
  try {
    const invoice = await prisma.invoice.findUnique({
      where: { id: String(req.params.id) },
      include: { order: { include: { items: true, payments: true } } },
    })
    if (!invoice) throw notFound('Invoice not found')
    const pdfPath = invoice.pdfPath ?? (await generateInvoicePdf(invoice, invoice.order))
    res.download(pdfPath, `${invoice.number}.pdf`)
  } catch (err) {
    next(err)
  }
})

/**
 * Downloads the Stornorechnung of a cancelled/refunded order's invoice. Numbers it here
 * when the cancel flow could not (that issues a document, so it needs orders:write),
 * and renders the PDF if none was rendered yet.
 */
adminInvoicesRouter.get(
  '/:id/cancellation.pdf',
  requirePermission('invoices:read'),
  async (req, res, next) => {
    try {
      const found = await prisma.invoice.findUnique({
        where: { id: String(req.params.id) },
        include: { order: { include: { items: true, payments: true } } },
      })
      if (!found) throw notFound('Invoice not found')
      if (!found.cancellationNumber) {
        if (!['cancelled', 'refunded'].includes(found.order.status))
          throw conflict('Bestellung ist nicht storniert')
        if (!hasPermission(req.user!.role, 'orders:write')) throw forbidden()
      }
      const { invoice, pdfPath } = await cancellationPdf(found, found.order)
      res.download(pdfPath, `${invoice.cancellationNumber}.pdf`)
    } catch (err) {
      next(err)
    }
  },
)
