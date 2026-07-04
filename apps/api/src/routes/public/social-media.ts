import path from 'node:path'
import { Router } from 'express'
import { env } from '../../env.js'
import { notFound } from '../../middleware/error.js'

export const socialMediaRouter = Router()

const socialMediaDir = path.resolve(env.UPLOAD_DIR, 'social')

const CONTENT_TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
}

/**
 * Serves admin-uploaded social post images. Public without auth on purpose:
 * Meta fetches media via URL when a post is published.
 */
socialMediaRouter.get('/:filename', (req, res, next) => {
  const name = path.basename(String(req.params.filename))
  const extension = path.extname(name).toLowerCase()
  const contentType = CONTENT_TYPES[extension]
  if (!contentType || !/^[A-Za-z0-9._-]+$/.test(name)) {
    next(notFound('Media not found'))
    return
  }
  const resolved = path.resolve(socialMediaDir, name)
  if (!resolved.startsWith(socialMediaDir + path.sep)) {
    next(notFound('Media not found'))
    return
  }
  res.type(contentType)
  res.sendFile(resolved, (err) => {
    if (err) next(notFound('Media not found'))
  })
})
