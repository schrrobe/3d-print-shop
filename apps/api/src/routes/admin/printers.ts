import { PRINTER_STATUSES } from '@print-shop/types'
import { printerCreateSchema } from '@print-shop/validators'
import { Router } from 'express'
import { z } from 'zod'
import { audit } from '../../lib/audit.js'
import { prisma } from '../../lib/prisma.js'
import { requirePermission } from '../../middleware/auth.js'
import { notFound } from '../../middleware/error.js'

export const adminPrintersRouter = Router()

adminPrintersRouter.get('/', requirePermission('printers:read'), async (_req, res, next) => {
  try {
    const printers = await prisma.printer.findMany({
      include: {
        amsUnits: {
          include: {
            slots: {
              include: {
                spool: { include: { color: true } },
              },
              orderBy: { slotIndex: 'asc' },
            },
          },
          orderBy: { position: 'asc' },
        },
        jobs: {
          where: { status: { in: ['assigned', 'printing'] } },
          include: { order: { select: { orderNumber: true } } },
        },
      },
      orderBy: { name: 'asc' },
    })
    res.json({
      printers: printers.map(({ amsUnits, ...printer }) => ({
        ...printer,
        spools: amsUnits.flatMap((unit) =>
          unit.slots
            .filter((slot) => slot.spool)
            .map((slot) => ({
              ...slot.spool!,
              amsSlot: (unit.position - 1) * 4 + slot.slotIndex,
            })),
        ),
      })),
    })
  } catch (err) {
    next(err)
  }
})

adminPrintersRouter.post('/', requirePermission('printers:write'), async (req, res, next) => {
  try {
    const input = printerCreateSchema.parse(req.body)
    const printer = await prisma.printer.create({ data: input })
    await audit(req, 'printer.create', { type: 'printer', id: printer.id }, input)
    res.status(201).json({ printer })
  } catch (err) {
    next(err)
  }
})

const statusSchema = z.object({ status: z.enum(PRINTER_STATUSES) })

adminPrintersRouter.post('/:id/status', requirePermission('printers:write'), async (req, res, next) => {
  try {
    const { status } = statusSchema.parse(req.body)
    const existing = await prisma.printer.findUnique({ where: { id: String(req.params.id) } })
    if (!existing) throw notFound('Printer not found')
    const printer = await prisma.printer.update({ where: { id: existing.id }, data: { status } })
    await audit(req, 'printer.status', { type: 'printer', id: printer.id }, { from: existing.status, to: status })
    res.json({ printer })
  } catch (err) {
    next(err)
  }
})

const spoolSchema = z.object({
  amsSlot: z.number().int().min(1).max(16).nullable().optional(),
  colorId: z.string().nullable().optional(),
  material: z.string().min(1).max(100),
  remainingGrams: z.number().int().min(0).nullable().optional(),
  notes: z.string().max(2000).optional(),
})

/** AMS / spool assignment documentation. */
adminPrintersRouter.post('/:id/spools', requirePermission('printers:write'), async (req, res, next) => {
  try {
    const input = spoolSchema.parse(req.body)
    const printer = await prisma.printer.findUnique({ where: { id: String(req.params.id) } })
    if (!printer) throw notFound('Printer not found')
    const spool = await prisma.filamentSpool.create({
      data: { ...input, printerId: printer.id },
      include: { color: true },
    })
    await audit(req, 'printer.spool.create', { type: 'printer', id: printer.id }, input)
    res.status(201).json({ spool })
  } catch (err) {
    next(err)
  }
})

adminPrintersRouter.patch('/spools/:spoolId', requirePermission('printers:write'), async (req, res, next) => {
  try {
    const input = spoolSchema.partial().parse(req.body)
    const existing = await prisma.filamentSpool.findUnique({ where: { id: String(req.params.spoolId) } })
    if (!existing) throw notFound('Spool not found')
    const spool = await prisma.filamentSpool.update({
      where: { id: existing.id },
      data: input,
      include: { color: true },
    })
    await audit(req, 'printer.spool.update', { type: 'spool', id: spool.id }, input)
    res.json({ spool })
  } catch (err) {
    next(err)
  }
})
