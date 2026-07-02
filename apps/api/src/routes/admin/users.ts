import { userCreateSchema, userUpdateSchema } from '@print-shop/validators'
import argon2 from 'argon2'
import { Router } from 'express'
import { audit } from '../../lib/audit.js'
import { prisma } from '../../lib/prisma.js'
import { requirePermission } from '../../middleware/auth.js'
import { badRequest, notFound } from '../../middleware/error.js'

export const adminUsersRouter = Router()

adminUsersRouter.get('/', requirePermission('users:read'), async (_req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        active: true,
        createdAt: true,
        role: { select: { name: true } },
      },
      orderBy: { createdAt: 'asc' },
    })
    res.json({ users })
  } catch (err) {
    next(err)
  }
})

adminUsersRouter.post('/', requirePermission('users:write'), async (req, res, next) => {
  try {
    const input = userCreateSchema.parse(req.body)
    const role = await prisma.role.findUnique({ where: { name: input.role } })
    if (!role) throw badRequest(`Unknown role: ${input.role}`)
    const user = await prisma.user.create({
      data: {
        email: input.email,
        name: input.name,
        passwordHash: await argon2.hash(input.password),
        roleId: role.id,
      },
      select: { id: true, email: true, name: true, active: true, role: { select: { name: true } } },
    })
    await audit(req, 'user.create', { type: 'user', id: user.id }, { email: input.email, role: input.role })
    res.status(201).json({ user })
  } catch (err) {
    next(err)
  }
})

adminUsersRouter.patch('/:id', requirePermission('users:write'), async (req, res, next) => {
  try {
    const input = userUpdateSchema.parse(req.body)
    const existing = await prisma.user.findUnique({ where: { id: String(req.params.id) } })
    if (!existing) throw notFound('User not found')
    const role = input.role
      ? await prisma.role.findUnique({ where: { name: input.role } })
      : undefined
    const user = await prisma.user.update({
      where: { id: existing.id },
      data: {
        email: input.email,
        name: input.name,
        active: input.active,
        roleId: role?.id,
        passwordHash: input.password ? await argon2.hash(input.password) : undefined,
      },
      select: { id: true, email: true, name: true, active: true, role: { select: { name: true } } },
    })
    await audit(req, 'user.update', { type: 'user', id: user.id }, { role: input.role, active: input.active })
    res.json({ user })
  } catch (err) {
    next(err)
  }
})
