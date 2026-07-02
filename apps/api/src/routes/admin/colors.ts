import { colorCreateSchema, colorUpdateSchema } from '@print-shop/validators'
import { Router } from 'express'
import { audit } from '../../lib/audit.js'
import { prisma } from '../../lib/prisma.js'
import { requirePermission } from '../../middleware/auth.js'
import { notFound } from '../../middleware/error.js'

export const adminColorsRouter = Router()

adminColorsRouter.get('/', requirePermission('colors:read'), async (_req, res, next) => {
  try {
    const colors = await prisma.color.findMany({ orderBy: { name: 'asc' } })
    res.json({ colors })
  } catch (err) {
    next(err)
  }
})

adminColorsRouter.post('/', requirePermission('colors:write'), async (req, res, next) => {
  try {
    const input = colorCreateSchema.parse(req.body)
    const color = await prisma.color.create({ data: input })
    await audit(req, 'color.create', { type: 'color', id: color.id }, input)
    res.status(201).json({ color })
  } catch (err) {
    next(err)
  }
})

adminColorsRouter.patch('/:id', requirePermission('colors:write'), async (req, res, next) => {
  try {
    const input = colorUpdateSchema.parse(req.body)
    const existing = await prisma.color.findUnique({ where: { id: String(req.params.id) } })
    if (!existing) throw notFound('Color not found')
    const color = await prisma.color.update({ where: { id: existing.id }, data: input })
    await audit(req, 'color.update', { type: 'color', id: color.id }, input)
    res.json({ color })
  } catch (err) {
    next(err)
  }
})

adminColorsRouter.delete('/:id', requirePermission('colors:write'), async (req, res, next) => {
  try {
    const existing = await prisma.color.findUnique({ where: { id: String(req.params.id) } })
    if (!existing) throw notFound('Color not found')
    await prisma.color.delete({ where: { id: existing.id } })
    await audit(req, 'color.delete', { type: 'color', id: existing.id }, { name: existing.name })
    res.json({ ok: true })
  } catch (err) {
    next(err)
  }
})
