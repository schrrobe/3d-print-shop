import { mkdirSync } from 'node:fs'
import { open } from 'node:fs/promises'
import path from 'node:path'
import { renderAdminNotification, renderUploadReceived } from '@print-shop/emails'
import {
  getFileExtension,
  hasValidUploadContent,
  sanitizeFilename,
  validateUploadFile,
} from '@print-shop/utils'
import { uploadRequestSchema } from '@print-shop/validators'
import { Router } from 'express'
import multer from 'multer'
import { env } from '../../env.js'
import { cleanupUploadedFiles } from '../../lib/image-upload.js'
import { prisma } from '../../lib/prisma.js'
import { randomToken } from '../../lib/tokens.js'
import { badRequest } from '../../middleware/error.js'
import { sensitiveLimiter } from '../../middleware/rate-limit.js'
import { sendEmail } from '../../services/email.js'

export const uploadsRouter = Router()

mkdirSync(env.UPLOAD_DIR, { recursive: true })

const storage = multer.diskStorage({
  destination: env.UPLOAD_DIR,
  filename: (_req, file, cb) => {
    cb(null, `${Date.now()}_${randomToken(6)}_${sanitizeFilename(file.originalname)}`)
  },
})

const upload = multer({
  storage,
  limits: { fileSize: env.UPLOAD_MAX_BYTES, files: 5 },
  fileFilter: (_req, file, cb) => {
    const extension = getFileExtension(file.originalname)
    if (extension !== '.stl' && extension !== '.3mf') {
      cb(badRequest(`File type not allowed: ${extension || '(none)'} — only .stl and .3mf`))
      return
    }
    cb(null, true)
  },
})

/**
 * Customer upload request: 3MF/STL files (max 50 MB each) + contact data.
 * Creates a QuoteRequest that production reviews before an individual quote is sent.
 */
uploadsRouter.post('/', sensitiveLimiter, upload.array('files', 5), async (req, res, next) => {
  try {
    const files = (req.files ?? []) as Express.Multer.File[]
    if (files.length === 0) throw badRequest('At least one .stl or .3mf file is required')

    for (const file of files) {
      const check = validateUploadFile({ filename: file.originalname, sizeBytes: file.size })
      if (!check.ok) throw badRequest(`Invalid file "${file.originalname}": ${check.error}`)
      const handle = await open(file.path, 'r')
      const header = new Uint8Array(84)
      try {
        const { bytesRead } = await handle.read(header, 0, header.length, 0)
        if (
          !hasValidUploadContent({
            extension: check.extension ?? '',
            sizeBytes: file.size,
            header: header.subarray(0, bytesRead),
          })
        ) {
          throw badRequest(`Invalid model file content: ${file.originalname}`)
        }
      } finally {
        await handle.close()
      }
    }

    const body = req.body as Record<string, string>
    const input = uploadRequestSchema.parse({
      name: body.name,
      email: body.email,
      phone: body.phone || undefined,
      description: body.description,
      quantity: body.quantity ? Number(body.quantity) : undefined,
      locale: body.locale || undefined,
      acceptsUploadTerms: body.acceptsUploadTerms === 'true' ? true : undefined,
    })

    const request = await prisma.quoteRequest.create({
      data: {
        name: input.name,
        email: input.email,
        phone: input.phone,
        description: input.description,
        quantity: input.quantity,
        locale: input.locale,
        acceptedUploadTerms: input.acceptsUploadTerms ?? false,
        files: {
          create: files.map((file) => ({
            originalName: file.originalname,
            storedPath: path.resolve(file.path),
            extension: getFileExtension(file.originalname),
            sizeBytes: file.size,
          })),
        },
      },
      include: { files: true },
    })

    await sendEmail(
      input.email,
      'upload_received',
      renderUploadReceived(
        { name: input.name, requestId: request.id, files: files.map((f) => f.originalname) },
        input.locale,
      ),
    )
    await sendEmail(
      env.ADMIN_NOTIFICATION_EMAIL,
      'admin_notification',
      renderAdminNotification(
        {
          event: 'Neue Upload-Anfrage',
          detail: `${input.name} (${input.email}) — ${files.length} Datei(en)`,
          adminUrl: `${env.WEB_URL}/admin/uploads`,
        },
        'de',
      ),
    )

    res.status(201).json({
      requestId: request.id,
      files: request.files.map((f) => ({ name: f.originalName, sizeBytes: f.sizeBytes })),
    })
  } catch (err) {
    await cleanupUploadedFiles(req.files as Express.Multer.File[] | undefined)
    next(err)
  }
})
