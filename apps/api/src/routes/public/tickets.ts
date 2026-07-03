import { renderTicketCreated, renderTicketCustomerReply } from '@print-shop/emails'
import { formatInvoiceNumber, nextInvoiceSequence, statusAfterCustomerReply } from '@print-shop/utils'
import { ticketCreateSchema, ticketMessageSchema } from '@print-shop/validators'
import { Router } from 'express'
import { env } from '../../env.js'
import { prisma } from '../../lib/prisma.js'
import { randomToken } from '../../lib/tokens.js'
import { conflict, notFound } from '../../middleware/error.js'
import { sensitiveLimiter } from '../../middleware/rate-limit.js'
import { sendEmail } from '../../services/email.js'

export const ticketsRouter = Router()

/**
 * Creates a support ticket (guest access via returned token).
 * An order is only linked when the order number exists AND its email matches —
 * otherwise the ticket is created unlinked (no order/email enumeration via 4xx).
 */
ticketsRouter.post('/', sensitiveLimiter, async (req, res, next) => {
  try {
    const input = ticketCreateSchema.parse(req.body)

    let orderId: string | null = null
    if (input.orderNumber) {
      const order = await prisma.order.findUnique({
        where: { orderNumber: input.orderNumber },
        select: { id: true, email: true },
      })
      if (order && order.email.toLowerCase() === input.email.toLowerCase()) {
        orderId = order.id
      }
    }

    const accessToken = randomToken(32)
    const ticket = await prisma.$transaction(async (tx) => {
      const year = new Date().getFullYear()
      const existing = await tx.ticketCounter.findUnique({ where: { year } })
      const nextSeq = nextInvoiceSequence(existing, year)
      await tx.ticketCounter.upsert({
        where: { year: nextSeq.year },
        create: { year: nextSeq.year, lastSequence: nextSeq.sequence },
        update: { lastSequence: nextSeq.sequence },
      })
      return tx.ticket.create({
        data: {
          ticketNumber: formatInvoiceNumber('TIC', nextSeq.year, nextSeq.sequence),
          accessToken,
          subject: input.subject,
          category: input.category,
          name: input.name,
          email: input.email,
          locale: input.locale,
          orderId,
          messages: { create: [{ authorType: 'customer', body: input.message }] },
        },
      })
    })

    const ticketUrl = `${env.WEB_URL}/support/ticket/${accessToken}`
    await sendEmail(
      input.email,
      'ticket_created',
      renderTicketCreated(
        { name: input.name, ticketNumber: ticket.ticketNumber, subject: input.subject, ticketUrl },
        input.locale,
      ),
    )

    res.status(201).json({
      ticketNumber: ticket.ticketNumber,
      accessToken,
      orderLinked: orderId !== null,
    })
  } catch (err) {
    next(err)
  }
})

/** Public ticket thread for the customer (token from the confirmation email). */
ticketsRouter.get('/:token', async (req, res, next) => {
  try {
    const ticket = await prisma.ticket.findUnique({
      where: { accessToken: String(req.params.token) },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
          include: { user: { select: { name: true } } },
        },
        order: { select: { orderNumber: true } },
      },
    })
    if (!ticket) throw notFound('Ticket not found')
    res.json({
      ticket: {
        ticketNumber: ticket.ticketNumber,
        status: ticket.status,
        category: ticket.category,
        subject: ticket.subject,
        orderNumber: ticket.order?.orderNumber ?? null,
        createdAt: ticket.createdAt,
        messages: ticket.messages.map((m) => ({
          id: m.id,
          authorType: m.authorType,
          authorName: m.authorType === 'staff' ? (m.user?.name ?? null) : null,
          body: m.body,
          createdAt: m.createdAt,
        })),
      },
    })
  } catch (err) {
    next(err)
  }
})

/** Customer reply — reopens waiting/resolved tickets, rejected once closed. */
ticketsRouter.post('/:token/messages', sensitiveLimiter, async (req, res, next) => {
  try {
    const input = ticketMessageSchema.parse(req.body)
    const ticket = await prisma.ticket.findUnique({
      where: { accessToken: String(req.params.token) },
      include: { assignedTo: { select: { email: true } } },
    })
    if (!ticket) throw notFound('Ticket not found')

    const nextStatus = statusAfterCustomerReply(ticket.status)
    if (nextStatus === null) throw conflict('Ticket is closed')

    await prisma.$transaction([
      prisma.ticketMessage.create({
        data: { ticketId: ticket.id, authorType: 'customer', body: input.body },
      }),
      prisma.ticket.update({
        where: { id: ticket.id },
        data: { status: nextStatus, resolvedAt: nextStatus === 'in_progress' ? null : undefined },
      }),
    ])

    await sendEmail(
      ticket.assignedTo?.email ?? env.ADMIN_NOTIFICATION_EMAIL,
      'ticket_customer_reply',
      renderTicketCustomerReply(
        {
          ticketNumber: ticket.ticketNumber,
          subject: ticket.subject,
          adminUrl: `${env.WEB_URL}/admin/tickets/${ticket.id}`,
        },
        'de',
      ),
    )

    res.status(201).json({ ok: true, status: nextStatus })
  } catch (err) {
    next(err)
  }
})
