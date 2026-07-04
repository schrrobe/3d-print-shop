import { existsSync } from 'node:fs'
import type { Invoice, Order, OrderItem, Payment } from '@prisma/client'
import { formatCents } from '@print-shop/utils'

/**
 * DIN 5008 (Form B) invoice renderer. Pure drawing module: no env/prisma
 * imports — all data arrives via {@link InvoicePdfData}, so it is unit-testable
 * without a database and reusable from scripts.
 *
 * All positions are absolute A4 coordinates in mm (converted to pt). The flow
 * below the subject line uses a mutable cursor; page breaks only happen through
 * ensureSpace(), never through PDFKit's implicit pagination (margin is 0).
 */

const MM = 72 / 25.4
const mm = (v: number): number => v * MM

const FONT = 'Helvetica'
const FONT_BOLD = 'Helvetica-Bold'
const GRAY = '#555555'
const RULE_GRAY = '#cccccc'

const SIZE = {
  body: 10,
  info: 9,
  table: 9,
  footer: 7,
  sender: 7,
  subject: 12,
  total: 11,
  companyName: 16,
} as const

export const LAYOUT = {
  /** Text column: 25 mm left margin, 20 mm right margin. */
  left: mm(25),
  right: mm(190),
  contentWidth: mm(165),
  letterhead: { y: mm(12), logoY: mm(10), logoMaxW: mm(56), logoMaxH: mm(20) },
  /** Anschriftfeld (window envelope, DIN 680): 85 mm wide at x=20 mm, zone 45–90 mm. */
  addr: { x: mm(20), w: mm(85), senderY: mm(57), recipientY: mm(62.7) },
  /** Informationsblock right of the address field. */
  info: { x: mm(125), w: mm(65), y: mm(45), labelW: mm(32) },
  subjectY: mm(98.5),
  bodyStartY: mm(107),
  /** Hard floor for flowing content; footer zone starts below. */
  contentBottom: mm(265),
  footer: { ruleY: mm(270), textY: mm(272.5), pageNoY: mm(266) },
  /** Fold marks (105/210 mm) + punch mark (148.5 mm) at the left paper edge. */
  marks: { x1: mm(5), x2: mm(8), punchX2: mm(10), fold1: mm(105), fold2: mm(210), punch: mm(148.5) },
  /** Continuation pages (2+): compact header, content starts at 30 mm. */
  cont: { headerY: mm(15), ruleY: mm(22), contentTop: mm(30) },
  qrSize: mm(30),
  cellPadY: mm(1.5),
} as const

/** Items table columns (widths sum to the 165 mm content width). */
const COLS = (() => {
  const w = { pos: mm(10), desc: mm(77), qty: mm(15), unit: mm(13), unitPrice: mm(25), total: mm(25) }
  let x = LAYOUT.left
  const col = (width: number, align: 'left' | 'right'): { x: number; w: number; align: 'left' | 'right' } => {
    const c = { x, w: width, align }
    x += width
    return c
  }
  return {
    pos: col(w.pos, 'right'),
    desc: col(w.desc, 'left'),
    qty: col(w.qty, 'right'),
    unit: col(w.unit, 'right'),
    unitPrice: col(w.unitPrice, 'right'),
    total: col(w.total, 'right'),
  }
})()
/** Inner gutters so the description touches neither the Pos. nor the Menge column. */
const DESC_TEXT_X = COLS.desc.x + mm(3)
const DESC_TEXT_W = COLS.desc.w - mm(6)
/** Description rows taller than this are truncated with an ellipsis. */
const MAX_DESC_LINES = 10

export interface CompanyInfo {
  name: string
  street: string
  zip: string
  city: string
  email: string
  phone: string
  website: string
  taxNumber: string
  owner: string
  logoPath: string
  iban: string
  bic: string
  accountHolder: string
  paymentTermsDays: number
}

export type OrderForInvoice = Order & { items: OrderItem[]; payments?: Payment[] }

export interface InvoicePdfData {
  invoice: Invoice
  order: OrderForInvoice
  company: CompanyInfo
  /** Pre-rendered GiroCode PNG (QR generation is async, rendering is not). */
  qrPng?: Buffer
}

export const PAYMENT_METHOD_LABELS: Record<string, { de: string; en: string }> = {
  stripe: { de: 'Kartenzahlung (Stripe)', en: 'Card payment (Stripe)' },
  stripe_payment_link: { de: 'Zahlungslink (Stripe)', en: 'Payment link (Stripe)' },
  bank_transfer: { de: 'Banküberweisung', en: 'Bank transfer' },
  bitcoin: { de: 'Bitcoin', en: 'Bitcoin' },
}

// ---------- pure helpers ----------

export function isInvoicePaid(payments: Pick<Payment, 'status'>[] | undefined): boolean {
  return payments?.some((p) => p.status === 'paid') ?? false
}

export function shouldShowGiroCode(
  invoice: Pick<Invoice, 'paymentMethod'>,
  payments: Pick<Payment, 'status'>[] | undefined,
): boolean {
  return invoice.paymentMethod === 'bank_transfer' && payments !== undefined && !isInvoicePaid(payments)
}

/**
 * EPC QR (GiroCode) payload, version 002, UTF-8, SEPA credit transfer.
 * LF-separated, no trailing newline. Amount is built from integer cents to
 * avoid float artifacts; the IBAN must not contain spaces in the payload.
 */
export function buildEpcQrPayload(opts: {
  bic: string
  name: string
  iban: string
  amountCents: number
  reference: string
}): string {
  const iban = opts.iban.replace(/\s+/g, '').toUpperCase()
  const amount = `EUR${Math.floor(opts.amountCents / 100)}.${String(opts.amountCents % 100).padStart(2, '0')}`
  return ['BCD', '002', '1', 'SCT', opts.bic, opts.name, iban, amount, '', '', opts.reference].join('\n')
}

export function formatInvoiceDate(date: Date, de: boolean): string {
  return new Intl.DateTimeFormat(
    de ? 'de-DE' : 'en-GB',
    de
      ? { day: '2-digit', month: '2-digit', year: 'numeric' }
      : { day: '2-digit', month: 'short', year: 'numeric' },
  ).format(date)
}

function countryName(code: string, de: boolean): string {
  try {
    return new Intl.DisplayNames([de ? 'de' : 'en'], { type: 'region' }).of(code.toUpperCase()) ?? code
  } catch {
    return code
  }
}

/**
 * Recipient address per DIN 5008: no blank lines, country only for foreign
 * addresses (uppercase, localized). At most 5 of the 6 allowed lines are used.
 */
export function recipientLines(
  order: Pick<Order, 'company' | 'firstName' | 'lastName' | 'street' | 'zip' | 'city' | 'country'>,
  de: boolean,
): string[] {
  const lines: string[] = []
  if (order.company) lines.push(order.company)
  lines.push(`${order.firstName} ${order.lastName}`)
  lines.push(order.street)
  lines.push(`${order.zip} ${order.city}`)
  if (order.country && order.country.toUpperCase() !== 'DE') {
    lines.push(countryName(order.country, de).toUpperCase())
  }
  return lines
}

type Translate = (de: string, en: string) => string
const translator = (de: boolean): Translate => (d, e) => (de ? d : e)

interface Cursor {
  y: number
}

// ---------- rendering ----------

export function renderInvoicePdf(doc: PDFKit.PDFDocument, data: InvoicePdfData): void {
  const de = data.invoice.locale === 'de'
  const t = translator(de)

  drawFoldMarks(doc)
  drawLetterhead(doc, data.company)
  drawAddressField(doc, data, de)
  drawInfoBlock(doc, data, t)
  drawSubject(doc, data, t)

  const cur: Cursor = { y: LAYOUT.bodyStartY }
  drawIntro(doc, t, cur)
  drawItemsTable(doc, data, t, cur)
  drawTotalsAndNotes(doc, data, t, cur)
  drawPaymentBlock(doc, data, t, cur)
  stampFooters(doc, data, t)
}

/** Thin gray ticks at the paper edge so the letter folds to window-envelope size. */
function drawFoldMarks(doc: PDFKit.PDFDocument): void {
  const m = LAYOUT.marks
  doc.save().lineWidth(0.3).strokeColor(GRAY)
  doc.moveTo(m.x1, m.fold1).lineTo(m.x2, m.fold1).stroke()
  doc.moveTo(m.x1, m.fold2).lineTo(m.x2, m.fold2).stroke()
  doc.moveTo(m.x1, m.punch).lineTo(m.punchX2, m.punch).stroke()
  doc.restore()
}

function drawLetterhead(doc: PDFKit.PDFDocument, company: CompanyInfo): void {
  let logoDrawn = false
  if (company.logoPath && existsSync(company.logoPath)) {
    try {
      doc.image(company.logoPath, LAYOUT.left, LAYOUT.letterhead.logoY, {
        fit: [LAYOUT.letterhead.logoMaxW, LAYOUT.letterhead.logoMaxH],
      })
      logoDrawn = true
    } catch {
      // unsupported image format — fall through to the text letterhead
    }
  }
  if (!logoDrawn) {
    doc
      .font(FONT_BOLD)
      .fontSize(SIZE.companyName)
      .fillColor('#000000')
      .text(company.name, LAYOUT.left, LAYOUT.letterhead.y, { width: mm(95), lineBreak: false })
  }

  const contact = [
    company.street,
    `${company.zip} ${company.city}`,
    company.email,
    company.phone,
    company.website,
  ].filter(Boolean)
  doc
    .font(FONT)
    .fontSize(SIZE.info)
    .fillColor(GRAY)
    .text(contact.join('\n'), LAYOUT.info.x, LAYOUT.letterhead.y, { width: LAYOUT.info.w, align: 'right' })
}

function drawAddressField(doc: PDFKit.PDFDocument, data: InvoicePdfData, de: boolean): void {
  const c = data.company
  doc
    .font(FONT)
    .fontSize(SIZE.sender)
    .fillColor(GRAY)
    .text(`${c.name} · ${c.street} · ${c.zip} ${c.city}`, LAYOUT.addr.x, LAYOUT.addr.senderY, {
      width: LAYOUT.addr.w,
      lineBreak: false,
      ellipsis: true,
    })
  doc
    .font(FONT)
    .fontSize(SIZE.body)
    .fillColor('#000000')
    .text(recipientLines(data.order, de).join('\n'), LAYOUT.addr.x, LAYOUT.addr.recipientY, {
      width: LAYOUT.addr.w,
    })
}

function drawInfoBlock(doc: PDFKit.PDFDocument, data: InvoicePdfData, t: Translate): void {
  const { invoice, order, company } = data
  const de = invoice.locale === 'de'
  const rows: Array<[string, string]> = [
    [t('Rechnungsnummer', 'Invoice number'), invoice.number],
    [t('Rechnungsdatum', 'Invoice date'), formatInvoiceDate(invoice.issuedAt, de)],
    [t('Bestellnummer', 'Order number'), order.orderNumber],
  ]
  if (order.shippedAt) rows.push([t('Leistungsdatum', 'Service date'), formatInvoiceDate(order.shippedAt, de)])
  if (company.email) rows.push([t('E-Mail', 'Email'), company.email])
  if (company.phone) rows.push([t('Telefon', 'Phone'), company.phone])

  doc.fontSize(SIZE.info).fillColor('#000000')
  const valueX = LAYOUT.info.x + LAYOUT.info.labelW
  const valueW = LAYOUT.right - valueX
  let y = LAYOUT.info.y
  for (const [label, value] of rows) {
    doc.font(FONT).text(label, LAYOUT.info.x, y, { width: LAYOUT.info.labelW, lineBreak: false })
    doc.font(FONT).text(value, valueX, y, { width: valueW })
    y += Math.max(doc.heightOfString(value, { width: valueW }), doc.currentLineHeight()) + mm(0.8)
  }
}

function drawSubject(doc: PDFKit.PDFDocument, data: InvoicePdfData, t: Translate): void {
  doc
    .font(FONT_BOLD)
    .fontSize(SIZE.subject)
    .fillColor('#000000')
    .text(`${t('Rechnung Nr.', 'Invoice no.')} ${data.invoice.number}`, LAYOUT.left, LAYOUT.subjectY, {
      width: LAYOUT.contentWidth,
      lineBreak: false,
    })
}

function drawIntro(doc: PDFKit.PDFDocument, t: Translate, cur: Cursor): void {
  const text = t(
    'Vielen Dank für Ihren Auftrag. Wir berechnen Ihnen folgende Leistungen:',
    'Thank you for your order. We invoice you for the following items:',
  )
  doc.font(FONT).fontSize(SIZE.body).fillColor('#000000')
  doc.text(text, LAYOUT.left, cur.y, { width: LAYOUT.contentWidth })
  cur.y += doc.heightOfString(text, { width: LAYOUT.contentWidth }) + mm(5)
}

/** Compact header for pages 2+ and cursor reset. */
function addContinuationPage(doc: PDFKit.PDFDocument, data: InvoicePdfData, t: Translate, cur: Cursor): void {
  const de = data.invoice.locale === 'de'
  doc.addPage({ size: 'A4', margin: 0 })
  doc
    .font(FONT_BOLD)
    .fontSize(SIZE.info)
    .fillColor('#000000')
    .text(data.company.name, LAYOUT.left, LAYOUT.cont.headerY, { width: mm(80), lineBreak: false })
  doc
    .font(FONT)
    .fontSize(SIZE.info)
    .fillColor(GRAY)
    .text(
      `${t('Rechnung Nr.', 'Invoice no.')} ${data.invoice.number} · ${formatInvoiceDate(data.invoice.issuedAt, de)}`,
      LAYOUT.left + mm(80),
      LAYOUT.cont.headerY,
      { width: LAYOUT.contentWidth - mm(80), align: 'right' },
    )
  doc
    .save()
    .lineWidth(0.3)
    .strokeColor(RULE_GRAY)
    .moveTo(LAYOUT.left, LAYOUT.cont.ruleY)
    .lineTo(LAYOUT.right, LAYOUT.cont.ruleY)
    .stroke()
    .restore()
  cur.y = LAYOUT.cont.contentTop
}

/** Breaks the page before `needed` points would cross the content floor. */
function ensureSpace(
  doc: PDFKit.PDFDocument,
  data: InvoicePdfData,
  t: Translate,
  cur: Cursor,
  needed: number,
  opts?: { redrawTableHeader?: boolean },
): void {
  if (cur.y + needed <= LAYOUT.contentBottom) return
  addContinuationPage(doc, data, t, cur)
  if (opts?.redrawTableHeader) drawTableHeader(doc, t, cur)
}

function drawTableHeader(doc: PDFKit.PDFDocument, t: Translate, cur: Cursor): void {
  doc.font(FONT_BOLD).fontSize(SIZE.table).fillColor('#000000')
  const labels: Array<[keyof typeof COLS, string]> = [
    ['pos', t('Pos.', 'No.')],
    ['desc', t('Beschreibung', 'Description')],
    ['qty', t('Menge', 'Qty')],
    ['unit', t('Einheit', 'Unit')],
    ['unitPrice', t('Einzelpreis', 'Unit price')],
    ['total', t('Gesamt', 'Total')],
  ]
  for (const [key, label] of labels) {
    const col = COLS[key]
    const x = key === 'desc' ? DESC_TEXT_X : col.x
    doc.text(label, x, cur.y, { width: key === 'desc' ? DESC_TEXT_W : col.w, align: col.align, lineBreak: false })
  }
  const bottom = cur.y + doc.currentLineHeight() + LAYOUT.cellPadY
  doc.save().lineWidth(0.5).strokeColor('#000000').moveTo(LAYOUT.left, bottom).lineTo(LAYOUT.right, bottom).stroke().restore()
  cur.y = bottom + LAYOUT.cellPadY
}

function drawItemsTable(doc: PDFKit.PDFDocument, data: InvoicePdfData, t: Translate, cur: Cursor): void {
  const { invoice, order } = data
  drawTableHeader(doc, t, cur)

  doc.font(FONT).fontSize(SIZE.table)
  const lineH = doc.currentLineHeight()
  const maxDescH = lineH * MAX_DESC_LINES

  order.items.forEach((item, i) => {
    doc.font(FONT).fontSize(SIZE.table).fillColor('#000000')
    const truncate = doc.heightOfString(item.name, { width: DESC_TEXT_W }) > maxDescH
    const descH = truncate ? maxDescH : doc.heightOfString(item.name, { width: DESC_TEXT_W })
    const rowH = Math.max(descH, lineH) + 2 * LAYOUT.cellPadY

    ensureSpace(doc, data, t, cur, rowH, { redrawTableHeader: true })
    // the redrawn table header leaves bold as the active font
    doc.font(FONT).fontSize(SIZE.table).fillColor('#000000')

    const y = cur.y + LAYOUT.cellPadY
    doc.text(String(i + 1), COLS.pos.x, y, { width: COLS.pos.w, align: 'right', lineBreak: false })
    doc.text(item.name, DESC_TEXT_X, y, {
      width: DESC_TEXT_W,
      ...(truncate ? { height: maxDescH, ellipsis: true } : {}),
    })
    doc.text(String(item.quantity), COLS.qty.x, y, { width: COLS.qty.w, align: 'right', lineBreak: false })
    doc.text(t('Stk.', 'pcs'), COLS.unit.x, y, { width: COLS.unit.w, align: 'right', lineBreak: false })
    doc.text(formatCents(item.unitPriceCents, invoice.locale), COLS.unitPrice.x, y, {
      width: COLS.unitPrice.w,
      align: 'right',
      lineBreak: false,
    })
    doc.text(formatCents(item.unitPriceCents * item.quantity, invoice.locale), COLS.total.x, y, {
      width: COLS.total.w,
      align: 'right',
      lineBreak: false,
    })

    cur.y += rowH
    doc
      .save()
      .lineWidth(0.3)
      .strokeColor(RULE_GRAY)
      .moveTo(LAYOUT.left, cur.y)
      .lineTo(LAYOUT.right, cur.y)
      .stroke()
      .restore()
    cur.y += LAYOUT.cellPadY
  })
  cur.y += mm(3)
}

function drawTotalsAndNotes(doc: PDFKit.PDFDocument, data: InvoicePdfData, t: Translate, cur: Cursor): void {
  const { invoice, order } = data
  const labelX = mm(120)
  const labelW = mm(42)
  const valueX = mm(162)
  const valueW = LAYOUT.right - valueX

  const taxNote = t(
    'Gemäß § 19 UStG wird keine Umsatzsteuer berechnet.',
    'In accordance with Section 19 of the German VAT Act (UStG), no VAT is charged.',
  )
  const serviceNote = order.shippedAt
    ? null
    : t('Das Leistungsdatum entspricht dem Rechnungsdatum.', 'The service date corresponds to the invoice date.')

  // Measure everything up front so totals + notes never split across pages.
  doc.font(FONT).fontSize(SIZE.body)
  const rowH = doc.currentLineHeight() + mm(1)
  doc.font(FONT_BOLD).fontSize(SIZE.total)
  const totalRowH = doc.currentLineHeight() + mm(1)
  doc.font(FONT).fontSize(SIZE.info)
  const notesH =
    doc.heightOfString(taxNote, { width: LAYOUT.contentWidth }) +
    (serviceNote ? doc.heightOfString(serviceNote, { width: LAYOUT.contentWidth }) + mm(1) : 0)
  const blockH = 2 * rowH + mm(2) + totalRowH + mm(5) + notesH
  ensureSpace(doc, data, t, cur, blockH)

  doc.font(FONT).fontSize(SIZE.body).fillColor('#000000')
  const sumRow = (label: string, cents: number): void => {
    doc.text(label, labelX, cur.y, { width: labelW, align: 'right', lineBreak: false })
    doc.text(formatCents(cents, invoice.locale), valueX, cur.y, { width: valueW, align: 'right', lineBreak: false })
    cur.y += rowH
  }
  sumRow(t('Zwischensumme', 'Subtotal'), invoice.subtotalCents)
  sumRow(t('Versandkosten', 'Shipping'), invoice.shippingCents)

  doc.save().lineWidth(0.5).strokeColor('#000000').moveTo(labelX, cur.y).lineTo(LAYOUT.right, cur.y).stroke().restore()
  cur.y += mm(2)

  doc.font(FONT_BOLD).fontSize(SIZE.total)
  doc.text(t('Gesamtbetrag', 'Total amount'), labelX, cur.y, { width: labelW, align: 'right', lineBreak: false })
  doc.text(formatCents(invoice.totalCents, invoice.locale), valueX, cur.y, {
    width: valueW,
    align: 'right',
    lineBreak: false,
  })
  cur.y += totalRowH + mm(5)

  doc.font(FONT).fontSize(SIZE.info).fillColor('#000000')
  doc.text(taxNote, LAYOUT.left, cur.y, { width: LAYOUT.contentWidth })
  cur.y += doc.heightOfString(taxNote, { width: LAYOUT.contentWidth })
  if (serviceNote) {
    cur.y += mm(1)
    doc.text(serviceNote, LAYOUT.left, cur.y, { width: LAYOUT.contentWidth })
    cur.y += doc.heightOfString(serviceNote, { width: LAYOUT.contentWidth })
  }
  cur.y += mm(8)
}

function drawPaymentBlock(doc: PDFKit.PDFDocument, data: InvoicePdfData, t: Translate, cur: Cursor): void {
  const { invoice, order, company, qrPng } = data
  const paid = isInvoicePaid(order.payments)
  const method = PAYMENT_METHOD_LABELS[invoice.paymentMethod] ?? {
    de: invoice.paymentMethod,
    en: invoice.paymentMethod,
  }

  const heading = t('Zahlungsinformationen', 'Payment information')
  doc.font(FONT).fontSize(SIZE.body)
  const lineH = doc.currentLineHeight()
  const headingH = lineH + mm(2)

  if (paid || invoice.paymentMethod !== 'bank_transfer') {
    const text = paid
      ? t(
          `Der Rechnungsbetrag wurde bereits per ${method.de} beglichen. Es ist keine Zahlung mehr erforderlich.`,
          `The invoice amount has already been paid via ${method.en}. No further payment is required.`,
        )
      : t(
          `Zahlungsart: ${method.de}. Bitte begleichen Sie den Gesamtbetrag innerhalb von ${company.paymentTermsDays} Tagen.`,
          `Payment method: ${method.en}. Please settle the total amount within ${company.paymentTermsDays} days.`,
        )
    const textH = doc.heightOfString(text, { width: LAYOUT.contentWidth })
    ensureSpace(doc, data, t, cur, headingH + textH)
    doc.font(FONT_BOLD).fontSize(SIZE.body).fillColor('#000000').text(heading, LAYOUT.left, cur.y, { lineBreak: false })
    cur.y += headingH
    doc.font(FONT).fontSize(SIZE.body).text(text, LAYOUT.left, cur.y, { width: LAYOUT.contentWidth })
    cur.y += textH
    return
  }

  // Unpaid bank transfer: terms + account details, GiroCode on the right.
  const textW = qrPng ? LAYOUT.contentWidth - LAYOUT.qrSize - mm(8) : LAYOUT.contentWidth
  const terms = t(
    `Bitte überweisen Sie den Gesamtbetrag innerhalb von ${company.paymentTermsDays} Tagen ohne Abzug auf folgendes Konto:`,
    `Please transfer the total amount within ${company.paymentTermsDays} days without deduction to the following account:`,
  )
  const details: Array<[string, string]> = [
    [t('Kontoinhaber', 'Account holder'), company.accountHolder],
    ['IBAN', company.iban],
    ['BIC', company.bic],
    [t('Verwendungszweck', 'Payment reference'), invoice.number],
  ]
  const caption = t('Mit Banking-App scannen (GiroCode)', 'Scan with your banking app (GiroCode)')
  const captionX = LAYOUT.right - LAYOUT.qrSize - mm(10)
  const captionW = LAYOUT.qrSize + mm(10)
  doc.font(FONT).fontSize(SIZE.footer)
  const captionH = doc.heightOfString(caption, { width: captionW })
  doc.font(FONT).fontSize(SIZE.body)
  const termsH = doc.heightOfString(terms, { width: textW })
  const textH = termsH + mm(2) + details.length * (lineH + mm(0.8))
  const qrH = qrPng ? LAYOUT.qrSize + mm(1) + captionH : 0
  ensureSpace(doc, data, t, cur, headingH + Math.max(textH, qrH))

  doc.font(FONT_BOLD).fontSize(SIZE.body).fillColor('#000000').text(heading, LAYOUT.left, cur.y, { lineBreak: false })
  cur.y += headingH
  const blockTop = cur.y

  doc.font(FONT).fontSize(SIZE.body).text(terms, LAYOUT.left, cur.y, { width: textW })
  cur.y += termsH + mm(2)
  const labelW = mm(38)
  for (const [label, value] of details) {
    doc.font(FONT).text(label, LAYOUT.left, cur.y, { width: labelW, lineBreak: false })
    doc.font(FONT).text(value, LAYOUT.left + labelW, cur.y, { width: textW - labelW, lineBreak: false })
    cur.y += lineH + mm(0.8)
  }

  if (qrPng) {
    const qrX = LAYOUT.right - LAYOUT.qrSize
    doc.image(qrPng, qrX, blockTop, { width: LAYOUT.qrSize, height: LAYOUT.qrSize })
    doc
      .font(FONT)
      .fontSize(SIZE.footer)
      .fillColor(GRAY)
      .text(caption, captionX, blockTop + LAYOUT.qrSize + mm(1), { width: captionW, align: 'center' })
    cur.y = Math.max(cur.y, blockTop + qrH)
  }
}

/**
 * Footer on every page, stamped last because "Seite x von y" needs the final
 * page count (requires bufferPages: true on the document).
 */
function stampFooters(doc: PDFKit.PDFDocument, data: InvoicePdfData, t: Translate): void {
  const c = data.company
  const range = doc.bufferedPageRange()
  // non-uniform: the IBAN column needs the most room at 7 pt
  const colWidths = [mm(40), mm(33), mm(42), mm(50)]
  const columns: string[][] = [
    [c.name, c.street, `${c.zip} ${c.city}`],
    [c.email, c.website, c.phone].filter(Boolean),
    [`${t('Steuernummer', 'Tax number')}: ${c.taxNumber}`, `${t('Inhaber', 'Owner')}: ${c.owner}`],
    [`IBAN: ${c.iban}`, `BIC: ${c.bic}`],
  ]

  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i)
    doc
      .font(FONT)
      .fontSize(SIZE.footer)
      .fillColor(GRAY)
      .text(
        t(`Seite ${i + 1} von ${range.count}`, `Page ${i + 1} of ${range.count}`),
        LAYOUT.left,
        LAYOUT.footer.pageNoY,
        { width: LAYOUT.contentWidth, align: 'right', lineBreak: false },
      )
    doc
      .save()
      .lineWidth(0.5)
      .strokeColor(RULE_GRAY)
      .moveTo(LAYOUT.left, LAYOUT.footer.ruleY)
      .lineTo(LAYOUT.right, LAYOUT.footer.ruleY)
      .stroke()
      .restore()
    let colX = LAYOUT.left
    columns.forEach((lines, col) => {
      doc
        .font(FONT)
        .fontSize(SIZE.footer)
        .fillColor(GRAY)
        .text(lines.join('\n'), colX, LAYOUT.footer.textY, { width: colWidths[col]! - mm(3) })
      colX += colWidths[col]!
    })
  }
}
