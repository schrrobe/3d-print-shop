import { Router } from 'express'
import { prisma } from '../../lib/prisma.js'
import { requirePermission } from '../../middleware/auth.js'
import { notFound } from '../../middleware/error.js'
import { generateInvoicePdf } from '../../services/invoice.js'

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
