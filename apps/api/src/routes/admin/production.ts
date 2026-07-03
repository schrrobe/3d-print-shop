import { PRODUCTION_STATUSES } from '@print-shop/types'
import { assertProductionTransition, calcPrinterEtaMs, findOverlaps } from '@print-shop/utils'
import { jobScheduleSchema, maintenanceWindowSchema, printJobAssignSchema } from '@print-shop/validators'
import { Router } from 'express'
import { z } from 'zod'
import { audit } from '../../lib/audit.js'
import { prisma } from '../../lib/prisma.js'
import { requirePermission } from '../../middleware/auth.js'
import { badRequest, conflict, notFound } from '../../middleware/error.js'
import { allJobsQcCleared } from '../../services/qc.js'

export const adminProductionRouter = Router()

/** Production queue with per-printer ETA (sum of open job durations). */
adminProductionRouter.get('/queue', requirePermission('print-jobs:read'), async (_req, res, next) => {
  try {
    const jobs = await prisma.printerJob.findMany({
      where: { status: { notIn: ['shipped'] } },
      include: {
        order: { select: { orderNumber: true, status: true } },
        orderItem: true,
        printer: { select: { id: true, name: true, status: true } },
      },
      orderBy: { createdAt: 'asc' },
    })
    const byPrinter = new Map<string, { printDurationMinutes: number }[]>()
    for (const job of jobs) {
      if (job.printerId && job.printDurationMinutes && ['assigned', 'printing'].includes(job.status)) {
        const list = byPrinter.get(job.printerId) ?? []
        list.push({ printDurationMinutes: job.printDurationMinutes })
        byPrinter.set(job.printerId, list)
      }
    }
    const etaByPrinter = Object.fromEntries(
      [...byPrinter.entries()].map(([printerId, list]) => [printerId, calcPrinterEtaMs(list)]),
    )
    res.json({ jobs, etaByPrinter })
  } catch (err) {
    next(err)
  }
})

/** Assign a job to a printer with a planned print duration. */
adminProductionRouter.post('/:jobId/assign', requirePermission('print-jobs:write'), async (req, res, next) => {
  try {
    const input = printJobAssignSchema.parse(req.body)
    const job = await prisma.printerJob.findUnique({ where: { id: String(req.params.jobId) } })
    if (!job) throw notFound('Print job not found')
    const printer = await prisma.printer.findUnique({ where: { id: input.printerId } })
    if (!printer) throw notFound('Printer not found')
    assertProductionTransition(job.status, 'assigned')
    const updated = await prisma.$transaction(async (tx) => {
      await tx.printer.update({ where: { id: printer.id }, data: { status: 'prepared' } })
      return tx.printerJob.update({
        where: { id: job.id },
        data: {
          printerId: printer.id,
          status: 'assigned',
          printDurationMinutes: input.printDurationMinutes,
          spoolNotes: input.spoolNotes,
        },
        include: { printer: true },
      })
    })
    await audit(req, 'print_job.assign', { type: 'print_job', id: job.id }, input)
    res.json({ job: updated })
  } catch (err) {
    next(err)
  }
})

const statusSchema = z.object({ status: z.enum(PRODUCTION_STATUSES) })

/** Production status change, kept in sync with printer status. */
adminProductionRouter.post('/:jobId/status', requirePermission('print-jobs:write'), async (req, res, next) => {
  try {
    const { status } = statusSchema.parse(req.body)
    const job = await prisma.printerJob.findUnique({ where: { id: String(req.params.jobId) } })
    if (!job) throw notFound('Print job not found')
    assertProductionTransition(job.status, status)

    // QC-Gate: kein Versand ohne bestandene (oder bewusst überschriebene) Qualitätsprüfung
    if (status === 'ready_to_ship' && !(await allJobsQcCleared([job.id]))) {
      throw conflict('Print job has not passed quality control — pass QC or use an admin override first')
    }

    const updated = await prisma.$transaction(async (tx) => {
      if (job.printerId) {
        if (status === 'printing') {
          await tx.printer.update({ where: { id: job.printerId }, data: { status: 'printing' } })
        } else if (['printed', 'failed'].includes(status)) {
          await tx.printer.update({ where: { id: job.printerId }, data: { status: 'idle' } })
        }
      }
      return tx.printerJob.update({
        where: { id: job.id },
        data: {
          status,
          startedAt: status === 'printing' ? new Date() : job.startedAt,
          finishedAt: ['printed', 'failed'].includes(status) ? new Date() : job.finishedAt,
          // Reprint: release the printer assignment
          printerId: status === 'reprint_needed' || status === 'waiting' ? null : job.printerId,
        },
        include: { printer: true },
      })
    })
    await audit(req, 'print_job.status', { type: 'print_job', id: job.id }, { from: job.status, to: status })
    res.json({ job: updated })
  } catch (err) {
    next(err)
  }
})

// ---------- Production calendar ----------

const calendarRangeSchema = z.object({
  from: z.string().datetime({ offset: true }),
  to: z.string().datetime({ offset: true }),
})

/**
 * Calendar view: scheduled jobs + maintenance windows overlapping [from, to)
 * plus unscheduled open jobs (sidebar) and per-printer ETA. All UTC — the
 * admin UI converts to the local timezone.
 */
adminProductionRouter.get('/calendar', requirePermission('print-jobs:read'), async (req, res, next) => {
  try {
    const range = calendarRangeSchema.parse({ from: req.query.from, to: req.query.to })
    const from = new Date(range.from)
    const to = new Date(range.to)
    if (to <= from) throw badRequest('to must be after from')

    const [jobs, unscheduledJobs, maintenanceWindows, printers] = await Promise.all([
      prisma.printerJob.findMany({
        where: {
          plannedStartAt: { not: null, lt: to },
          plannedEndAt: { gt: from },
        },
        include: {
          order: { select: { orderNumber: true, status: true } },
          orderItem: { select: { name: true, quantity: true } },
          printer: { select: { id: true, name: true } },
        },
        orderBy: { plannedStartAt: 'asc' },
      }),
      prisma.printerJob.findMany({
        where: { plannedStartAt: null, status: { notIn: ['shipped', 'ready_to_ship'] } },
        include: {
          order: { select: { orderNumber: true, status: true } },
          orderItem: { select: { name: true, quantity: true } },
          printer: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.maintenanceWindow.findMany({
        where: { startsAt: { lt: to }, endsAt: { gt: from } },
        include: { printer: { select: { id: true, name: true } } },
        orderBy: { startsAt: 'asc' },
      }),
      prisma.printer.findMany({ orderBy: { name: 'asc' } }),
    ])
    res.json({ jobs, unscheduledJobs, maintenanceWindows, printers })
  } catch (err) {
    next(err)
  }
})

/**
 * Plan/move a job on the calendar. Overlaps with other scheduled jobs or
 * maintenance windows on the same printer answer 409 with the conflict list;
 * `force: true` books anyway (audited — conscious double-booking).
 */
adminProductionRouter.post('/:jobId/schedule', requirePermission('print-jobs:write'), async (req, res, next) => {
  try {
    const input = jobScheduleSchema.parse(req.body)
    const job = await prisma.printerJob.findUnique({ where: { id: String(req.params.jobId) } })
    if (!job) throw notFound('Print job not found')

    const printerId = input.printerId !== undefined ? input.printerId : job.printerId
    if (!printerId) throw badRequest('A printer is required to schedule a job')
    const printer = await prisma.printer.findUnique({ where: { id: printerId } })
    if (!printer) throw notFound('Printer not found')

    const candidate = { startsAt: input.plannedStartAt, endsAt: input.plannedEndAt }
    const [otherJobs, maintenance] = await Promise.all([
      prisma.printerJob.findMany({
        where: {
          printerId,
          id: { not: job.id },
          plannedStartAt: { not: null },
          plannedEndAt: { not: null },
          status: { notIn: ['shipped'] },
        },
        include: { order: { select: { orderNumber: true } } },
      }),
      prisma.maintenanceWindow.findMany({ where: { printerId } }),
    ])
    const jobConflicts = findOverlaps(candidate, otherJobs.map((j) => ({
      startsAt: j.plannedStartAt as Date,
      endsAt: j.plannedEndAt as Date,
      jobId: j.id,
      orderNumber: j.order.orderNumber,
    })))
    const maintenanceConflicts = findOverlaps(candidate, maintenance.map((m) => ({
      startsAt: m.startsAt,
      endsAt: m.endsAt,
      maintenanceId: m.id,
      title: m.title,
    })))
    if ((jobConflicts.length > 0 || maintenanceConflicts.length > 0) && !input.force) {
      throw conflict('Scheduling conflict on this printer', {
        jobs: jobConflicts,
        maintenance: maintenanceConflicts,
      })
    }

    const updated = await prisma.printerJob.update({
      where: { id: job.id },
      data: {
        printerId,
        plannedStartAt: new Date(input.plannedStartAt),
        plannedEndAt: new Date(input.plannedEndAt),
      },
      include: { printer: { select: { id: true, name: true } } },
    })
    await audit(
      req,
      'print_job.schedule',
      { type: 'print_job', id: job.id },
      {
        printerId,
        plannedStartAt: input.plannedStartAt,
        plannedEndAt: input.plannedEndAt,
        force: input.force,
        conflicts: jobConflicts.length + maintenanceConflicts.length,
      },
    )
    res.json({ job: updated })
  } catch (err) {
    next(err)
  }
})

/** Remove a job from the calendar (keeps printer assignment untouched). */
adminProductionRouter.delete('/:jobId/schedule', requirePermission('print-jobs:write'), async (req, res, next) => {
  try {
    const job = await prisma.printerJob.findUnique({ where: { id: String(req.params.jobId) } })
    if (!job) throw notFound('Print job not found')
    const updated = await prisma.printerJob.update({
      where: { id: job.id },
      data: { plannedStartAt: null, plannedEndAt: null },
    })
    await audit(req, 'print_job.unschedule', { type: 'print_job', id: job.id })
    res.json({ job: updated })
  } catch (err) {
    next(err)
  }
})

// ---------- Maintenance windows ----------

adminProductionRouter.post(
  '/printers/:printerId/maintenance',
  requirePermission('printers:write'),
  async (req, res, next) => {
    try {
      const input = maintenanceWindowSchema.parse(req.body)
      const printer = await prisma.printer.findUnique({ where: { id: String(req.params.printerId) } })
      if (!printer) throw notFound('Printer not found')
      const window = await prisma.maintenanceWindow.create({
        data: {
          printerId: printer.id,
          title: input.title,
          startsAt: new Date(input.startsAt),
          endsAt: new Date(input.endsAt),
          notes: input.notes ?? null,
          createdById: req.user?.id ?? null,
        },
      })
      await audit(req, 'maintenance.create', { type: 'maintenance_window', id: window.id }, input)
      res.status(201).json({ window })
    } catch (err) {
      next(err)
    }
  },
)

adminProductionRouter.delete('/maintenance/:id', requirePermission('printers:write'), async (req, res, next) => {
  try {
    const window = await prisma.maintenanceWindow.findUnique({ where: { id: String(req.params.id) } })
    if (!window) throw notFound('Maintenance window not found')
    await prisma.maintenanceWindow.delete({ where: { id: window.id } })
    await audit(req, 'maintenance.delete', { type: 'maintenance_window', id: window.id })
    res.json({ ok: true })
  } catch (err) {
    next(err)
  }
})
