import { existsSync } from 'node:fs'
import type { Invoice, Order, OrderItem, Payment } from '@prisma/client'
import {
  formatCents,
  PERSONALIZATION_PRICE_CENTS,
  PREPAYMENT_DISCOUNT_PERCENT,
} from '@print-shop/utils'

/**
 * Invoice renderer (layout mirrors the storylo invoice: recipient left, sender
 * right, large title, meta block, one table for items and totals, one-line
 * footer). Pure drawing module: no env/prisma imports — all data arrives via
 * {@link InvoicePdfData}, so it is unit-testable without a database.
 *
 * All positions are absolute A4 coordinates in mm (converted to pt). The flow
 * uses a mutable cursor; page breaks only happen through ensureSpace(), never
 * through PDFKit's implicit pagination (margin is 0).
 */

const MM = 72 / 25.4
const mm = (v: number): number => v * MM

const FONT = 'Helvetica'
const FONT_BOLD = 'Helvetica-Bold'
const INK = '#1E1714'
const GRAY = '#555555'
const RULE = '#dddddd'

const SIZE = { body: 10, sender: 8, footer: 7.5, title: 18 } as const

export const LAYOUT = {
  /** 20 mm page padding left/right/top. */
  left: mm(20),
  right: mm(190),
  contentWidth: mm(170),
  top: mm(20),
  /** Sender block on the right of the head. */
  side: { x: mm(130), w: mm(60), logoMaxH: mm(18) },
  metaLabelW: mm(45),
  /** Hard floor for flowing content; footer zone starts below. */
  contentBottom: mm(271),
  footer: { ruleY: mm(276), textY: mm(278) },
  qrSize: mm(30),
  cellPadX: mm(1),
  cellPadY: mm(2),
} as const

/** Items/totals table columns (widths sum to the 170 mm content width). */
const COLS = {
  desc: { x: LAYOUT.left, w: mm(100), align: 'left' },
  qty: { x: LAYOUT.left + mm(100), w: mm(18), align: 'right' },
  unitPrice: { x: LAYOUT.left + mm(118), w: mm(26), align: 'right' },
  total: { x: LAYOUT.left + mm(144), w: mm(26), align: 'right' },
} as const
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
  /** §19 UStG small-business: print the "no VAT charged" note on invoices. */
  vatExempt: boolean
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
  bank_transfer: { de: 'Vorkasse (Überweisung)', en: 'Prepayment (bank transfer)' },
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
  return (
    invoice.paymentMethod === 'bank_transfer' && payments !== undefined && !isInvoicePaid(payments)
  )
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
  // EPC amount field is capped at 999_999_999.99 EUR (12 chars incl. "EUR").
  // A larger value would silently produce an unscannable GiroCode; throwing
  // here lets the caller fall back to rendering the invoice without a QR.
  if (
    !Number.isInteger(opts.amountCents) ||
    opts.amountCents < 1 ||
    opts.amountCents > 99_999_999_999
  ) {
    throw new Error(`EPC amount out of range: ${opts.amountCents} cents`)
  }
  const amount = `EUR${Math.floor(opts.amountCents / 100)}.${String(opts.amountCents % 100).padStart(2, '0')}`
  return ['BCD', '002', '1', 'SCT', opts.bic, opts.name, iban, amount, '', '', opts.reference].join(
    '\n',
  )
}

export function formatInvoiceDate(date: Date, de: boolean): string {
  // Dates are stored as UTC instants (issuedAt @default(now()), shippedAt).
  // Pin to Europe/Berlin so the calendar date printed on this German tax
  // document is the seller's local date and never shifts with the server's
  // timezone (cloud hosts are often not UTC), which would break the
  // Rechnungsdatum/Leistungsdatum correctness required by §14 UStG.
  return new Intl.DateTimeFormat(de ? 'de-DE' : 'en-GB', {
    timeZone: 'Europe/Berlin',
    ...(de
      ? { day: '2-digit', month: '2-digit', year: 'numeric' }
      : { day: '2-digit', month: 'short', year: 'numeric' }),
  }).format(date)
}

function countryName(code: string, de: boolean): string {
  try {
    return (
      new Intl.DisplayNames([de ? 'de' : 'en'], { type: 'region' }).of(code.toUpperCase()) ?? code
    )
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
const translator =
  (de: boolean): Translate =>
  (d, e) =>
    de ? d : e

interface Cursor {
  y: number
}

// ---------- rendering ----------

export function renderInvoicePdf(doc: PDFKit.PDFDocument, data: InvoicePdfData): void {
  const de = data.invoice.locale === 'de'
  const t = translator(de)
  const cur: Cursor = { y: LAYOUT.top }

  drawHead(doc, data, de, cur)
  drawTitleAndMeta(doc, data, t, cur)
  drawItemsTable(doc, data, t, cur)
  drawTotals(doc, data, t, cur)
  drawNotes(doc, data, t, cur)
  drawPaymentBlock(doc, data, t, cur)
  stampFooters(doc, data, t)
}

/** Recipient on the left (with the small sender line above), seller on the right. */
function drawHead(doc: PDFKit.PDFDocument, data: InvoicePdfData, de: boolean, cur: Cursor): void {
  const c = data.company
  const leftW = LAYOUT.side.x - LAYOUT.left - mm(10)

  doc
    .font(FONT)
    .fontSize(SIZE.sender)
    .fillColor(GRAY)
    .text(`${c.name} · ${c.street} · ${c.zip} ${c.city}`, LAYOUT.left, cur.y, {
      width: leftW,
      lineBreak: false,
      ellipsis: true,
    })
  const recipientY = cur.y + doc.currentLineHeight() + mm(2)
  const recipient = recipientLines(data.order, de).join('\n')
  doc
    .font(FONT)
    .fontSize(SIZE.body)
    .fillColor(INK)
    .text(recipient, LAYOUT.left, recipientY, { width: leftW })
  const leftBottom = recipientY + doc.heightOfString(recipient, { width: leftW })

  let sideY = cur.y
  let logoDrawn = false
  if (c.logoPath && existsSync(c.logoPath)) {
    try {
      doc.image(c.logoPath, LAYOUT.side.x, sideY, { fit: [LAYOUT.side.w, LAYOUT.side.logoMaxH] })
      sideY += LAYOUT.side.logoMaxH + mm(3)
      logoDrawn = true
    } catch {
      // unsupported image format — fall through to the bold name
    }
  }
  if (!logoDrawn) {
    doc.font(FONT_BOLD).fontSize(SIZE.body).fillColor(INK)
    doc.text(c.name, LAYOUT.side.x, sideY, { width: LAYOUT.side.w })
    sideY += doc.heightOfString(c.name, { width: LAYOUT.side.w })
  }
  const contact = [
    logoDrawn ? c.name : '',
    c.street,
    `${c.zip} ${c.city}`,
    c.email,
    c.phone,
    c.website,
  ]
    .filter(Boolean)
    .join('\n')
  doc
    .font(FONT)
    .fontSize(SIZE.body)
    .fillColor(INK)
    .text(contact, LAYOUT.side.x, sideY, { width: LAYOUT.side.w })
  const sideBottom = sideY + doc.heightOfString(contact, { width: LAYOUT.side.w })

  cur.y = Math.max(leftBottom, sideBottom) + mm(12)
}

function drawTitleAndMeta(
  doc: PDFKit.PDFDocument,
  data: InvoicePdfData,
  t: Translate,
  cur: Cursor,
): void {
  const { invoice, order } = data
  const de = invoice.locale === 'de'
  const method = PAYMENT_METHOD_LABELS[invoice.paymentMethod] ?? {
    de: invoice.paymentMethod,
    en: invoice.paymentMethod,
  }

  doc
    .font(FONT_BOLD)
    .fontSize(SIZE.title)
    .fillColor(INK)
    .text(`${t('Rechnung', 'Invoice')} ${invoice.number}`, LAYOUT.left, cur.y, {
      width: LAYOUT.contentWidth,
      lineBreak: false,
    })
  cur.y += doc.currentLineHeight() + mm(8)

  const rows: Array<[string, string]> = [
    [t('Rechnungsdatum:', 'Invoice date:'), formatInvoiceDate(invoice.issuedAt, de)],
    [
      t('Liefer-/Leistungsdatum:', 'Delivery/service date:'),
      order.shippedAt
        ? formatInvoiceDate(order.shippedAt, de)
        : t('entspricht dem Rechnungsdatum', 'same as invoice date'),
    ],
    [t('Bestellnummer:', 'Order number:'), order.orderNumber],
    [t('Zahlungsart:', 'Payment method:'), de ? method.de : method.en],
  ]
  doc.font(FONT).fontSize(SIZE.body).fillColor(INK)
  const valueX = LAYOUT.left + LAYOUT.metaLabelW
  const valueW = LAYOUT.right - valueX
  for (const [label, value] of rows) {
    doc.text(label, LAYOUT.left, cur.y, { width: LAYOUT.metaLabelW, lineBreak: false })
    doc.text(value, valueX, cur.y, { width: valueW })
    cur.y += doc.heightOfString(value, { width: valueW }) + mm(1)
  }
  cur.y += mm(6)
}

/** Fresh page; content restarts at the top padding. */
function addContinuationPage(doc: PDFKit.PDFDocument, cur: Cursor): void {
  doc.addPage({ size: 'A4', margin: 0 })
  cur.y = LAYOUT.top
}

/** Breaks the page before `needed` points would cross the content floor. */
function ensureSpace(
  doc: PDFKit.PDFDocument,
  t: Translate,
  cur: Cursor,
  needed: number,
  opts?: { redrawTableHeader?: boolean },
): void {
  if (cur.y + needed <= LAYOUT.contentBottom) return
  addContinuationPage(doc, cur)
  if (opts?.redrawTableHeader) drawTableHeader(doc, t, cur)
}

function hRule(doc: PDFKit.PDFDocument, y: number, width = 0.2, color = RULE): void {
  doc
    .save()
    .lineWidth(mm(width))
    .strokeColor(color)
    .moveTo(LAYOUT.left, y)
    .lineTo(LAYOUT.right, y)
    .stroke()
    .restore()
}

function cell(
  doc: PDFKit.PDFDocument,
  col: { x: number; w: number; align: 'left' | 'right' },
  text: string,
  y: number,
  opts: PDFKit.Mixins.TextOptions = { lineBreak: false },
): void {
  doc.text(text, col.x + LAYOUT.cellPadX, y, {
    width: col.w - 2 * LAYOUT.cellPadX,
    align: col.align,
    ...opts,
  })
}

function drawTableHeader(doc: PDFKit.PDFDocument, t: Translate, cur: Cursor): void {
  doc.font(FONT_BOLD).fontSize(SIZE.body).fillColor(INK)
  const y = cur.y + LAYOUT.cellPadY
  cell(doc, COLS.desc, t('Leistung', 'Item'), y)
  cell(doc, COLS.qty, t('Menge', 'Qty'), y)
  cell(doc, COLS.unitPrice, t('Einzelpreis', 'Unit price'), y)
  cell(doc, COLS.total, t('Betrag', 'Amount'), y)
  cur.y = y + doc.currentLineHeight() + LAYOUT.cellPadY
  hRule(doc, cur.y)
}

function drawItemsTable(
  doc: PDFKit.PDFDocument,
  data: InvoicePdfData,
  t: Translate,
  cur: Cursor,
): void {
  const { invoice, order } = data
  drawTableHeader(doc, t, cur)

  doc.font(FONT).fontSize(SIZE.body)
  const lineH = doc.currentLineHeight()
  const maxDescH = lineH * MAX_DESC_LINES
  const descW = COLS.desc.w - 2 * LAYOUT.cellPadX

  // Per-line "Betrag" must reconcile with the stored subtotal. Quote orders
  // derive unitPriceCents = round(priceCents / quantity) (see quotes.ts) while
  // subtotalCents keeps the all-in price, so unitPrice*quantity can differ from
  // the subtotal by the rounding residue. Absorb that residue into the last
  // line so the displayed line totals sum to the printed Zwischensumme/Gesamt.
  const lineTotals = order.items.map((item) => item.unitPriceCents * item.quantity)
  if (lineTotals.length > 0) {
    const rawSum = lineTotals.reduce((sum, cents) => sum + cents, 0)
    lineTotals[lineTotals.length - 1]! += invoice.subtotalCents - rawSum
  }

  // A personalised box is billed as goods + a separate "Personalisierung" surcharge row.
  const rows = order.items.flatMap((item, i) => {
    const row = { name: item.name, quantity: item.quantity, unitPriceCents: item.unitPriceCents }
    if (!item.personalization) return [{ ...row, totalCents: lineTotals[i]! }]
    const surchargeCents = PERSONALIZATION_PRICE_CENTS * item.quantity
    return [
      {
        ...row,
        unitPriceCents: item.unitPriceCents - PERSONALIZATION_PRICE_CENTS,
        totalCents: lineTotals[i]! - surchargeCents,
      },
      {
        name: t('Personalisierung', 'Personalisation'),
        quantity: item.quantity,
        unitPriceCents: PERSONALIZATION_PRICE_CENTS,
        totalCents: surchargeCents,
      },
    ]
  })

  rows.forEach((item) => {
    doc.font(FONT).fontSize(SIZE.body).fillColor(INK)
    const measuredDescH = doc.heightOfString(item.name, { width: descW })
    const truncate = measuredDescH > maxDescH
    const rowH = Math.max(truncate ? maxDescH : measuredDescH, lineH) + 2 * LAYOUT.cellPadY

    ensureSpace(doc, t, cur, rowH, { redrawTableHeader: true })
    // the redrawn table header leaves bold as the active font
    doc.font(FONT).fontSize(SIZE.body).fillColor(INK)

    const y = cur.y + LAYOUT.cellPadY
    cell(doc, COLS.desc, item.name, y, truncate ? { height: maxDescH, ellipsis: true } : {})
    cell(doc, COLS.qty, String(item.quantity), y)
    cell(doc, COLS.unitPrice, formatCents(item.unitPriceCents, invoice.locale), y)
    cell(doc, COLS.total, formatCents(item.totalCents, invoice.locale), y)

    cur.y += rowH
    hRule(doc, cur.y)
  })
}

/** Summary rows continue the items table: label spans the first three columns. */
function drawTotals(
  doc: PDFKit.PDFDocument,
  data: InvoicePdfData,
  t: Translate,
  cur: Cursor,
): void {
  const { invoice, order } = data
  const rows: Array<[string, number]> = [[t('Zwischensumme', 'Subtotal'), invoice.subtotalCents]]
  if (invoice.discountCents > 0) {
    const label = t('Gutschein', 'Voucher')
    rows.push([order.voucherCode ? `${label} ${order.voucherCode}` : label, -invoice.discountCents])
  }
  if (order.prepaymentDiscountCents > 0) {
    rows.push([
      t(
        `Vorkasse-Rabatt ${PREPAYMENT_DISCOUNT_PERCENT} %`,
        `Prepayment discount ${PREPAYMENT_DISCOUNT_PERCENT} %`,
      ),
      -order.prepaymentDiscountCents,
    ])
  }
  rows.push([t('Versand', 'Shipping'), invoice.shippingCents])

  doc.font(FONT).fontSize(SIZE.body)
  const rowH = doc.currentLineHeight() + 2 * LAYOUT.cellPadY
  ensureSpace(doc, t, cur, (rows.length + 1) * rowH)

  const labelCol = { x: LAYOUT.left, w: COLS.total.x - LAYOUT.left, align: 'left' } as const
  const row = (label: string, cents: number): void => {
    const y = cur.y + LAYOUT.cellPadY
    cell(doc, labelCol, label, y)
    cell(doc, COLS.total, formatCents(cents, invoice.locale), y)
    cur.y += rowH
  }

  doc.font(FONT).fillColor(INK)
  for (const [label, cents] of rows) {
    row(label, cents)
    hRule(doc, cur.y)
  }
  // Gesamtbetrag: bold with a heavier ink rule on top
  hRule(doc, cur.y, 0.4, INK)
  doc.font(FONT_BOLD)
  row(t('Gesamtbetrag', 'Total amount'), invoice.totalCents)
  hRule(doc, cur.y)
  cur.y += mm(6)
}

function drawNotes(doc: PDFKit.PDFDocument, data: InvoicePdfData, t: Translate, cur: Cursor): void {
  if (!data.company.vatExempt) return
  const note = t(
    'Gemäß § 19 UStG wird keine Umsatzsteuer berechnet.',
    'In accordance with Section 19 of the German VAT Act (UStG), no VAT is charged.',
  )
  paragraph(doc, t, cur, note)
}

function paragraph(
  doc: PDFKit.PDFDocument,
  t: Translate,
  cur: Cursor,
  text: string,
  width = LAYOUT.contentWidth,
): void {
  doc.font(FONT).fontSize(SIZE.body)
  const h = doc.heightOfString(text, { width })
  ensureSpace(doc, t, cur, h)
  doc.fillColor(INK).text(text, LAYOUT.left, cur.y, { width })
  cur.y += h + mm(3.5)
}

function drawPaymentBlock(
  doc: PDFKit.PDFDocument,
  data: InvoicePdfData,
  t: Translate,
  cur: Cursor,
): void {
  const { invoice, order, company, qrPng } = data
  const paid = isInvoicePaid(order.payments)
  const method = PAYMENT_METHOD_LABELS[invoice.paymentMethod] ?? {
    de: invoice.paymentMethod,
    en: invoice.paymentMethod,
  }

  if (paid || invoice.paymentMethod !== 'bank_transfer') {
    const text = paid
      ? t(
          `Bezahlt per ${method.de}. Vielen Dank für Ihre Bestellung!`,
          `Paid via ${method.en}. Thank you for your order!`,
        )
      : t(
          `Bitte begleichen Sie den Gesamtbetrag innerhalb von ${company.paymentTermsDays} Tagen. Vielen Dank für Ihre Bestellung!`,
          `Please settle the total amount within ${company.paymentTermsDays} days. Thank you for your order!`,
        )
    paragraph(doc, t, cur, text)
    return
  }

  // Unpaid Vorkasse: terms + account details, GiroCode on the right.
  const textW = qrPng ? LAYOUT.contentWidth - LAYOUT.qrSize - mm(8) : LAYOUT.contentWidth
  const amount = formatCents(invoice.totalCents, invoice.locale)
  const terms = t(
    `Zahlungsziel: sofort. Bitte überweisen Sie den Rechnungsbetrag in Höhe von ${amount} ohne Abzug auf folgendes Konto und geben Sie die Rechnungsnummer ${invoice.number} als Verwendungszweck an:`,
    `Payment due: immediately. Please transfer the invoice amount of ${amount} without deduction to the following account, stating invoice number ${invoice.number} as the payment reference:`,
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
  const lineH = doc.currentLineHeight()
  const termsH = doc.heightOfString(terms, { width: textW })
  const textH = termsH + mm(2) + details.length * (lineH + mm(1))
  const qrH = qrPng ? LAYOUT.qrSize + mm(1) + captionH : 0
  ensureSpace(doc, t, cur, Math.max(textH, qrH))

  const blockTop = cur.y
  doc
    .font(FONT)
    .fontSize(SIZE.body)
    .fillColor(INK)
    .text(terms, LAYOUT.left, cur.y, { width: textW })
  cur.y += termsH + mm(2)
  for (const [label, value] of details) {
    doc.text(`${label}:`, LAYOUT.left, cur.y, { width: LAYOUT.metaLabelW, lineBreak: false })
    doc.text(value, LAYOUT.left + LAYOUT.metaLabelW, cur.y, {
      width: textW - LAYOUT.metaLabelW,
      lineBreak: false,
    })
    cur.y += lineH + mm(1)
  }

  if (qrPng) {
    const qrX = LAYOUT.right - LAYOUT.qrSize
    doc.image(qrPng, qrX, blockTop, { width: LAYOUT.qrSize, height: LAYOUT.qrSize })
    doc
      .font(FONT)
      .fontSize(SIZE.footer)
      .fillColor(GRAY)
      .text(caption, captionX, blockTop + LAYOUT.qrSize + mm(1), {
        width: captionW,
        align: 'center',
      })
    cur.y = Math.max(cur.y, blockTop + qrH)
  }
}

/**
 * One-line company footer on every page, stamped last because the page count
 * is only known then (requires bufferPages: true on the document).
 */
function stampFooters(doc: PDFKit.PDFDocument, data: InvoicePdfData, t: Translate): void {
  const c = data.company
  const range = doc.bufferedPageRange()
  const base = [
    c.name,
    `${t('Inhaber', 'Owner')}: ${c.owner}`,
    `${c.street}, ${c.zip} ${c.city}`,
    c.email,
    c.phone,
    c.website,
    `${t('Steuernummer', 'Tax number')}: ${c.taxNumber}`,
    `IBAN: ${c.iban}`,
    `BIC: ${c.bic}`,
  ].filter(Boolean)

  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i)
    const parts =
      range.count > 1
        ? [
            ...base,
            `${t('Rechnung', 'Invoice')} ${data.invoice.number}`,
            t(`Seite ${i + 1} von ${range.count}`, `Page ${i + 1} of ${range.count}`),
          ]
        : base
    hRule(doc, LAYOUT.footer.ruleY)
    doc
      .font(FONT)
      .fontSize(SIZE.footer)
      .fillColor(GRAY)
      .text(parts.join(' · '), LAYOUT.left, LAYOUT.footer.textY, { width: LAYOUT.contentWidth })
  }
}
