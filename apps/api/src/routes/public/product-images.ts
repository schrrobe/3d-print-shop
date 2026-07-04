import path from 'node:path'
import { Router } from 'express'
import { env } from '../../env.js'
import { notFound } from '../../middleware/error.js'

export const productImagesRouter = Router()

const imagesDir = path.resolve(env.UPLOAD_DIR, 'product-images')

/** Serves admin-uploaded product photos. Products are public, so no auth. */
productImagesRouter.get('/:filename', (req, res, next) => {
  const name = path.basename(String(req.params.filename))
  if (!/^[A-Za-z0-9._-]+\.(jpg|jpeg|png|webp)$/i.test(name)) {
    next(notFound('Image not found'))
    return
  }
  const resolved = path.resolve(imagesDir, name)
  if (!resolved.startsWith(imagesDir + path.sep)) {
    next(notFound('Image not found'))
    return
  }
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.sendFile(resolved, (err) => {
    if (err) next(notFound('Image not found'))
  })
})
