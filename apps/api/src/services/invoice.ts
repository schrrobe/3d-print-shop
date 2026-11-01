import { randomUUID } from 'node:crypto'
import { createWriteStream } from 'node:fs'
import { mkdir, rename } from 'node:fs/promises'
import path from 'node:path'
import { Prisma, type Invoice } from '@prisma/client'
import PDFDocument from 'pdfkit'
import QRCode from 'qrcode'
import { env } from '../env.js'
import { prisma } from '../lib/prisma.js'
import { nextSequentialNumber } from '../lib/sequential-number.js'
import { company } from './company.js'
import {
  buildEpcQrPayload,
  renderInvoicePdf,
  shouldShowGiroCode,
  type CompanyInfo,
  type OrderForInvoice,
} from './invoice-pdf.js'

/**
 * Creates the invoice row with an obfuscated per-year invoice number.
 * The InvoiceCounter row update is atomic (row lock during UPDATE), so
 * concurrent payments cannot produce duplicate numbers.
 */
export async function createInvoiceForOrder(orderId: string): Promise<Invoice> {
  const order = await prisma.order.findUniqueOrThrow({
    where: { id: orderId },
    include: { payments: true },
  })
  const existing = await prisma.invoice.findUnique({ where: { orderId } })
  if (existing) return existing
  const paidPayment = order.payments.find((p) => p.status === 'paid') ?? order.payments[0]
  if (!paidPayment) throw new Error(`Order ${order.orderNumber} has no payment`)

  try {
    return await prisma.$transaction(async (tx) => {
      const { number, year, sequence } = await nextSequentialNumber(
        tx.invoiceCounter,
        env.INVOICE_PREFIX,
      )
      return tx.invoice.create({
        data: {
          number,
          year,
          sequence,
          orderId: order.id,
          locale: order.locale,
          subtotalCents: order.subtotalCents,
          shippingCents: order.shippingCents,
          discountCents: order.discountCents,
          totalCents: order.totalCents,
          paymentMethod: paidPayment.method,
        },
      })
    })
  } catch (err) {
    // Concurrent payment reconciliation may have created the order's unique invoice.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      return prisma.invoice.findUniqueOrThrow({ where: { orderId } })
    }
    throw err
  }
}

function invoiceCompany(): CompanyInfo {
  return {
    ...company(),
    paymentTermsDays: env.PAYMENT_TERMS_DAYS,
  }
}

/** Renders the DIN 5008 invoice PDF into INVOICE_DIR and stores the path. */
export async function generateInvoicePdf(
  invoice: Invoice,
  order: OrderForInvoice,
): Promise<string> {
  await mkdir(env.INVOICE_DIR, { recursive: true })
  const filePath = path.join(env.INVOICE_DIR, `${invoice.number}.pdf`)
  const company = invoiceCompany()

  let qrPng: Buffer | undefined
  if (shouldShowGiroCode(invoice, order.payments)) {
    try {
      qrPng = await QRCode.toBuffer(
        buildEpcQrPayload({
          bic: company.bic,
          name: company.accountHolder,
          iban: company.iban,
          amountCents: invoice.totalCents,
          reference: invoice.number,
        }),
        // EPC quick-response codes require error correction level M
        { type: 'png', errorCorrectionLevel: 'M', margin: 0, scale: 4 },
      )
    } catch (err) {
      console.warn(
        `GiroCode generation failed for invoice ${invoice.number}, rendering without QR:`,
        err,
      )
    }
  }

  // Render to a temp file and rename (atomic): concurrent renders of the same
  // invoice (checkout replay, payment retry, download) never expose a
  // half-written PDF to a reader or an email attachment.
  const tmpPath = `${filePath}.${randomUUID()}.tmp`
  const doc = new PDFDocument({ size: 'A4', margin: 0, bufferPages: true })
  const stream = createWriteStream(tmpPath)
  doc.pipe(stream)
  renderInvoicePdf(doc, { invoice, order, company, qrPng })
  doc.end()
  await new Promise<void>((resolve, reject) => {
    stream.on('finish', () => resolve())
    stream.on('error', reject)
  })
  await rename(tmpPath, filePath)

  await prisma.invoice.update({ where: { id: invoice.id }, data: { pdfPath: filePath } })
  return filePath
}
