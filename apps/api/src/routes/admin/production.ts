import { PRODUCTION_STATUSES } from '@print-shop/types'
import { assertProductionTransition, calcPrinterEtaMs } from '@print-shop/utils'
import { printJobAssignSchema } from '@print-shop/validators'
import { Router } from 'express'
import { z } from 'zod'
import { audit } from '../../lib/audit.js'
import { prisma } from '../../lib/prisma.js'
import { requirePermission } from '../../middleware/auth.js'
import { notFound } from '../../middleware/error.js'

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
