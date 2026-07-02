import { createWriteStream } from 'node:fs'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import type { Invoice, Order, OrderItem } from '@prisma/client'
import { formatCents, formatInvoiceNumber } from '@print-shop/utils'
import PDFDocument from 'pdfkit'
import { env } from '../env.js'
import { prisma } from '../lib/prisma.js'

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

const PAYMENT_METHOD_LABELS: Record<string, { de: string; en: string }> = {
  stripe: { de: 'Kartenzahlung (Stripe)', en: 'Card payment (Stripe)' },
  stripe_payment_link: { de: 'Zahlungslink (Stripe)', en: 'Payment link (Stripe)' },
  bank_transfer: { de: 'Banküberweisung', en: 'Bank transfer' },
  bitcoin: { de: 'Bitcoin', en: 'Bitcoin' },
}

/** Renders the invoice PDF to INVOICE_DIR and stores the path on the invoice. */
export async function generateInvoicePdf(
  invoice: Invoice,
  order: Order & { items: OrderItem[] },
): Promise<string> {
  await mkdir(env.INVOICE_DIR, { recursive: true })
  const filePath = path.join(env.INVOICE_DIR, `${invoice.number}.pdf`)
  const de = invoice.locale === 'de'
  const t = (deText: string, enText: string) => (de ? deText : enText)

  const doc = new PDFDocument({ size: 'A4', margin: 50 })
  const stream = createWriteStream(filePath)
  doc.pipe(stream)

  doc.fontSize(18).text('Print Shop', { continued: false })
  doc.fontSize(9).fillColor('#5e5e5e').text('Print Shop GmbH · Musterstraße 1 · 12345 Berlin')
  doc.moveDown(2)

  doc.fillColor('#000000').fontSize(14).text(t('Rechnung', 'Invoice') + ` ${invoice.number}`)
  doc.fontSize(10)
  doc.text(t('Rechnungsdatum', 'Invoice date') + `: ${invoice.issuedAt.toISOString().slice(0, 10)}`)
  doc.text(t('Bestellnummer', 'Order number') + `: ${order.orderNumber}`)
  doc.moveDown()

  doc.text(`${order.firstName} ${order.lastName}`)
  if (order.company) doc.text(order.company)
  doc.text(order.street)
  doc.text(`${order.zip} ${order.city}, ${order.country}`)
  doc.moveDown(2)

  doc.fontSize(11).text(t('Positionen', 'Line items'), { underline: true })
  doc.moveDown(0.5)
  doc.fontSize(10)
  for (const item of order.items) {
    doc.text(
      `${item.quantity}× ${item.name} — ${formatCents(item.unitPriceCents * item.quantity, invoice.locale)}`,
    )
  }
  doc.moveDown()
  doc.text(t('Zwischensumme', 'Subtotal') + `: ${formatCents(invoice.subtotalCents, invoice.locale)}`)
  doc.text(t('Versandkosten', 'Shipping') + `: ${formatCents(invoice.shippingCents, invoice.locale)}`)
  doc
    .fontSize(12)
    .text(t('Gesamtbetrag', 'Total') + `: ${formatCents(invoice.totalCents, invoice.locale)}`, {
      // bold not available without extra font — size is the emphasis
    })
  doc.moveDown()
  const methodLabel = PAYMENT_METHOD_LABELS[invoice.paymentMethod] ?? { de: invoice.paymentMethod, en: invoice.paymentMethod }
  doc.fontSize(10).text(t('Zahlungsart', 'Payment method') + `: ${de ? methodLabel.de : methodLabel.en}`)
  doc.moveDown(2)
  doc
    .fontSize(8)
    .fillColor('#5e5e5e')
    .text(
      t(
        'Hinweis: Umsatzsteuerangaben sind Platzhalter und vor dem Produktivbetrieb zu ergänzen.',
        'Note: VAT details are placeholders and must be completed before going live.',
      ),
    )

  doc.end()
  await new Promise<void>((resolve, reject) => {
    stream.on('finish', () => resolve())
    stream.on('error', reject)
  })

  await prisma.invoice.update({ where: { id: invoice.id }, data: { pdfPath: filePath } })
  return filePath
}
