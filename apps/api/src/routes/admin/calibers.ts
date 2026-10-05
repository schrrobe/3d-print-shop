import { caliberCreateSchema } from '@print-shop/validators'
import { Prisma } from '@prisma/client'
import { Router } from 'express'
import { audit } from '../../lib/audit.js'
import { prisma } from '../../lib/prisma.js'
import { requirePermission } from '../../middleware/auth.js'
import { conflict } from '../../middleware/error.js'

export const adminCalibersRouter = Router()

adminCalibersRouter.get('/', requirePermission('products:read'), async (_req, res, next) => {
  try {
    const calibers = await prisma.caliber.findMany({
      orderBy: [{ group: 'asc' }, { sortOrder: 'asc' }, { name: 'asc' }],
    })
    res.json({ calibers })
  } catch (err) {
    next(err)
  }
})

adminCalibersRouter.post('/', requirePermission('products:write'), async (req, res, next) => {
  try {
    const input = caliberCreateSchema.parse(req.body)
    const caliber = await prisma.caliber.create({ data: input }).catch((err: unknown) => {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw conflict('Caliber slug already exists')
      }
      throw err
    })
    await audit(req, 'caliber.create', { type: 'caliber', id: caliber.id }, input)
    res.status(201).json({ caliber })
  } catch (err) {
    next(err)
  }
})
