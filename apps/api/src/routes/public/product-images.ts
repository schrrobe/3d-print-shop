import path from 'node:path'
import { Router } from 'express'
import sharp from 'sharp'
import { env } from '../../env.js'
import { notFound } from '../../middleware/error.js'

export const productImagesRouter = Router()

const productImagesDir = path.resolve(env.UPLOAD_DIR, 'products')
const CONTENT_TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
}
const ALLOWED_WIDTHS = [160, 320, 640, 960, 1200]
const LARGEST_WIDTH = ALLOWED_WIDTHS[ALLOWED_WIDTHS.length - 1] ?? 1200

function imagePath(filename: string): string | null {
  const name = path.basename(filename)
  const ext = path.extname(name).toLowerCase()
  if (!/^[A-Za-z0-9._-]+$/.test(name) || !(ext in CONTENT_TYPES)) return null

  const resolved = path.resolve(productImagesDir, name)
  if (!resolved.startsWith(productImagesDir + path.sep)) return null
  return resolved
}

function requestedWidth(value: unknown): number | null {
  const raw = Array.isArray(value) ? value[0] : value
  const width = Number(raw)
  if (!Number.isFinite(width) || width <= 0) return null
  return ALLOWED_WIDTHS.reduce<number>((best, candidate) => {
    if (candidate >= width && candidate < best) return candidate
    return best
  }, LARGEST_WIDTH)
}

function transformer(filePath: string, width: number, quality: number) {
  const ext = path.extname(filePath).toLowerCase()
  const pipeline = sharp(filePath).rotate().resize({ width, withoutEnlargement: true })
  if (ext === '.png') return pipeline.png({ compressionLevel: 9 })
  if (ext === '.webp') return pipeline.webp({ quality })
  return pipeline.jpeg({ quality, mozjpeg: true })
}

/** Serves admin-uploaded product photos. Products are public, so no auth. */
productImagesRouter.get('/:filename', async (req, res, next) => {
  const filePath = imagePath(String(req.params.filename))
  if (!filePath) {
    next(notFound('Image not found'))
    return
  }

  const ext = path.extname(filePath).toLowerCase()
  const width = requestedWidth(req.query.w)
  const quality = Math.min(90, Math.max(55, Number(req.query.q) || 78))

  res.set('Cache-Control', 'public, max-age=31536000, immutable')

  if (!width) {
    res.type(CONTENT_TYPES[ext] as string)
    res.sendFile(filePath, (err) => {
      if (err && !res.headersSent) next(notFound('Image not found'))
    })
    return
  }

  try {
    const output = await transformer(filePath, width, quality).toBuffer()
    res.type(CONTENT_TYPES[ext] as string)
    res.send(output)
  } catch {
    res.type(CONTENT_TYPES[ext] as string)
    res.sendFile(filePath, (err) => {
      if (err && !res.headersSent) next(notFound('Image not found'))
    })
  }
})
