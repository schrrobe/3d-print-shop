import type { RenderedEmail } from '@print-shop/emails'
import nodemailer from 'nodemailer'
import { env } from '../env.js'
import { prisma } from '../lib/prisma.js'

/** SMTP transport (Brevo: smtp-relay.brevo.com:587) — null in dev mode (no SMTP_HOST). */
const transport = env.SMTP_HOST
  ? nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE,
      auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
    })
  : null

export interface EmailAttachment {
  filename: string
  content: Buffer
}

export interface SendEmailOptions {
  /** Reply-To header, e.g. the ticket+<token> inbound address. */
  replyTo?: string
  /** Blind copy, e.g. invoices to the bookkeeping inbox. */
  bcc?: string
}

/**
 * Sends via SMTP (Brevo) when SMTP_HOST is configured; otherwise logs to the
 * console and the EmailLog table (dev mode). Every attempt is recorded.
 * Never throws; resolves to whether the primary recipient was accepted.
 */
export async function sendEmail(
  to: string,
  template: string,
  rendered: RenderedEmail,
  attachments: EmailAttachment[] = [],
  options: SendEmailOptions = {},
): Promise<boolean> {
  if (!transport) {
    console.info(`[email:dev] to=${to} template=${template} subject="${rendered.subject}"`)
    await prisma.emailLog.create({
      data: {
        to,
        template,
        subject: rendered.subject,
        status: 'dev_logged',
        payload: {
          text: rendered.text,
          attachments: attachments.map((a) => a.filename),
          replyTo: options.replyTo ?? null,
          bcc: options.bcc ?? null,
        },
      },
    })
    return true
  }

  try {
    const info = await transport.sendMail({
      from: env.EMAIL_FROM,
      to,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
      replyTo: options.replyTo,
      bcc: options.bcc,
      attachments: attachments.map((a) => ({ filename: a.filename, content: a.content })),
    })
    // Partial rejection (e.g. only the BCC) resolves instead of throwing — keep it visible.
    const rejected: string[] = info.rejected
    if (rejected.length > 0) {
      console.error(`[email] recipients rejected for template=${template}:`, rejected)
    }
    const delivered = !rejected.includes(to)
    await prisma.emailLog.create({
      data: {
        to,
        template,
        subject: rendered.subject,
        status: delivered ? 'sent' : 'failed',
        error: rejected.length > 0 ? `rejected: ${rejected.join(', ')}` : null,
      },
    })
    return delivered
  } catch (err) {
    console.error(`[email] send failed for template=${template}:`, err)
    await prisma.emailLog.create({
      data: { to, template, subject: rendered.subject, status: 'failed', error: String(err) },
    })
    return false
  }
}
