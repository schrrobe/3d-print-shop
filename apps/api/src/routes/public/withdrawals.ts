import { renderWithdrawalReceived } from '@print-shop/emails'
import { withdrawalSchema } from '@print-shop/validators'
import { Router } from 'express'
import { prisma } from '../../lib/prisma.js'
import { randomToken } from '../../lib/tokens.js'
import { sensitiveLimiter } from '../../middleware/rate-limit.js'
import { sendEmail } from '../../services/email.js'
import { allocateTicketNumber, ticketReplyToAddress } from '../../services/ticket.js'

export const withdrawalsRouter = Router()

/**
 * Electronic withdrawal function (§ 356a BGB). Every declaration is accepted
 * and filed as a high-priority support ticket — the order is only linked when
 * number AND email match (no enumeration). The customer gets the receipt
 * confirmation with declaration + date/time (§ 356a Abs. 4).
 */
withdrawalsRouter.post('/', sensitiveLimiter, async (req, res, next) => {
  try {
    const input = withdrawalSchema.parse(req.body)

    const order = await prisma.order.findUnique({
      where: { orderNumber: input.orderNumber },
      select: { id: true, email: true },
    })
    const orderId =
      order && order.email.toLowerCase() === input.email.toLowerCase() ? order.id : null

    const receivedAt = new Date()
    const body = [
      `Widerrufserklärung über die Widerrufsfunktion (§ 356a BGB), Eingang ${receivedAt.toISOString()}`,
      `Bestellnummer: ${input.orderNumber}`,
      `Widerrufen: ${input.items || 'gesamte Bestellung'}`,
      ...(input.message ? [`Nachricht: ${input.message}`] : []),
      ...(orderId
        ? []
        : [
            'Hinweis: Bestellnummer und E-Mail passen zu keiner Bestellung, bitte manuell zuordnen.',
          ]),
    ].join('\n')

    const accessToken = randomToken(32)
    const ticket = await prisma.$transaction(async (tx) =>
      tx.ticket.create({
        data: {
          ticketNumber: await allocateTicketNumber(tx),
          accessToken,
          subject: `Widerruf Bestellung ${input.orderNumber}`,
          category: 'order',
          priority: 'high',
          name: input.name,
          email: input.email,
          locale: input.locale,
          orderId,
          createdAt: receivedAt,
          messages: { create: [{ authorType: 'customer', body, createdAt: receivedAt }] },
        },
      }),
    )

    // Free-text message stays in the ticket only: the endpoint is unauthenticated,
    // so echoing arbitrary text to arbitrary addresses would make it a spam relay.
    await sendEmail(
      input.email,
      'withdrawal_received',
      renderWithdrawalReceived(
        { ...input, message: undefined, receivedAt, ticketNumber: ticket.ticketNumber },
        input.locale,
      ),
      [],
      { replyTo: ticketReplyToAddress(accessToken) },
    )

    res.status(201).json({ ticketNumber: ticket.ticketNumber, receivedAt })
  } catch (err) {
    next(err)
  }
})
