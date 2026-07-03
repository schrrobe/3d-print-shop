import { mkdirSync } from 'node:fs'
import path from 'node:path'
import { getFileExtension, sanitizeFilename } from '@print-shop/utils'
import multer from 'multer'
import { env } from '../env.js'
import { badRequest } from '../middleware/error.js'
import { randomToken } from './tokens.js'

const ALLOWED_IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp'])

/**
 * Multer instance for photo uploads into a private UPLOAD_DIR subdirectory
 * (complaints/, qc/, reviews/). These directories are NEVER served statically —
 * files are only delivered through token-/permission-checked endpoints that
 * read the stored path from the database.
 */
export function createImageUpload(subdir: string, options: { maxFiles: number; maxBytes: number }) {
  const dir = path.join(env.UPLOAD_DIR, subdir)
  mkdirSync(dir, { recursive: true })
  return multer({
    storage: multer.diskStorage({
      destination: dir,
      filename: (_req, file, cb) => {
        cb(null, `${Date.now()}_${randomToken(6)}_${sanitizeFilename(file.originalname)}`)
      },
    }),
    limits: { fileSize: options.maxBytes, files: options.maxFiles },
    fileFilter: (_req, file, cb) => {
      const extension = getFileExtension(file.originalname)
      if (!ALLOWED_IMAGE_EXTENSIONS.has(extension) || !file.mimetype.startsWith('image/')) {
        cb(badRequest(`File type not allowed: ${extension || '(none)'} — only .jpg, .jpeg, .png, .webp`))
        return
      }
      cb(null, true)
    },
  })
}
