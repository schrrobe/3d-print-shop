import type { Invoice, InvoiceCorrection, PaymentMethod, RefundProvider } from '@prisma/client'
import { formatCents } from '@print-shop/utils'
import {
  cell,
  COLS,
  drawHead,
  drawNotes,
  drawTableHeader,
  FONT,
  FONT_BOLD,
  formatInvoiceDate,
  hRule,
  INK,
  LAYOUT,
  mm,
  paragraph,
  SIZE,
  stampFooters,
  translator,
  type CompanyInfo,
  type Cursor,
  type OrderForInvoice,
} from './invoice-pdf.js'

/**
 * Rechnungskorrektur (GLOSSARY.md): same layout as the invoice, one position
 * with the negative refunded amount and a reference to the original invoice.
 * VAT is presented like on the original (currently the §19 UStG note only).
 * Pure drawing module like invoice-pdf.ts.
 */
export interface InvoiceCorrectionPdfData {
  correction: InvoiceCorrection
  invoice: Pick<Invoice, 'number' | 'issuedAt' | 'paymentMethod'>
  order: OrderForInvoice
  company: CompanyInfo
  provider: RefundProvider
}

/** How the money went back to the customer. */
export function refundChannelLabel(
  provider: RefundProvider,
  method: PaymentMethod,
): { de: string; en: string } {
  if (provider === 'stripe')
    return { de: 'Stripe (ursprüngliches Zahlungsmittel)', en: 'Stripe (original payment method)' }
  if (provider === 'paypal') return { de: 'PayPal', en: 'PayPal' }
  if (method === 'bitcoin') return { de: 'Bitcoin', en: 'Bitcoin' }
  return { de: 'Überweisung', en: 'Bank transfer' }
}

export function renderInvoiceCorrectionPdf(
  doc: PDFKit.PDFDocument,
  data: InvoiceCorrectionPdfData,
): void {
  const { correction, invoice, order } = data
  const de = correction.locale === 'de'
  const t = translator(de)
  const cur: Cursor = { y: LAYOUT.top }
  const minus = formatCents(-correction.amountCents, correction.locale)
  const invoiceDate = formatInvoiceDate(invoice.issuedAt, de)
  const channel = refundChannelLabel(data.provider, invoice.paymentMethod)

  drawHead(doc, data, de, cur)

  doc
    .font(FONT_BOLD)
    .fontSize(SIZE.title)
    .fillColor(INK)
    .text(
      `${t('Rechnungskorrektur', 'Invoice correction')} ${correction.number}`,
      LAYOUT.left,
      cur.y,
      {
        width: LAYOUT.contentWidth,
        lineBreak: false,
      },
    )
  cur.y += doc.currentLineHeight() + mm(8)

  const meta: Array<[string, string]> = [
    [t('Datum:', 'Date:'), formatInvoiceDate(correction.issuedAt, de)],
    [
      t('Zur Rechnung:', 'Original invoice:'),
      `${invoice.number} ${t('vom', 'dated')} ${invoiceDate}`,
    ],
    [t('Bestellnummer:', 'Order number:'), order.orderNumber],
    [t('Erstattet über:', 'Refunded via:'), de ? channel.de : channel.en],
  ]
  doc.font(FONT).fontSize(SIZE.body).fillColor(INK)
  const valueX = LAYOUT.left + LAYOUT.metaLabelW
  const valueW = LAYOUT.right - valueX
  for (const [label, value] of meta) {
    doc.text(label, LAYOUT.left, cur.y, { width: LAYOUT.metaLabelW, lineBreak: false })
    doc.text(value, valueX, cur.y, { width: valueW })
    cur.y += doc.heightOfString(value, { width: valueW }) + mm(1)
  }
  cur.y += mm(6)

  paragraph(
    doc,
    t,
    cur,
    t(
      `Hiermit korrigieren wir die Rechnung ${invoice.number} vom ${invoiceDate} um den folgenden Betrag:`,
      `We hereby correct invoice ${invoice.number} dated ${invoiceDate} by the following amount:`,
    ),
  )

  drawTableHeader(doc, t, cur)
  const desc = [
    t(`Erstattung zu Rechnung ${invoice.number}`, `Refund for invoice ${invoice.number}`),
    correction.reason,
  ]
    .filter(Boolean)
    .join('\n')
  doc.font(FONT).fontSize(SIZE.body).fillColor(INK)
  const descW = COLS.desc.w - 2 * LAYOUT.cellPadX
  const rowH = doc.heightOfString(desc, { width: descW }) + 2 * LAYOUT.cellPadY
  const y = cur.y + LAYOUT.cellPadY
  cell(doc, COLS.desc, desc, y, {})
  cell(doc, COLS.qty, '1', y)
  cell(doc, COLS.unitPrice, minus, y)
  cell(doc, COLS.total, minus, y)
  cur.y += rowH
  hRule(doc, cur.y)

  hRule(doc, cur.y, 0.4, INK)
  doc.font(FONT_BOLD)
  const totalY = cur.y + LAYOUT.cellPadY
  cell(
    doc,
    { x: LAYOUT.left, w: COLS.total.x - LAYOUT.left, align: 'left' },
    t('Korrekturbetrag', 'Correction amount'),
    totalY,
  )
  cell(doc, COLS.total, minus, totalY)
  cur.y = totalY + doc.currentLineHeight() + LAYOUT.cellPadY
  hRule(doc, cur.y)
  cur.y += mm(6)

  drawNotes(doc, data, t, cur)
  paragraph(
    doc,
    t,
    cur,
    t(
      `Der Betrag von ${formatCents(correction.amountCents, correction.locale)} wurde über ${channel.de} an Sie zurückgezahlt.`,
      `The amount of ${formatCents(correction.amountCents, correction.locale)} has been paid back to you via ${channel.en}.`,
    ),
  )
  stampFooters(doc, { company: data.company, invoice: correction }, t)
}
