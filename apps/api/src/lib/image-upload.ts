import { mkdirSync } from 'node:fs'
import { readFile, unlink } from 'node:fs/promises'
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
        cb(
          badRequest(
            `File type not allowed: ${extension || '(none)'} — only .jpg, .jpeg, .png, .webp`,
          ),
        )
        return
      }
      cb(null, true)
    },
  })
}

export async function cleanupUploadedFiles(
  files: Express.Multer.File[] | Express.Multer.File | undefined,
): Promise<void> {
  const list = Array.isArray(files) ? files : files ? [files] : []
  await Promise.allSettled(list.map((file) => unlink(file.path)))
}

function isAllowedImageSignature(bytes: Uint8Array): boolean {
  const isJpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
  const isPng =
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  const isWebp =
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  return isJpeg || isPng || isWebp
}

export async function validateUploadedImages(
  files: Express.Multer.File[] | Express.Multer.File | undefined,
): Promise<void> {
  const list = Array.isArray(files) ? files : files ? [files] : []
  for (const file of list) {
    const bytes = await readFile(file.path)
    if (!isAllowedImageSignature(bytes.subarray(0, 12))) {
      await cleanupUploadedFiles(list)
      throw badRequest(`File content is not a supported image: ${file.originalname}`)
    }
  }
}
