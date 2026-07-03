import type { RenderedEmail } from '@print-shop/emails'
import { Resend } from 'resend'
import { env } from '../env.js'
import { prisma } from '../lib/prisma.js'

/** Shared Resend client — null in dev mode (no key). Also used by the inbound webhook. */
export const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null

export interface EmailAttachment {
  filename: string
  content: Buffer
}

export interface SendEmailOptions {
  /** Reply-To header, e.g. the ticket+<token> inbound address. */
  replyTo?: string
}

/**
 * Sends via Resend when RESEND_API_KEY is configured; otherwise logs to the
 * console and the EmailLog table (dev mode). Every attempt is recorded.
 */
export async function sendEmail(
  to: string,
  template: string,
  rendered: RenderedEmail,
  attachments: EmailAttachment[] = [],
  options: SendEmailOptions = {},
): Promise<void> {
  if (!resend) {
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
    await resend.emails.send({
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
