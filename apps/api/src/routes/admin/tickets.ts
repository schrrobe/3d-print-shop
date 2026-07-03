import { renderTicketReply } from '@print-shop/emails'
import { assertTicketTransition, statusAfterStaffReply } from '@print-shop/utils'
import { ticketMessageSchema, ticketStatusSchema, ticketUpdateSchema } from '@print-shop/validators'
import { Router } from 'express'
import { env } from '../../env.js'
import { audit } from '../../lib/audit.js'
import { prisma } from '../../lib/prisma.js'
import { requirePermission } from '../../middleware/auth.js'
import { badRequest, conflict, notFound } from '../../middleware/error.js'
import { sendEmail } from '../../services/email.js'
import { ticketReplyToAddress } from '../../services/ticket.js'

export const adminTicketsRouter = Router()

adminTicketsRouter.get('/', requirePermission('tickets:read'), async (req, res, next) => {
  try {
    const status = req.query.status ? String(req.query.status) : undefined
    const priority = req.query.priority ? String(req.query.priority) : undefined
    const assignedToId = req.query.assignedToId ? String(req.query.assignedToId) : undefined
    const tickets = await prisma.ticket.findMany({
      where: {
        ...(status ? { status: status as never } : {}),
        ...(priority ? { priority: priority as never } : {}),
        ...(assignedToId ? { assignedToId } : {}),
      },
      include: {
        order: { select: { orderNumber: true } },
        assignedTo: { select: { id: true, name: true } },
        _count: { select: { messages: true } },
      },
      orderBy: { createdAt: 'desc' },
    })
    res.json({ tickets })
  } catch (err) {
    next(err)
  }
})

/** Assignable staff (support + admin). Own route: support lacks users:read. */
adminTicketsRouter.get('/assignees', requirePermission('tickets:read'), async (_req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      where: { active: true, role: { name: { in: ['support', 'admin'] } } },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    })
    res.json({ users })
  } catch (err) {
    next(err)
  }
})

adminTicketsRouter.get('/:id', requirePermission('tickets:read'), async (req, res, next) => {
  try {
    const ticket = await prisma.ticket.findUnique({
      where: { id: String(req.params.id) },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
          include: { user: { select: { name: true } } },
        },
        order: { select: { id: true, orderNumber: true, status: true } },
        assignedTo: { select: { id: true, name: true } },
      },
    })
    if (!ticket) throw notFound('Ticket not found')
    res.json({ ticket })
  } catch (err) {
    next(err)
  }
})

adminTicketsRouter.post('/:id/messages', requirePermission('tickets:write'), async (req, res, next) => {
  try {
    const input = ticketMessageSchema.parse(req.body)
    const ticket = await prisma.ticket.findUnique({ where: { id: String(req.params.id) } })
    if (!ticket) throw notFound('Ticket not found')
    if (ticket.status === 'closed') throw conflict('Ticket is closed')

    const nextStatus = statusAfterStaffReply(ticket.status)
    await prisma.$transaction([
      prisma.ticketMessage.create({
        data: {
          ticketId: ticket.id,
          authorType: 'staff',
          userId: req.user?.id,
          body: input.body,
        },
      }),
      prisma.ticket.update({ where: { id: ticket.id }, data: { status: nextStatus } }),
    ])

    await sendEmail(
      ticket.email,
      'ticket_reply',
      renderTicketReply(
        {
          name: ticket.name,
          ticketNumber: ticket.ticketNumber,
          ticketUrl: `${env.WEB_URL}/support/ticket/${ticket.accessToken}`,
        },
        ticket.locale,
      ),
      [],
      { replyTo: ticketReplyToAddress(ticket.accessToken) },
    )
    await audit(req, 'ticket.reply', { type: 'ticket', id: ticket.id }, { status: nextStatus })
    res.status(201).json({ ok: true, status: nextStatus })
  } catch (err) {
    next(err)
  }
})

adminTicketsRouter.post('/:id/status', requirePermission('tickets:write'), async (req, res, next) => {
  try {
    const { status } = ticketStatusSchema.parse(req.body)
    const existing = await prisma.ticket.findUnique({ where: { id: String(req.params.id) } })
    if (!existing) throw notFound('Ticket not found')
    assertTicketTransition(existing.status, status)

    const ticket = await prisma.ticket.update({
      where: { id: existing.id },
      data: {
        status,
        resolvedAt: status === 'resolved' ? new Date() : existing.resolvedAt,
        closedAt: status === 'closed' ? new Date() : null,
      },
    })
    await audit(
      req,
      'ticket.status',
      { type: 'ticket', id: ticket.id },
      { from: existing.status, to: status },
    )
    res.json({ ticket })
  } catch (err) {
    next(err)
  }
})

adminTicketsRouter.patch('/:id', requirePermission('tickets:write'), async (req, res, next) => {
  try {
    const input = ticketUpdateSchema.parse(req.body)
    const existing = await prisma.ticket.findUnique({ where: { id: String(req.params.id) } })
    if (!existing) throw notFound('Ticket not found')

    if (input.assignedToId) {
      const assignee = await prisma.user.findFirst({
        where: { id: input.assignedToId, active: true },
      })
      if (!assignee) throw badRequest('Assignee not found or inactive')
    }

    const ticket = await prisma.ticket.update({
      where: { id: existing.id },
      data: {
        ...(input.priority ? { priority: input.priority } : {}),
        ...(input.category ? { category: input.category } : {}),
        ...(input.assignedToId !== undefined ? { assignedToId: input.assignedToId } : {}),
      },
      include: { assignedTo: { select: { id: true, name: true } } },
    })
    await audit(req, 'ticket.update', { type: 'ticket', id: ticket.id }, input)
    res.json({ ticket })
  } catch (err) {
    next(err)
  }
})
