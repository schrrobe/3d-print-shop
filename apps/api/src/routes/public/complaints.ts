import path from 'node:path'
import { renderAdminNotification } from '@print-shop/emails'
import { complaintCreateSchema, complaintReplySchema } from '@print-shop/validators'
import { Router } from 'express'
import { env } from '../../env.js'
import {
  cleanupUploadedFiles,
  createImageUpload,
  validateUploadedImages,
} from '../../lib/image-upload.js'
import { prisma } from '../../lib/prisma.js'
import { randomToken } from '../../lib/tokens.js'
import { badRequest, conflict, notFound, unauthorized } from '../../middleware/error.js'
import { sensitiveLimiter } from '../../middleware/rate-limit.js'
import {
  complaintPublicDto,
  nextComplaintNumber,
  sendComplaintReceivedEmail,
} from '../../services/complaints.js'
import { sendEmail } from '../../services/email.js'

export const complaintsRouter = Router()

const photoUpload = createImageUpload('complaints', { maxFiles: 5, maxBytes: 10 * 1024 * 1024 })

/**
 * Customer opens a complaint on their order. Auth = orderNumber + the order
 * access token from the confirmation email (same pattern as the order page).
 * Multipart: photos[] + JSON fields as strings.
 */
complaintsRouter.post(
  '/',
  sensitiveLimiter,
  photoUpload.array('photos', 5),
  async (req, res, next) => {
    try {
      const body = req.body as Record<string, string>
      const input = complaintCreateSchema.parse({
        orderNumber: body.orderNumber,
        token: body.token,
        reason: body.reason,
        description: body.description,
        items: body.items ? JSON.parse(body.items) : [],
        locale: body.locale || undefined,
      })

      const order = await prisma.order.findUnique({
        where: { orderNumber: input.orderNumber },
        include: { items: true },
      })
      if (!order) throw notFound('Order not found')
      if (input.token !== order.accessToken) throw unauthorized('Invalid order token')

      for (const item of input.items) {
        const orderItem = order.items.find((i) => i.id === item.orderItemId)
        if (!orderItem) throw badRequest('Complaint items must belong to this order')
        if (item.quantity > orderItem.quantity) {
          throw badRequest(`Quantity for "${orderItem.name}" exceeds the ordered amount`)
        }
      }

      const files = (req.files ?? []) as Express.Multer.File[]
      await validateUploadedImages(files)
      const complaintNumber = await nextComplaintNumber()
      const complaint = await prisma.complaint.create({
        data: {
          complaintNumber,
          accessToken: randomToken(32),
          orderId: order.id,
          reason: input.reason,
          description: input.description,
          items: {
            create: input.items.map((i) => ({
              orderItemId: i.orderItemId,
              quantity: i.quantity,
              note: i.note,
            })),
          },
          attachments: {
            create: files.map((file) => ({
              originalName: file.originalname,
              storedPath: path.resolve(file.path),
              mimeType: file.mimetype,
              sizeBytes: file.size,
              uploadedBy: 'customer' as const,
            })),
          },
        },
      })

      await sendComplaintReceivedEmail(complaint, order)
      await sendEmail(
        env.ADMIN_NOTIFICATION_EMAIL,
        'admin_notification',
        renderAdminNotification(
          {
            event: 'Neue Reklamation',
            detail: `${complaint.complaintNumber} zu ${order.orderNumber} (${order.email})`,
            adminUrl: `${env.WEB_URL}/admin/complaints`,
          },
          'de',
        ),
      )

      res.status(201).json({
        complaintNumber: complaint.complaintNumber,
        accessToken: complaint.accessToken,
      })
    } catch (err) {
      await cleanupUploadedFiles(req.files as Express.Multer.File[] | undefined)
      next(err)
    }
  },
)

async function complaintByNumberAndToken(complaintNumber: string, token: string) {
  const complaint = await prisma.complaint.findUnique({
    where: { complaintNumber },
    include: {
      order: true,
      items: { include: { orderItem: true } },
      attachments: true,
      decisions: { orderBy: { decidedAt: 'asc' } },
    },
  })
  if (!complaint) throw notFound('Complaint not found')
  if (!token || token !== complaint.accessToken) throw unauthorized('Invalid complaint token')
  return complaint
}

/** Customer view — decisions without internal notes/identities. */
complaintsRouter.get('/:complaintNumber', sensitiveLimiter, async (req, res, next) => {
  try {
    const complaint = await complaintByNumberAndToken(
      String(req.params.complaintNumber),
      String(req.query.token ?? ''),
    )
    res.json({ complaint: complaintPublicDto(complaint) })
  } catch (err) {
    next(err)
  }
})

/** Customer reply while more information is needed — moves the case back to review. */
complaintsRouter.post(
  '/:complaintNumber/reply',
  sensitiveLimiter,
  photoUpload.array('photos', 5),
  async (req, res, next) => {
    try {
      const complaint = await complaintByNumberAndToken(
        String(req.params.complaintNumber),
        String((req.body as Record<string, string>).token ?? req.query.token ?? ''),
      )
      if (complaint.status !== 'info_needed') {
        throw conflict('Replies are only possible while more information is requested')
      }
      const input = complaintReplySchema.parse({
        message: (req.body as Record<string, string>).message,
      })
      const files = (req.files ?? []) as Express.Multer.File[]

      await prisma.complaint.update({
        where: { id: complaint.id },
        data: {
          status: 'in_review',
          description: `${complaint.description}\n\n--- Kundenantwort (${new Date().toISOString().slice(0, 10)}) ---\n${input.message}`,
          attachments: {
            create: files.map((file) => ({
              originalName: file.originalname,
              storedPath: path.resolve(file.path),
              mimeType: file.mimetype,
              sizeBytes: file.size,
              uploadedBy: 'customer' as const,
            })),
          },
        },
      })
      res.status(201).json({ ok: true, status: 'in_review' })
    } catch (err) {
      next(err)
    }
  },
)

/** Attachment download for the customer (token-gated, path read from the DB). */
complaintsRouter.get(
  '/:complaintNumber/attachments/:attachmentId',
  sensitiveLimiter,
  async (req, res, next) => {
    try {
      const complaint = await complaintByNumberAndToken(
        String(req.params.complaintNumber),
        String(req.query.token ?? ''),
      )
      const attachment = complaint.attachments.find((a) => a.id === String(req.params.attachmentId))
      if (!attachment) throw notFound('Attachment not found')
      res.setHeader('X-Content-Type-Options', 'nosniff')
      res.type(attachment.mimeType)
      res.sendFile(attachment.storedPath)
    } catch (err) {
      next(err)
    }
  },
)
