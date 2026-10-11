import type { RenderedEmail } from '@print-shop/emails'
import { Resend } from 'resend'
import { env } from '../env.js'
import { prisma } from '../lib/prisma.js'

/** Resend client — only used by the inbound ticket-reply webhook; outbound mail goes via Brevo. */
export const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null

/** 'Print Shop <noreply@x.de>' → { name, email }; a bare address → { email }. */
function parseAddress(value: string): { name?: string; email: string } {
  const match = /^\s*(.*?)\s*<([^>]+)>\s*$/.exec(value)
  return match?.[2] ? { name: match[1] || undefined, email: match[2] } : { email: value.trim() }
}

export interface EmailAttachment {
  filename: string
  content: Buffer
}

export interface SendEmailOptions {
  /** Reply-To header, e.g. the ticket+<token> inbound address. */
  replyTo?: string
}

/**
 * Sends via Brevo when BREVO_API_KEY is configured; otherwise logs to the
 * console and the EmailLog table (dev mode). Every attempt is recorded.
 */
export async function sendEmail(
  to: string,
  template: string,
  rendered: RenderedEmail,
  attachments: EmailAttachment[] = [],
  options: SendEmailOptions = {},
): Promise<void> {
  if (!env.BREVO_API_KEY) {
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
    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': env.BREVO_API_KEY,
        'content-type': 'application/json',
        accept: 'application/json',
      },
      body: JSON.stringify({
        sender: parseAddress(env.EMAIL_FROM),
        to: [{ email: to }],
        subject: rendered.subject,
        htmlContent: rendered.html,
        textContent: rendered.text,
        replyTo: options.replyTo ? { email: options.replyTo } : undefined,
        attachment: attachments.length
          ? attachments.map((a) => ({ name: a.filename, content: a.content.toString('base64') }))
          : undefined,
      }),
    })
    // fetch does not throw on HTTP errors — surface them so they are logged as failed.
    if (!res.ok) throw new Error(`Brevo ${res.status}: ${await res.text()}`)
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
