import path from 'node:path'
import { renderAdminNotification } from '@print-shop/emails'
import { assertProductionTransition, assertQcTransition } from '@print-shop/utils'
import { qcChecklistSchema, qcCreateSchema, qcOverrideSchema, qcStatusSchema } from '@print-shop/validators'
import { Router } from 'express'
import { env } from '../../env.js'
import { audit } from '../../lib/audit.js'
import { createImageUpload } from '../../lib/image-upload.js'
import { prisma } from '../../lib/prisma.js'
import { requirePermission } from '../../middleware/auth.js'
import { badRequest, conflict, notFound } from '../../middleware/error.js'
import { sendEmail } from '../../services/email.js'

export const adminQcRouter = Router()

const photoUpload = createImageUpload('qc', { maxFiles: 5, maxBytes: 10 * 1024 * 1024 })

const qcInclude = {
  printerJob: {
    include: {
      order: { select: { orderNumber: true } },
      orderItem: { select: { name: true, quantity: true } },
      printer: { select: { name: true } },
    },
  },
  approvedBy: { select: { name: true, email: true } },
  attachments: true,
} satisfies NonNullable<Parameters<typeof prisma.qcRecord.findUnique>[0]>['include']

/** QC overview: records (filterable) + jobs currently in quality_check without an open record. */
adminQcRouter.get('/', requirePermission('qc:read'), async (req, res, next) => {
  try {
    const status = req.query.status ? String(req.query.status) : undefined
    const jobId = req.query.jobId ? String(req.query.jobId) : undefined
    const [records, jobsInQc] = await Promise.all([
      prisma.qcRecord.findMany({
        where: {
          ...(status ? { status: status as never } : {}),
          ...(jobId ? { printerJobId: jobId } : {}),
        },
        include: qcInclude,
        orderBy: { createdAt: 'desc' },
        take: 200,
      }),
      prisma.printerJob.findMany({
        where: { status: 'quality_check' },
        include: {
          order: { select: { orderNumber: true } },
          orderItem: { select: { name: true, quantity: true } },
          qcRecords: { orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: 1 },
        },
        orderBy: { createdAt: 'asc' },
      }),
    ])
    res.json({ records, jobsInQc })
  } catch (err) {
    next(err)
  }
})

/** Open a QC record for a job in quality_check (history: one record per attempt). */
adminQcRouter.post('/', requirePermission('qc:write'), async (req, res, next) => {
  try {
    const input = qcCreateSchema.parse(req.body)
    const job = await prisma.printerJob.findUnique({ where: { id: input.printerJobId } })
    if (!job) throw notFound('Print job not found')
    if (job.status !== 'quality_check') {
      throw conflict('QC records can only be opened while the job is in quality_check')
    }
    const open = await prisma.qcRecord.findFirst({
      where: { printerJobId: job.id, status: 'open' },
    })
    if (open) throw conflict('There is already an open QC record for this job')

    const record = await prisma.qcRecord.create({
      data: { printerJobId: job.id },
      include: qcInclude,
    })
    await audit(req, 'qc.create', { type: 'qc_record', id: record.id }, { printerJobId: job.id })
    res.status(201).json({ record })
  } catch (err) {
    next(err)
  }
})

/** Checklist updates — only while the record is open. */
adminQcRouter.patch('/:id', requirePermission('qc:write'), async (req, res, next) => {
  try {
    const input = qcChecklistSchema.parse(req.body)
    const record = await prisma.qcRecord.findUnique({ where: { id: String(req.params.id) } })
    if (!record) throw notFound('QC record not found')
    if (record.status !== 'open') throw conflict('Only open QC records can be edited')
    const updated = await prisma.qcRecord.update({
      where: { id: record.id },
      data: input,
      include: qcInclude,
    })
    await audit(req, 'qc.update', { type: 'qc_record', id: record.id })
    res.json({ record: updated })
  } catch (err) {
    next(err)
  }
})

const CHECKLIST_FIELDS = [
  'colorOk',
  'surfaceOk',
  'dimensionsOk',
  'stabilityOk',
  'completenessOk',
  'packagingOk',
] as const

/**
 * QC result. `passed` requires the full checklist. `failed → reprint_required`
 * moves the job back into the queue (quality_check → reprint_needed, printer
 * released) and notifies the internal address.
 */
adminQcRouter.post('/:id/status', requirePermission('qc:write'), async (req, res, next) => {
  try {
    const { status } = qcStatusSchema.parse(req.body)
    if (status === 'overridden') throw badRequest('Use the override endpoint (requires qc:override)')
    const record = await prisma.qcRecord.findUnique({
      where: { id: String(req.params.id) },
      include: { printerJob: { include: { order: { select: { orderNumber: true } } } } },
    })
    if (!record) throw notFound('QC record not found')
    assertQcTransition(record.status, status)
    if (status === 'passed' && !CHECKLIST_FIELDS.every((f) => record[f])) {
      throw conflict('All checklist items must be confirmed before passing QC')
    }

    const updated = await prisma.$transaction(async (tx) => {
      if (status === 'reprint_required') {
        assertProductionTransition(record.printerJob.status, 'reprint_needed')
        if (record.printerJob.printerId) {
          await tx.printer.update({ where: { id: record.printerJob.printerId }, data: { status: 'idle' } })
        }
        await tx.printerJob.update({
          where: { id: record.printerJobId },
          data: { status: 'reprint_needed', printerId: null },
        })
      }
      return tx.qcRecord.update({
        where: { id: record.id },
        data: {
          status,
          approvedById: status === 'passed' ? (req.user?.id ?? null) : record.approvedById,
          approvedAt: status === 'passed' ? new Date() : record.approvedAt,
        },
        include: qcInclude,
      })
    })

    if (status === 'failed' || status === 'reprint_required') {
      await sendEmail(
        env.ADMIN_NOTIFICATION_EMAIL,
        'admin_notification',
        renderAdminNotification(
          {
            event: 'QC fehlgeschlagen',
            detail: `Auftrag ${record.printerJob.order.orderNumber} — QC ${status === 'reprint_required' ? 'fehlgeschlagen, Reprint erforderlich' : 'fehlgeschlagen'}`,
            adminUrl: `${env.WEB_URL}/admin/qc`,
          },
          'de',
        ),
      )
    }

    await audit(req, 'qc.status', { type: 'qc_record', id: record.id }, { from: record.status, to: status })
    res.json({ record: updated })
  } catch (err) {
    next(err)
  }
})

/**
 * Conscious admin override: ship despite failed/incomplete QC. Requires
 * qc:override (admin only) and a written reason — both audited.
 */
adminQcRouter.post('/:id/override', requirePermission('qc:override'), async (req, res, next) => {
  try {
    const input = qcOverrideSchema.parse(req.body)
    const record = await prisma.qcRecord.findUnique({ where: { id: String(req.params.id) } })
    if (!record) throw notFound('QC record not found')
    assertQcTransition(record.status, 'overridden')
    const updated = await prisma.qcRecord.update({
      where: { id: record.id },
      data: {
        status: 'overridden',
        overrideReason: input.overrideReason,
        approvedById: req.user?.id ?? null,
        approvedAt: new Date(),
      },
      include: qcInclude,
    })
    await audit(req, 'qc.override', { type: 'qc_record', id: record.id }, { reason: input.overrideReason })
    res.json({ record: updated })
  } catch (err) {
    next(err)
  }
})

/** Photo proof upload. */
adminQcRouter.post(
  '/:id/photos',
  requirePermission('qc:write'),
  photoUpload.array('photos', 5),
  async (req, res, next) => {
    try {
      const record = await prisma.qcRecord.findUnique({ where: { id: String(req.params.id) } })
      if (!record) throw notFound('QC record not found')
      const files = (req.files ?? []) as Express.Multer.File[]
      if (files.length === 0) throw badRequest('At least one photo is required')
      await prisma.qcAttachment.createMany({
        data: files.map((file) => ({
          qcRecordId: record.id,
          originalName: file.originalname,
          storedPath: path.resolve(file.path),
          mimeType: file.mimetype,
          sizeBytes: file.size,
        })),
      })
      await audit(req, 'qc.photo_upload', { type: 'qc_record', id: record.id }, { count: files.length })
      res.status(201).json({ ok: true })
    } catch (err) {
      next(err)
    }
  },
)

/** Attachment view (permission-gated, path from the DB). */
adminQcRouter.get(
  '/:id/attachments/:attachmentId',
  requirePermission('qc:read'),
  async (req, res, next) => {
    try {
      const attachment = await prisma.qcAttachment.findUnique({
        where: { id: String(req.params.attachmentId) },
      })
      if (!attachment || attachment.qcRecordId !== String(req.params.id)) {
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
