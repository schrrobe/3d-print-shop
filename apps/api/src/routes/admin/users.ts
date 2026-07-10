import { userCreateSchema, userUpdateSchema } from '@print-shop/validators'
import argon2 from 'argon2'
import { Prisma } from '@prisma/client'
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
    await audit(
      req,
      'user.create',
      { type: 'user', id: user.id },
      { email: input.email, role: input.role },
    )
    res.status(201).json({ user })
  } catch (err) {
    next(err)
  }
})

adminUsersRouter.patch('/:id', requirePermission('users:write'), async (req, res, next) => {
  try {
    const input = userUpdateSchema.parse(req.body)
    const passwordHash = input.password ? await argon2.hash(input.password) : undefined
    const user = await prisma.$transaction(
      async (tx) => {
        const existing = await tx.user.findUnique({
          where: { id: String(req.params.id) },
          include: { role: true },
        })
        if (!existing) throw notFound('User not found')
        const role = input.role
          ? await tx.role.findUnique({ where: { name: input.role } })
          : undefined
        if (input.role && !role) throw badRequest(`Unknown role: ${input.role}`)

        const removesActiveAdmin =
          existing.active &&
          existing.role.name === 'admin' &&
          (input.active === false || (input.role != null && input.role !== 'admin'))
        if (removesActiveAdmin) {
          const otherAdmins = await tx.user.count({
            where: { id: { not: existing.id }, active: true, role: { name: 'admin' } },
          })
          if (otherAdmins === 0)
            throw badRequest('Cannot deactivate or demote the last active admin')
        }

        return tx.user.update({
          where: { id: existing.id },
          data: {
            email: input.email,
            name: input.name,
            active: input.active,
            roleId: role?.id,
            passwordHash,
            sessionVersion: passwordHash ? { increment: 1 } : undefined,
          },
          select: {
            id: true,
            email: true,
            name: true,
            active: true,
            role: { select: { name: true } },
          },
        })
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    )
    await audit(
      req,
      'user.update',
      { type: 'user', id: user.id },
      { role: input.role, active: input.active },
    )
    res.json({ user })
  } catch (err) {
    next(err)
  }
})
