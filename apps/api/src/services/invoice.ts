import { createWriteStream } from 'node:fs'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import type { Invoice } from '@prisma/client'
import { formatInvoiceNumber } from '@print-shop/utils'
import PDFDocument from 'pdfkit'
import QRCode from 'qrcode'
import { env } from '../env.js'
import { prisma } from '../lib/prisma.js'
import {
  buildEpcQrPayload,
  renderInvoicePdf,
  shouldShowGiroCode,
  type CompanyInfo,
  type OrderForInvoice,
} from './invoice-pdf.js'

/**
 * Creates the invoice row with a sequential, per-year invoice number.
 * The InvoiceCounter row update is atomic (row lock during UPDATE), so
 * concurrent payments cannot produce duplicate numbers.
 */
export async function createInvoiceForOrder(orderId: string): Promise<Invoice> {
  const order = await prisma.order.findUniqueOrThrow({
    where: { id: orderId },
    include: { payments: true },
  })
  const paidPayment = order.payments.find((p) => p.status === 'paid') ?? order.payments[0]
  if (!paidPayment) throw new Error(`Order ${order.orderNumber} has no payment`)

  const year = new Date().getFullYear()
  return prisma.$transaction(async (tx) => {
    const counter = await tx.invoiceCounter.upsert({
      where: { year },
      create: { year, lastSequence: 1 },
      update: { lastSequence: { increment: 1 } },
    })
    const number = formatInvoiceNumber(env.INVOICE_PREFIX, year, counter.lastSequence)
    return tx.invoice.create({
      data: {
        number,
        year,
        sequence: counter.lastSequence,
        orderId: order.id,
        locale: order.locale,
        subtotalCents: order.subtotalCents,
        shippingCents: order.shippingCents,
        totalCents: order.totalCents,
        paymentMethod: paidPayment.method,
      },
    })
  })
}

function companyFromEnv(): CompanyInfo {
  return {
    name: env.COMPANY_NAME,
    street: env.COMPANY_STREET,
    zip: env.COMPANY_ZIP,
    city: env.COMPANY_CITY,
    email: env.COMPANY_EMAIL,
    phone: env.COMPANY_PHONE,
    website: env.COMPANY_WEBSITE,
    taxNumber: env.COMPANY_TAX_NUMBER,
    owner: env.COMPANY_OWNER,
    logoPath: env.INVOICE_LOGO_PATH,
    iban: env.BANK_IBAN,
    bic: env.BANK_BIC,
    accountHolder: env.BANK_ACCOUNT_HOLDER,
    paymentTermsDays: env.PAYMENT_TERMS_DAYS,
    vatExempt: env.COMPANY_VAT_EXEMPT,
  }
}

/** Renders the DIN 5008 invoice PDF into INVOICE_DIR and stores the path. */
export async function generateInvoicePdf(invoice: Invoice, order: OrderForInvoice): Promise<string> {
  await mkdir(env.INVOICE_DIR, { recursive: true })
  const filePath = path.join(env.INVOICE_DIR, `${invoice.number}.pdf`)
  const company = companyFromEnv()

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
      console.warn(`GiroCode generation failed for invoice ${invoice.number}, rendering without QR:`, err)
    }
  }

  const doc = new PDFDocument({ size: 'A4', margin: 0, bufferPages: true })
  const stream = createWriteStream(filePath)
  doc.pipe(stream)
  renderInvoicePdf(doc, { invoice, order, company, qrPng })
  doc.end()
  await new Promise<void>((resolve, reject) => {
    stream.on('finish', () => resolve())
    stream.on('error', reject)
  })

  await prisma.invoice.update({ where: { id: invoice.id }, data: { pdfPath: filePath } })
  return filePath
}
