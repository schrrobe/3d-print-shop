import { renderAdminNotification, renderWithdrawalReceived } from '@print-shop/emails'
import { withdrawalSchema } from '@print-shop/validators'
import { Router } from 'express'
import { env } from '../../env.js'
import { prisma } from '../../lib/prisma.js'
import { randomToken } from '../../lib/tokens.js'
import { sensitiveLimiter } from '../../middleware/rate-limit.js'
import { sendEmail } from '../../services/email.js'
import { allocateTicketNumber, ticketReplyToAddress } from '../../services/ticket.js'

export const withdrawalsRouter = Router()

const BERLIN_DATE_TIME = new Intl.DateTimeFormat('de-DE', {
  dateStyle: 'long',
  timeStyle: 'medium',
  timeZone: 'Europe/Berlin',
})

/**
 * § 356a BGB "Widerruf bestätigen": stores the declaration as a `withdrawal`
 * ticket (staff handle it in the existing ticket inbox) and sends the receipt
 * with content + date/time of receipt. Every declaration is accepted — even
 * with an unknown order number — because a typo must not swallow a timely
 * withdrawal; the order is only linked when number AND email match.
 */
withdrawalsRouter.post('/', sensitiveLimiter, async (req, res, next) => {
  try {
    const input = withdrawalSchema.parse(req.body)
    const receivedAt = new Date()

    const order = await prisma.order.findUnique({
      where: { orderNumber: input.orderNumber },
      select: { id: true, email: true },
    })
    const orderId =
      order && order.email.toLowerCase() === input.email.toLowerCase() ? order.id : null

    const scope = input.items || 'gesamter Vertrag'
    const accessToken = randomToken(32)
    const ticket = await prisma.$transaction(async (tx) =>
      tx.ticket.create({
        data: {
          ticketNumber: await allocateTicketNumber(tx),
          accessToken,
          subject: `Widerruf Bestellung ${input.orderNumber}`,
          category: 'withdrawal',
          priority: 'high',
          name: input.name,
          email: input.email,
          locale: input.locale,
          orderId,
          createdAt: receivedAt,
          messages: {
            create: [
              {
                authorType: 'customer',
                body: `Hiermit widerrufe ich den Vertrag zur Bestellung ${input.orderNumber}.\nWiderrufen: ${scope}\nEingang (Widerrufsfunktion § 356a BGB): ${receivedAt.toISOString()}`,
              },
            ],
          },
        },
      }),
    )

    await sendEmail(
      input.email,
      'withdrawal_received',
      renderWithdrawalReceived(
        {
          name: input.name,
          orderNumber: input.orderNumber,
          email: input.email,
          items: input.items,
          ticketNumber: ticket.ticketNumber,
          receivedAt: BERLIN_DATE_TIME.format(receivedAt),
        },
        input.locale,
      ),
      [],
      { replyTo: ticketReplyToAddress(accessToken) },
    )
    await sendEmail(
      env.ADMIN_NOTIFICATION_EMAIL,
      'admin_notification',
      renderAdminNotification(
        {
          event: 'Widerruf eingegangen',
          detail: `${ticket.ticketNumber} — Bestellung ${input.orderNumber}${orderId ? '' : ' (nicht zugeordnet: Nummer/E-Mail passen nicht)'} — ${scope}`,
          adminUrl: `${env.WEB_URL}/admin/tickets/${ticket.id}`,
        },
        'de',
      ),
    )

    res
      .status(201)
      .json({ ticketNumber: ticket.ticketNumber, receivedAt: receivedAt.toISOString() })
  } catch (err) {
    next(err)
  }
})
