import { colorStockStatus, spoolBelowMinimum, spoolNeedsReorder } from '@print-shop/utils'
import {
  amsSlotUpdateSchema,
  amsUnitSchema,
  colorAvailabilitySchema,
  spoolCreateSchema,
  spoolUpdateSchema,
} from '@print-shop/validators'
import { Router } from 'express'
import { audit } from '../../lib/audit.js'
import { prisma } from '../../lib/prisma.js'
import { requirePermission } from '../../middleware/auth.js'
import { conflict, notFound } from '../../middleware/error.js'

export const adminFilamentRouter = Router()

// ---------- Spools ----------

adminFilamentRouter.get('/spools', requirePermission('filament:read'), async (_req, res, next) => {
  try {
    const spools = await prisma.filamentSpool.findMany({
      include: {
        color: { select: { id: true, name: true, hex: true } },
        amsSlotAssignment: {
          include: { amsUnit: { select: { name: true, printer: { select: { name: true } } } } },
        },
      },
      orderBy: [{ active: 'desc' }, { createdAt: 'asc' }],
    })
    res.json({ spools })
  } catch (err) {
    next(err)
  }
})

adminFilamentRouter.post('/spools', requirePermission('filament:write'), async (req, res, next) => {
  try {
    const input = spoolCreateSchema.parse(req.body)
    const spool = await prisma.filamentSpool.create({
      data: input,
      include: { color: { select: { id: true, name: true, hex: true } } },
    })
    await audit(req, 'spool.create', { type: 'filament_spool', id: spool.id })
    res.status(201).json({ spool })
  } catch (err) {
    next(err)
  }
})

adminFilamentRouter.patch(
  '/spools/:id',
  requirePermission('filament:write'),
  async (req, res, next) => {
    try {
      const input = spoolUpdateSchema.parse(req.body)
      const spool = await prisma.filamentSpool.findUnique({ where: { id: String(req.params.id) } })
      if (!spool) throw notFound('Spool not found')
      const updated = await prisma.filamentSpool.update({
        where: { id: spool.id },
        data: input,
        include: { color: { select: { id: true, name: true, hex: true } } },
      })
      await audit(req, 'spool.update', { type: 'filament_spool', id: spool.id })
      res.json({ spool: updated })
    } catch (err) {
      next(err)
    }
  },
)

adminFilamentRouter.delete(
  '/spools/:id',
  requirePermission('filament:write'),
  async (req, res, next) => {
    try {
      const spool = await prisma.filamentSpool.findUnique({
        where: { id: String(req.params.id) },
        include: { amsSlotAssignment: true },
      })
      if (!spool) throw notFound('Spool not found')
      if (spool.amsSlotAssignment)
        throw conflict('Spool is assigned to an AMS slot — unload it first')
      await prisma.filamentSpool.delete({ where: { id: spool.id } })
      await audit(req, 'spool.delete', { type: 'filament_spool', id: spool.id })
      res.json({ ok: true })
    } catch (err) {
      next(err)
    }
  },
)

// ---------- Alerts & shopping list ----------

/** Stock warnings: spools below their minimum + colors below their aggregated minimum. */
adminFilamentRouter.get('/alerts', requirePermission('filament:read'), async (_req, res, next) => {
  try {
    const [spools, colors] = await Promise.all([
      prisma.filamentSpool.findMany({
        where: { active: true },
        include: {
          color: { select: { id: true, name: true, hex: true, outOfStock: true, active: true } },
        },
      }),
      prisma.color.findMany({ where: { active: true } }),
    ])
    const lowSpools = spools.filter((s) => spoolBelowMinimum(s))
    const spoolsByColor = new Map<string, typeof spools>()
    for (const s of spools) {
      if (!s.colorId) continue
      const list = spoolsByColor.get(s.colorId) ?? []
      list.push(s)
      spoolsByColor.set(s.colorId, list)
    }
    const lowColors = colors
      .map((color) => {
        const colorSpools = spoolsByColor.get(color.id) ?? []
        return {
          color,
          status: colorStockStatus(
            color.minStockGrams,
            colorSpools.map((s) => s.remainingGrams),
          ),
          totalRemainingGrams: colorSpools.reduce((sum, s) => sum + (s.remainingGrams ?? 0), 0),
        }
      })
      .filter((entry) => entry.status === 'low')
    res.json({ lowSpools, lowColors })
  } catch (err) {
    next(err)
  }
})

/** Shopping list: reorder-flagged ∪ below-minimum spools, grouped for purchasing. */
adminFilamentRouter.get(
  '/shopping-list',
  requirePermission('filament:read'),
  async (_req, res, next) => {
    try {
      const spools = await prisma.filamentSpool.findMany({
        where: { active: true },
        include: { color: { select: { name: true, hex: true } } },
      })
      const list = spools
        .filter((s) => spoolNeedsReorder(s))
        .map((s) => ({
          spoolId: s.id,
          label: s.label,
          material: s.material,
          manufacturer: s.manufacturer,
          colorName: s.color?.name ?? null,
          colorHex: s.color?.hex ?? null,
          remainingGrams: s.remainingGrams,
          minRemainingGrams: s.minRemainingGrams,
          reorderFlag: s.reorder,
        }))
      res.json({ shoppingList: list })
    } catch (err) {
      next(err)
    }
  },
)

/** Shop availability of a color: deactivate entirely or mark "currently unavailable". */
adminFilamentRouter.post(
  '/colors/:colorId/availability',
  requirePermission('colors:write'),
  async (req, res, next) => {
    try {
      const input = colorAvailabilitySchema.parse(req.body)
      const color = await prisma.color.findUnique({ where: { id: String(req.params.colorId) } })
      if (!color) throw notFound('Color not found')
      const updated = await prisma.color.update({ where: { id: color.id }, data: input })
      await audit(req, 'color.availability', { type: 'color', id: color.id }, input)
      res.json({ color: updated })
    } catch (err) {
      next(err)
    }
  },
)

// ---------- AMS units & slots ----------

adminFilamentRouter.get(
  '/ams-units',
  requirePermission('filament:read'),
  async (_req, res, next) => {
    try {
      const units = await prisma.amsUnit.findMany({
        include: {
          printer: { select: { id: true, name: true, status: true } },
          slots: {
            orderBy: { slotIndex: 'asc' },
            include: { spool: { include: { color: { select: { name: true, hex: true } } } } },
          },
        },
        orderBy: [{ printerId: 'asc' }, { position: 'asc' }],
      })
      res.json({ units })
    } catch (err) {
      next(err)
    }
  },
)

/** Create an AMS unit with its 4 empty slots. */
adminFilamentRouter.post(
  '/ams-units',
  requirePermission('filament:write'),
  async (req, res, next) => {
    try {
      const input = amsUnitSchema.parse(req.body)
      const printer = await prisma.printer.findUnique({ where: { id: input.printerId } })
      if (!printer) throw notFound('Printer not found')
      const unit = await prisma.amsUnit.create({
        data: {
          ...input,
          slots: { create: [1, 2, 3, 4].map((slotIndex) => ({ slotIndex })) },
        },
        include: { slots: { orderBy: { slotIndex: 'asc' } } },
      })
      await audit(req, 'ams_unit.create', { type: 'ams_unit', id: unit.id })
      res.status(201).json({ unit })
    } catch (err) {
      next(err)
    }
  },
)

adminFilamentRouter.delete(
  '/ams-units/:id',
  requirePermission('filament:write'),
  async (req, res, next) => {
    try {
      const unit = await prisma.amsUnit.findUnique({
        where: { id: String(req.params.id) },
        include: { slots: { select: { spoolId: true } } },
      })
      if (!unit) throw notFound('AMS unit not found')
      if (unit.slots.some((slot) => slot.spoolId)) {
        throw conflict('Cannot delete AMS unit while a spool is loaded')
      }
      await prisma.amsUnit.delete({ where: { id: unit.id } })
      await audit(req, 'ams_unit.delete', { type: 'ams_unit', id: unit.id })
      res.json({ ok: true })
    } catch (err) {
      next(err)
    }
  },
)

/** Slot update: load/unload a spool, set status, notes. A spool fits one slot only. */
adminFilamentRouter.patch(
  '/ams-slots/:id',
  requirePermission('filament:write'),
  async (req, res, next) => {
    try {
      const input = amsSlotUpdateSchema.parse(req.body)
      const slot = await prisma.amsSlot.findUnique({ where: { id: String(req.params.id) } })
      if (!slot) throw notFound('AMS slot not found')
      if (input.spoolId) {
        const spool = await prisma.filamentSpool.findUnique({
          where: { id: input.spoolId },
          include: { amsSlotAssignment: true },
        })
        if (!spool) throw notFound('Spool not found')
        if (spool.amsSlotAssignment && spool.amsSlotAssignment.id !== slot.id) {
          throw conflict('Spool is already loaded in another AMS slot')
        }
      }
      const updated = await prisma.amsSlot.update({
        where: { id: slot.id },
        data: {
          ...input,
          spoolId: input.status === 'empty' ? null : input.spoolId,
          // Loading a spool without an explicit status marks the slot as loaded;
          // unloading resets it to empty.
          status:
            input.status ??
            (input.spoolId === null ? 'empty' : input.spoolId ? 'loaded' : slot.status),
        },
        include: { spool: { include: { color: { select: { name: true, hex: true } } } } },
      })
      await audit(req, 'ams_slot.update', { type: 'ams_slot', id: slot.id }, input)
      res.json({ slot: updated })
    } catch (err) {
      next(err)
    }
  },
)
