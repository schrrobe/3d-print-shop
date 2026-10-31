import { Router } from 'express'
import { prisma } from '../../lib/prisma.js'
import { requirePermission } from '../../middleware/auth.js'

export const adminErrorsRouter = Router()

adminErrorsRouter.get('/', requirePermission('audit:read'), async (req, res, next) => {
  try {
    const take = Math.min(Number(req.query.take ?? 200), 1000)
    const level = req.query.level === 'warn' || req.query.level === 'error' ? req.query.level : undefined
    const errors = await prisma.errorLog.findMany({
      where: level ? { level } : {},
      orderBy: { createdAt: 'desc' },
      take,
    })
    res.json({ errors })
  } catch (err) {
    next(err)
  }
})
