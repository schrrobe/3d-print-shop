import { refundCancelSchema, refundCreateSchema } from '@print-shop/validators'
import { Router } from 'express'
import { audit } from '../../lib/audit.js'
import { prisma } from '../../lib/prisma.js'
import { requirePermission } from '../../middleware/auth.js'
import { ApiError, conflict, notFound } from '../../middleware/error.js'
import {
  generateInvoiceCorrectionPdf,
  sendInvoiceCorrectionEmail,
} from '../../services/invoice-correction.js'
import { createRefund, getOrderRefunds } from '../../services/refunds.js'

/** Erstattungen + Rechnungskorrekturen (mounted at /api/admin/refunds). */
export const adminRefundsRouter = Router()

adminRefundsRouter.get(
  '/orders/:orderId',
  requirePermission('payments:read'),
  async (req, res, next) => {
    try {
      res.json(await getOrderRefunds(String(req.params.orderId)))
    } catch (err) {
      next(err)
    }
  },
)

adminRefundsRouter.post(
  '/orders/:orderId',
  requirePermission('payments:refund'),
  async (req, res, next) => {
    try {
      const input = refundCreateSchema.parse(req.body)
      const orderId = String(req.params.orderId)
      const refund = await createRefund({ ...input, orderId, adminUserId: req.user?.id ?? null })
      await audit(
        req,
        'order.refund',
        { type: 'order', id: orderId },
        {
          refundId: refund.id,
          amountCents: refund.amountCents,
          provider: refund.provider,
          status: refund.status,
          complaintId: input.complaintId,
        },
      )
      res.status(201).json({ refund })
    } catch (err) {
      next(err)
    }
  },
)

/** "Stornieren & erstatten": full refund of a paid order that is not in production yet. */
adminRefundsRouter.post(
  '/orders/:orderId/cancel',
  requirePermission('payments:refund'),
  async (req, res, next) => {
    try {
      const input = refundCancelSchema.parse(req.body)
      const orderId = String(req.params.orderId)
      const refund = await createRefund({
        ...input,
        orderId,
        full: true,
        requireStatus: 'paid',
        adminUserId: req.user?.id ?? null,
      })
      await audit(
        req,
        'order.cancel_refund',
        { type: 'order', id: orderId },
        {
          refundId: refund.id,
          amountCents: refund.amountCents,
          provider: refund.provider,
          status: refund.status,
        },
      )
      res.status(201).json({ refund })
    } catch (err) {
      next(err)
    }
  },
)

adminRefundsRouter.get(
  '/corrections',
  requirePermission('invoices:read'),
  async (_req, res, next) => {
    try {
      const corrections = await prisma.invoiceCorrection.findMany({
        include: {
          invoice: {
            select: {
              number: true,
              order: { select: { id: true, orderNumber: true, email: true } },
            },
          },
        },
        orderBy: { issuedAt: 'desc' },
        take: 200,
      })
      res.json({ corrections })
    } catch (err) {
      next(err)
    }
  },
)

/** Downloads the Rechnungskorrektur PDF (regenerated if the file is missing). */
adminRefundsRouter.get(
  '/corrections/:id/pdf',
  requirePermission('invoices:read'),
  async (req, res, next) => {
    try {
      const correction = await prisma.invoiceCorrection.findUnique({
        where: { id: String(req.params.id) },
      })
      if (!correction) throw notFound('Invoice correction not found')
      const pdfPath = correction.pdfPath ?? (await generateInvoiceCorrectionPdf(correction.id))
      res.download(pdfPath, `${correction.number}.pdf`)
    } catch (err) {
      next(err)
    }
  },
)

adminRefundsRouter.post(
  '/corrections/:id/resend',
  requirePermission('payments:refund'),
  async (req, res, next) => {
    try {
      const correction = await prisma.invoiceCorrection.findUnique({
        where: { id: String(req.params.id) },
      })
      if (!correction) throw notFound('Invoice correction not found')
      const result = await sendInvoiceCorrectionEmail(correction.id, { resend: true })
      await audit(
        req,
        'invoice_correction.resend',
        { type: 'invoice_correction', id: correction.id },
        {
          result,
        },
      )
      if (result === 'busy') throw conflict('Die Rechnungskorrektur wird gerade versendet')
      if (result === 'failed') {
        throw new ApiError(502, 'E-Mail-Versand fehlgeschlagen (siehe E-Mail-Log)', 'email_failed')
      }
      res.json({ ok: true })
    } catch (err) {
      next(err)
    }
  },
)
