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
}

/**
 * Sends via SMTP (Brevo) when SMTP_HOST is configured; otherwise logs to the
 * console and the EmailLog table (dev mode). Every attempt is recorded.
 */
export async function sendEmail(
  to: string,
  template: string,
  rendered: RenderedEmail,
  attachments: EmailAttachment[] = [],
  options: SendEmailOptions = {},
): Promise<void> {
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
        },
      },
    })
    return
  }

  try {
    await transport.sendMail({
      from: env.EMAIL_FROM,
      to,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
      replyTo: options.replyTo,
      attachments: attachments.map((a) => ({ filename: a.filename, content: a.content })),
    })
    await prisma.emailLog.create({
      data: { to, template, subject: rendered.subject, status: 'sent' },
    })
  } catch (err) {
    console.error(`[email] send failed for template=${template}:`, err)
    await prisma.emailLog.create({
      data: { to, template, subject: rendered.subject, status: 'failed', error: String(err) },
    })
  }
}
