import path from 'node:path'
import { Router } from 'express'
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

/** Serves admin-uploaded product photos. Products are public, so no auth. */
productImagesRouter.get('/:filename', (req, res, next) => {
  const name = path.basename(String(req.params.filename))
  const ext = path.extname(name).toLowerCase()
  if (!/^[A-Za-z0-9._-]+$/.test(name) || !(ext in CONTENT_TYPES)) {
    next(notFound('Image not found'))
    return
  }
  const resolved = path.resolve(productImagesDir, name)
  if (!resolved.startsWith(productImagesDir + path.sep)) {
    next(notFound('Image not found'))
    return
  }
  res.type(CONTENT_TYPES[ext] as string)
  res.sendFile(resolved, (err) => {
    if (err) next(notFound('Image not found'))
  })
})
