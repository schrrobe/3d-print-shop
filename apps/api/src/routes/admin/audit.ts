import { Router } from 'express'
import { prisma } from '../../lib/prisma.js'
import { requirePermission } from '../../middleware/auth.js'

export const adminAuditRouter = Router()

adminAuditRouter.get('/', requirePermission('audit:read'), async (req, res, next) => {
  try {
    const take = Math.min(Number(req.query.take ?? 100), 500)
    const logs = await prisma.adminAuditLog.findMany({
      include: { user: { select: { email: true, name: true } } },
      orderBy: { createdAt: 'desc' },
      take,
    })
    res.json({ logs })
  } catch (err) {
    next(err)
  }
})
