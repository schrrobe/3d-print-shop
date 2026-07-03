import type { Prisma, TicketStatus } from '@prisma/client'
import { renderTicketCustomerReply } from '@print-shop/emails'
import {
  extractReplyText,
  isAutoReply,
  parseTicketReplyAddress,
  statusAfterCustomerReply,
} from '@print-shop/utils'
import { env } from '../env.js'
import { prisma } from '../lib/prisma.js'
import { sendEmail } from './email.js'

/** Max body length — mirrors ticketMessageSchema (inbound mail bypasses zod). */
const MAX_BODY_LENGTH = 4000

interface TicketForReply {
  id: string
  status: TicketStatus
  ticketNumber: string
  subject: string
  assignedTo: { email: string } | null
}

/** Reply-To address for outgoing ticket emails; undefined while the feature is off. */
export function ticketReplyToAddress(accessToken: string): string | undefined {
  return env.TICKET_REPLY_DOMAIN ? `ticket+${accessToken}@${env.TICKET_REPLY_DOMAIN}` : undefined
}

/**
 * Appends a customer message, applies the reply status automation and
 * notifies the assignee (fallback: admin address).
 * Returns the new status, or null when the ticket is closed (no write).
 */
export async function addCustomerReply(
  ticket: TicketForReply,
  body: string,
  opts: { inboundEmailId?: string } = {},
): Promise<TicketStatus | null> {
  const nextStatus = statusAfterCustomerReply(ticket.status)
  if (nextStatus === null) return null

  await prisma.$transaction([
    prisma.ticketMessage.create({
      data: {
        ticketId: ticket.id,
        authorType: 'customer',
        body,
        inboundEmailId: opts.inboundEmailId,
      },
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

  return nextStatus
}

export type InboundResult =
  | { outcome: 'created'; ticketId: string; status: TicketStatus }
  | {
      outcome: 'skipped'
      reason:
        | 'no_token'
        | 'ticket_not_found'
        | 'auto_reply'
        | 'empty_body'
        | 'ticket_closed'
        | 'duplicate'
    }

/** Very rough HTML→text fallback for mails without a plain-text part. */
function stripHtmlNaive(html: string): string {
  return html
    .replace(/<(style|script)[\s\S]*?<\/\1>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|tr|h[1-6]|blockquote)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
}

/** Full inbound pipeline shared by the Resend webhook and the dev simulator. */
export async function processInboundTicketEmail(input: {
  to: string[]
  text: string | null
  html?: string | null
  headers?: Record<string, string>
  inboundEmailId?: string
  replyDomain: string
}): Promise<InboundResult> {
  const token = parseTicketReplyAddress(input.to, input.replyDomain)
  if (!token) return { outcome: 'skipped', reason: 'no_token' }

  const include = { assignedTo: { select: { email: true } } } as const
  const ticket =
    (await prisma.ticket.findUnique({ where: { accessToken: token }, include })) ??
    // Some MTAs lowercase the local part; 43-char tokens make collisions negligible.
    (await prisma.ticket.findFirst({
      where: { accessToken: { equals: token, mode: 'insensitive' } },
      include,
    }))
  if (!ticket) return { outcome: 'skipped', reason: 'ticket_not_found' }

  if (isAutoReply(input.headers ?? {})) return { outcome: 'skipped', reason: 'auto_reply' }

  const raw = input.text ?? (input.html ? stripHtmlNaive(input.html) : '')
  const extracted = extractReplyText(raw ?? '')
  if (!extracted) return { outcome: 'skipped', reason: 'empty_body' }

  try {
    const status = await addCustomerReply(ticket, extracted.slice(0, MAX_BODY_LENGTH), {
      inboundEmailId: input.inboundEmailId,
    })
    if (status === null) return { outcome: 'skipped', reason: 'ticket_closed' }
    return { outcome: 'created', ticketId: ticket.id, status }
  } catch (err) {
    // Unique violation on inboundEmailId → webhook retry already processed this mail.
    if ((err as Prisma.PrismaClientKnownRequestError)?.code === 'P2002') {
      return { outcome: 'skipped', reason: 'duplicate' }
    }
    throw err
  }
}
