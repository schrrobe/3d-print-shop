import { randomUUID } from 'node:crypto'
import { createWriteStream } from 'node:fs'
import { mkdir, readFile, rename } from 'node:fs/promises'
import path from 'node:path'
import { renderInvoiceCorrection } from '@print-shop/emails'
import { Prisma, type InvoiceCorrection } from '@prisma/client'
import PDFDocument from 'pdfkit'
import { env } from '../env.js'
import { prisma } from '../lib/prisma.js'
import { nextSequentialNumber } from '../lib/sequential-number.js'
import { company } from './company.js'
import { sendEmail } from './email.js'
import { renderInvoiceCorrectionPdf } from './invoice-correction-pdf.js'
import { orderUrl } from './order-flow.js'

export const INVOICE_CORRECTION_PREFIX = 'RK'

/** Everything the PDF and the email need, loaded in one query. */
const correctionInclude = {
  invoice: true,
  refund: {
    include: { payment: { include: { order: { include: { items: true, payments: true } } } } },
  },
} satisfies Prisma.InvoiceCorrectionInclude
type CorrectionWithContext = Prisma.InvoiceCorrectionGetPayload<{
  include: typeof correctionInclude
}>

/**
 * Issues the Rechnungskorrektur for a succeeded refund (RK-<year>-<hash>, own
 * counter). Idempotent: refundId is unique, a concurrent caller gets the row
 * the winner created.
 */
export async function createInvoiceCorrection(refund: {
  id: string
  amountCents: number
  reason: string | null
  invoice: { id: string; locale: InvoiceCorrection['locale'] }
}): Promise<InvoiceCorrection> {
  const existing = await prisma.invoiceCorrection.findUnique({ where: { refundId: refund.id } })
  if (existing) return existing
  try {
    return await prisma.$transaction(async (tx) => {
      const { number, year, sequence } = await nextSequentialNumber(
        tx.invoiceCorrectionCounter,
        INVOICE_CORRECTION_PREFIX,
      )
      return tx.invoiceCorrection.create({
        data: {
          number,
          year,
          sequence,
          invoiceId: refund.invoice.id,
          refundId: refund.id,
          locale: refund.invoice.locale,
          amountCents: refund.amountCents,
          reason: refund.reason,
        },
      })
    })
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      return prisma.invoiceCorrection.findUniqueOrThrow({ where: { refundId: refund.id } })
    }
    throw err
  }
}

/** Renders the correction PDF into INVOICE_DIR (atomic rename) and stores the path. */
export async function generateInvoiceCorrectionPdf(correctionId: string): Promise<string> {
  const c = await loadCorrection(correctionId)
  await mkdir(env.INVOICE_DIR, { recursive: true })
  const filePath = path.join(env.INVOICE_DIR, `${c.number}.pdf`)
  const tmpPath = `${filePath}.${randomUUID()}.tmp`
  const doc = new PDFDocument({ size: 'A4', margin: 0, bufferPages: true })
  const stream = createWriteStream(tmpPath)
  doc.pipe(stream)
  renderInvoiceCorrectionPdf(doc, {
    correction: c,
    invoice: c.invoice,
    order: c.refund.payment.order,
    company: { ...company(), paymentTermsDays: env.PAYMENT_TERMS_DAYS },
    provider: c.refund.provider,
  })
  doc.end()
  await new Promise<void>((resolve, reject) => {
    stream.on('finish', () => resolve())
    stream.on('error', reject)
  })
  await rename(tmpPath, filePath)
  await prisma.invoiceCorrection.update({ where: { id: c.id }, data: { pdfPath: filePath } })
  return filePath
}

const SEND_LEASE_MS = 5 * 60_000

export type CorrectionSendResult = 'sent' | 'failed' | 'busy'

/**
 * Mails the correction PDF to the customer, CAS-leased like invoices: exactly
 * one concurrent caller sends, sentAt is set only after delivery.
 * `resend` (admin action) also mails an already sent correction.
 */
export async function sendInvoiceCorrectionEmail(
  correctionId: string,
  { resend = false } = {},
): Promise<CorrectionSendResult> {
  const now = new Date()
  const claim = await prisma.invoiceCorrection.updateMany({
    where: {
      id: correctionId,
      ...(resend ? {} : { sentAt: null }),
      OR: [{ sendLockUntil: null }, { sendLockUntil: { lt: now } }],
    },
    data: { sendLockUntil: new Date(now.getTime() + SEND_LEASE_MS) },
  })
  if (claim.count !== 1) return 'busy'

  let delivered = false
  try {
    const c = await loadCorrection(correctionId)
    const order = c.refund.payment.order
    const pdfPath = c.pdfPath ?? (await generateInvoiceCorrectionPdf(c.id))
    const pdf = await readFile(pdfPath)
    delivered = await sendEmail(
      order.email,
      'invoice_correction',
      renderInvoiceCorrection(
        {
          orderNumber: order.orderNumber,
          invoiceNumber: c.invoice.number,
          correctionNumber: c.number,
          amountCents: c.amountCents,
          provider: c.refund.provider,
          orderUrl: orderUrl(order),
        },
        order.locale,
      ),
      [{ filename: `${c.number}.pdf`, content: pdf }],
      { bcc: company().invoiceBcc || undefined },
    )
  } finally {
    await prisma.invoiceCorrection.update({
      where: { id: correctionId },
      data: delivered ? { sendLockUntil: null, sentAt: new Date() } : { sendLockUntil: null },
    })
  }
  return delivered ? 'sent' : 'failed'
}

function loadCorrection(id: string): Promise<CorrectionWithContext> {
  return prisma.invoiceCorrection.findUniqueOrThrow({ where: { id }, include: correctionInclude })
}
