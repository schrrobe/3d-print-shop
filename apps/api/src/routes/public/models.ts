import path from 'node:path'
import { Router } from 'express'
import { env } from '../../env.js'
import { notFound } from '../../middleware/error.js'

export const modelsRouter = Router()

const modelsDir = path.resolve(env.UPLOAD_DIR, 'models')

/** Serves admin-uploaded GLB previews. Products are public, so no auth. */
modelsRouter.get('/:filename', (req, res, next) => {
  const name = path.basename(String(req.params.filename))
  if (!/^[A-Za-z0-9._-]+\.glb$/.test(name)) {
    next(notFound('Model not found'))
    return
  }
  const resolved = path.resolve(modelsDir, name)
  if (!resolved.startsWith(modelsDir + path.sep)) {
    next(notFound('Model not found'))
    return
  }
  res.type('model/gltf-binary')
  res.sendFile(resolved, (err) => {
    if (err) next(notFound('Model not found'))
  })
})
