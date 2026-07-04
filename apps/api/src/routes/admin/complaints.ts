import path from 'node:path'
import { formatInvoiceNumber, nextInvoiceSequence } from '@print-shop/utils'
import { assertComplaintTransition } from '@print-shop/utils'
import {
  complaintDecisionSchema,
  complaintStatusSchema,
  complaintTicketSchema,
  complaintUpdateSchema,
} from '@print-shop/validators'
import { Router } from 'express'
import { audit } from '../../lib/audit.js'
import { createImageUpload } from '../../lib/image-upload.js'
import { prisma } from '../../lib/prisma.js'
import { randomToken } from '../../lib/tokens.js'
import { badRequest, conflict, notFound } from '../../middleware/error.js'
import { requirePermission } from '../../middleware/auth.js'
import { sendComplaintUpdatedEmail } from '../../services/complaints.js'

export const adminComplaintsRouter = Router()

const photoUpload = createImageUpload('complaints', { maxFiles: 5, maxBytes: 10 * 1024 * 1024 })
const DECISION_ONLY_STATUSES = new Set([
  'approved',
  'replacement_planned',
  'refund_planned',
  'rejected',
])

const complaintInclude = {
  order: {
    select: {
      id: true,
      orderNumber: true,
      status: true,
      email: true,
      firstName: true,
      lastName: true,
      invoice: { select: { id: true, number: true } },
    },
  },
  items: {
    include: { orderItem: { include: { product: { select: { slug: true, customMade: true } } } } },
  },
  attachments: true,
  decisions: {
    orderBy: { decidedAt: 'asc' as const },
    include: { decidedBy: { select: { name: true, email: true } }, reprintJob: true },
  },
  ticket: { select: { id: true, ticketNumber: true, status: true, subject: true } },
} satisfies NonNullable<Parameters<typeof prisma.complaint.findUnique>[0]>['include']

adminComplaintsRouter.get('/', requirePermission('complaints:read'), async (req, res, next) => {
  try {
    const status = req.query.status ? String(req.query.status) : undefined
    const complaints = await prisma.complaint.findMany({
      where: status ? { status: status as never } : undefined,
      include: {
        order: { select: { orderNumber: true, email: true } },
        items: true,
        decisions: { select: { resolution: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    })
    res.json({ complaints })
  } catch (err) {
    next(err)
  }
})

adminComplaintsRouter.get('/:id', requirePermission('complaints:read'), async (req, res, next) => {
  try {
    const complaint = await prisma.complaint.findUnique({
      where: { id: String(req.params.id) },
      include: complaintInclude,
    })
    if (!complaint) throw notFound('Complaint not found')
    res.json({ complaint })
  } catch (err) {
    next(err)
  }
})

/** Status transition (validated by the complaint status machine) + customer email. */
adminComplaintsRouter.post(
  '/:id/status',
  requirePermission('complaints:write'),
  async (req, res, next) => {
    try {
      const { status } = complaintStatusSchema.parse(req.body)
      const complaint = await prisma.complaint.findUnique({
        where: { id: String(req.params.id) },
        include: { order: true },
      })
      if (!complaint) throw notFound('Complaint not found')
      if (DECISION_ONLY_STATUSES.has(status)) {
        throw conflict(
          'Use the complaint decision endpoint for approval, rejection, replacement or refund outcomes',
        )
      }
      assertComplaintTransition(complaint.status, status)
      const updated = await prisma.complaint.update({
        where: { id: complaint.id },
        data: { status, closedAt: status === 'closed' ? new Date() : complaint.closedAt },
      })
      await sendComplaintUpdatedEmail(updated, complaint.order)
      await audit(
        req,
        'complaint.status',
        { type: 'complaint', id: complaint.id },
        { from: complaint.status, to: status },
      )
      res.json({ complaint: updated })
    } catch (err) {
      next(err)
    }
  },
)

/** Internal note (staff only, never exposed to the customer). */
adminComplaintsRouter.patch(
  '/:id',
  requirePermission('complaints:write'),
  async (req, res, next) => {
    try {
      const input = complaintUpdateSchema.parse(req.body)
      const complaint = await prisma.complaint.findUnique({ where: { id: String(req.params.id) } })
      if (!complaint) throw notFound('Complaint not found')
      const updated = await prisma.complaint.update({
        where: { id: complaint.id },
        data: { internalNote: input.internalNote },
      })
      await audit(req, 'complaint.update', { type: 'complaint', id: complaint.id })
      res.json({ complaint: updated })
    } catch (err) {
      next(err)
    }
  },
)

/**
 * Decision (complaints:decide — admin only). `replacement_print` creates one
 * reprint job per complaint item in the production queue (status: waiting) and
 * moves the complaint to replacement_planned; refund → refund_planned;
 * rejection → rejected; further_review keeps the case in review.
 */
adminComplaintsRouter.post(
  '/:id/decision',
  requirePermission('complaints:decide'),
  async (req, res, next) => {
    try {
      const input = complaintDecisionSchema.parse(req.body)
      const complaint = await prisma.complaint.findUnique({
        where: { id: String(req.params.id) },
        include: { order: true, items: { include: { orderItem: true } } },
      })
      if (!complaint) throw notFound('Complaint not found')
      if (complaint.status !== 'in_review' && complaint.status !== 'approved') {
        throw conflict('Decisions are only possible while the complaint is in review or approved')
      }

      const nextStatus =
        input.resolution === 'replacement_print'
          ? ('replacement_planned' as const)
          : input.resolution === 'refund'
            ? ('refund_planned' as const)
            : input.resolution === 'rejection'
              ? ('rejected' as const)
              : input.resolution === 'voucher'
                ? ('approved' as const)
                : ('in_review' as const)
      if (
        complaint.status === 'in_review' &&
        nextStatus !== 'in_review' &&
        nextStatus !== 'rejected'
      ) {
        // in_review → approved → (replacement|refund)_planned: validate both hops
        assertComplaintTransition(complaint.status, 'approved')
        if (nextStatus !== 'approved') assertComplaintTransition('approved', nextStatus)
      } else if (nextStatus !== complaint.status && nextStatus !== 'in_review') {
        assertComplaintTransition(complaint.status, nextStatus)
      }

      const result = await prisma.$transaction(async (tx) => {
        let reprintJobId: string | null = null
        if (input.resolution === 'replacement_print') {
          for (const item of complaint.items) {
            const job = await tx.printerJob.create({
              data: {
                orderId: complaint.orderId,
                orderItemId: item.orderItemId,
                status: 'waiting',
                notes: `Ersatzdruck aus Reklamation ${complaint.complaintNumber}`,
              },
            })
            reprintJobId = reprintJobId ?? job.id
          }
        }
        const decision = await tx.complaintDecision.create({
          data: {
            complaintId: complaint.id,
            resolution: input.resolution,
            note: input.note ?? null,
            refundAmountCents: input.refundAmountCents ?? null,
            voucherCode: input.voucherCode ?? null,
            reprintJobId,
            decidedById: req.user?.id ?? null,
          },
        })
        const updated = await tx.complaint.update({
          where: { id: complaint.id },
          data: { status: nextStatus },
        })
        return { decision, updated }
      })

      await sendComplaintUpdatedEmail(result.updated, complaint.order, input.note ?? undefined)
      await audit(
        req,
        'complaint.decision',
        { type: 'complaint', id: complaint.id },
        { resolution: input.resolution },
      )
      res.status(201).json({ complaint: result.updated, decision: result.decision })
    } catch (err) {
      next(err)
    }
  },
)

/** Create a support ticket from the complaint or link an existing one. */
adminComplaintsRouter.post(
  '/:id/ticket',
  requirePermission('complaints:write'),
  async (req, res, next) => {
    try {
      const input = complaintTicketSchema.parse(req.body ?? {})
      const complaint = await prisma.complaint.findUnique({
        where: { id: String(req.params.id) },
        include: { order: true },
      })
      if (!complaint) throw notFound('Complaint not found')
      if (complaint.ticketId) throw conflict('Complaint is already linked to a ticket')

      let ticketId = input.ticketId ?? null
      if (ticketId) {
        const ticket = await prisma.ticket.findUnique({
          where: { id: ticketId },
          include: { complaint: { select: { id: true } } },
        })
        if (!ticket) throw notFound('Ticket not found')
        if (ticket.complaint != null)
          throw conflict('Ticket is already linked to another complaint')
      } else {
        const ticket = await prisma.$transaction(async (tx) => {
          const year = new Date().getFullYear()
          const existing = await tx.ticketCounter.findUnique({ where: { year } })
          const nextSeq = nextInvoiceSequence(existing, year)
          await tx.ticketCounter.upsert({
            where: { year: nextSeq.year },
            create: { year: nextSeq.year, lastSequence: nextSeq.sequence },
            update: { lastSequence: nextSeq.sequence },
          })
          return tx.ticket.create({
            data: {
              ticketNumber: formatInvoiceNumber('TIC', nextSeq.year, nextSeq.sequence),
              accessToken: randomToken(32),
              subject: `Reklamation ${complaint.complaintNumber}`,
              category: 'order',
              name: `${complaint.order.firstName} ${complaint.order.lastName}`,
              email: complaint.order.email,
              locale: complaint.order.locale,
              orderId: complaint.orderId,
              messages: {
                create: [{ authorType: 'customer', body: complaint.description }],
              },
            },
          })
        })
        ticketId = ticket.id
      }

      const updated = await prisma.complaint.update({
        where: { id: complaint.id },
        data: { ticketId },
        include: {
          ticket: { select: { id: true, ticketNumber: true, status: true, subject: true } },
        },
      })
      await audit(
        req,
        'complaint.ticket_link',
        { type: 'complaint', id: complaint.id },
        { ticketId },
      )
      res.status(201).json({ complaint: updated })
    } catch (err) {
      next(err)
    }
  },
)

/** Staff photo upload to a complaint. */
adminComplaintsRouter.post(
  '/:id/photos',
  requirePermission('complaints:write'),
  photoUpload.array('photos', 5),
  async (req, res, next) => {
    try {
      const complaint = await prisma.complaint.findUnique({ where: { id: String(req.params.id) } })
      if (!complaint) throw notFound('Complaint not found')
      const files = (req.files ?? []) as Express.Multer.File[]
      if (files.length === 0) throw badRequest('At least one photo is required')
      await prisma.complaintAttachment.createMany({
        data: files.map((file) => ({
          complaintId: complaint.id,
          originalName: file.originalname,
          storedPath: path.resolve(file.path),
          mimeType: file.mimetype,
          sizeBytes: file.size,
          uploadedBy: 'staff' as const,
        })),
      })
      await audit(
        req,
        'complaint.photo_upload',
        { type: 'complaint', id: complaint.id },
        { count: files.length },
      )
      res.status(201).json({ ok: true })
    } catch (err) {
      next(err)
    }
  },
)

/** Attachment view for staff (permission-gated, path read from the DB). */
adminComplaintsRouter.get(
  '/:id/attachments/:attachmentId',
  requirePermission('complaints:read'),
  async (req, res, next) => {
    try {
      const attachment = await prisma.complaintAttachment.findUnique({
        where: { id: String(req.params.attachmentId) },
      })
      if (!attachment || attachment.complaintId !== String(req.params.id)) {
        throw notFound('Attachment not found')
      }
      res.setHeader('X-Content-Type-Options', 'nosniff')
      res.type(attachment.mimeType)
      res.sendFile(attachment.storedPath)
    } catch (err) {
      next(err)
    }
  },
)
