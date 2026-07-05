import { Prisma } from '@prisma/client'
import { normalizeVoucherCode } from '@print-shop/utils'
import { voucherCreateSchema, voucherUpdateSchema } from '@print-shop/validators'
import { Router } from 'express'
import { audit } from '../../lib/audit.js'
import { prisma } from '../../lib/prisma.js'
import { badRequest, conflict, notFound } from '../../middleware/error.js'
import { requirePermission } from '../../middleware/auth.js'

export const adminVouchersRouter = Router()

adminVouchersRouter.get('/', requirePermission('vouchers:read'), async (req, res, next) => {
  try {
    const active = req.query.active ? String(req.query.active) === 'true' : undefined
    const vouchers = await prisma.voucher.findMany({
      where: active === undefined ? undefined : { active },
      include: { _count: { select: { orders: true } } },
      orderBy: { createdAt: 'desc' },
      take: 200,
    })
    res.json({ vouchers })
  } catch (err) {
    next(err)
  }
})

adminVouchersRouter.get('/:id', requirePermission('vouchers:read'), async (req, res, next) => {
  try {
    const voucher = await prisma.voucher.findUnique({
      where: { id: String(req.params.id) },
      include: {
        _count: { select: { orders: true } },
        orders: {
          select: {
            id: true,
            orderNumber: true,
            status: true,
            discountCents: true,
            totalCents: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    })
    if (!voucher) throw notFound('Gutschein nicht gefunden')
    res.json({ voucher })
  } catch (err) {
    next(err)
  }
})

adminVouchersRouter.post('/', requirePermission('vouchers:write'), async (req, res, next) => {
  try {
    const input = voucherCreateSchema.parse(req.body)
    const voucher = await prisma.voucher.create({
      data: {
        code: normalizeVoucherCode(input.code),
        type: input.type,
        value: input.value,
        active: input.active,
        validFrom: input.validFrom ? new Date(input.validFrom) : null,
        validUntil: input.validUntil ? new Date(input.validUntil) : null,
        maxRedemptions: input.maxRedemptions ?? null,
        minOrderCents: input.minOrderCents,
        note: input.note ?? null,
      },
    })
    await audit(req, 'voucher.create', { type: 'voucher', id: voucher.id }, { code: voucher.code })
    res.status(201).json({ voucher })
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      next(conflict('Code bereits vergeben'))
      return
    }
    next(err)
  }
})

adminVouchersRouter.patch('/:id', requirePermission('vouchers:write'), async (req, res, next) => {
  try {
    const input = voucherUpdateSchema.parse(req.body)
    const voucher = await prisma.voucher.findUnique({ where: { id: String(req.params.id) } })
    if (!voucher) throw notFound('Gutschein nicht gefunden')

    // The partial schema only validates provided fields — recheck the merged state.
    const type = input.type ?? voucher.type
    const value = input.value ?? voucher.value
    if (type === 'percent' && value > 100) {
      throw badRequest('Prozent-Gutscheine erlauben höchstens 100')
    }

    const updated = await prisma.voucher.update({
      where: { id: voucher.id },
      data: {
        ...(input.code !== undefined ? { code: normalizeVoucherCode(input.code) } : {}),
        ...(input.type !== undefined ? { type: input.type } : {}),
        ...(input.value !== undefined ? { value: input.value } : {}),
        ...(input.active !== undefined ? { active: input.active } : {}),
        ...(input.validFrom !== undefined
          ? { validFrom: input.validFrom ? new Date(input.validFrom) : null }
          : {}),
        ...(input.validUntil !== undefined
          ? { validUntil: input.validUntil ? new Date(input.validUntil) : null }
          : {}),
        ...(input.maxRedemptions !== undefined ? { maxRedemptions: input.maxRedemptions } : {}),
        ...(input.minOrderCents !== undefined ? { minOrderCents: input.minOrderCents } : {}),
        ...(input.note !== undefined ? { note: input.note } : {}),
      },
    })
    await audit(req, 'voucher.update', { type: 'voucher', id: voucher.id }, input)
    res.json({ voucher: updated })
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      next(conflict('Code bereits vergeben'))
      return
    }
    next(err)
  }
})

/** Hard delete only while unused — otherwise deactivate via PATCH { active: false }. */
adminVouchersRouter.delete('/:id', requirePermission('vouchers:write'), async (req, res, next) => {
  try {
    const voucher = await prisma.voucher.findUnique({
      where: { id: String(req.params.id) },
      include: { _count: { select: { orders: true } } },
    })
    if (!voucher) throw notFound('Gutschein nicht gefunden')
    if (voucher.redemptionCount > 0 || voucher._count.orders > 0) {
      throw conflict('Eingelöste Gutscheine können nicht gelöscht werden — stattdessen deaktivieren')
    }
    await prisma.voucher.delete({ where: { id: voucher.id } })
    await audit(req, 'voucher.delete', { type: 'voucher', id: voucher.id }, { code: voucher.code })
    res.json({ ok: true })
  } catch (err) {
    next(err)
  }
})
