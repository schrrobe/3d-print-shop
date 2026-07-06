import type { Invoice, OrderItem } from '@prisma/client'
import PDFDocument from 'pdfkit'
import QRCode from 'qrcode'
import { describe, expect, it } from 'vitest'
import {
  buildEpcQrPayload,
  formatInvoiceDate,
  isInvoicePaid,
  recipientLines,
  renderInvoicePdf,
  shouldShowGiroCode,
  type CompanyInfo,
  type InvoicePdfData,
  type OrderForInvoice,
} from '../src/services/invoice-pdf.js'

const company: CompanyInfo = {
  name: 'Print Shop GmbH',
  street: 'Musterstraße 1',
  zip: '12345',
  city: 'Berlin',
  email: 'info@example.com',
  phone: '+49 30 0000000',
  website: 'www.example.com',
  taxNumber: '12/345/67890',
  owner: 'Max Mustermann',
  logoPath: '',
  iban: 'DE00 0000 0000 0000 0000 00',
  bic: 'XXXXDEXXXXX',
  accountHolder: 'Print Shop GmbH',
  paymentTermsDays: 14,
  vatExempt: true,
}

function makeInvoice(over: Partial<Invoice> = {}): Invoice {
  return {
    id: 'inv1',
    number: 'RE-2026-00001',
    year: 2026,
    sequence: 1,
    orderId: 'o1',
    locale: 'de',
    subtotalCents: 5000,
    shippingCents: 490,
    totalCents: 5490,
    paymentMethod: 'bank_transfer',
    pdfPath: null,
    issuedAt: new Date('2026-07-04T10:00:00Z'),
    ...over,
  } as Invoice
}

function makeItems(count: number): OrderItem[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `item${i}`,
    orderId: 'o1',
    productId: null,
    name: `Spiralvase „Modell ${i + 1}" — PLA, 0.2 mm Schichthöhe`,
    quantity: i + 1,
    unitPriceCents: 1250,
    colorSelection: null,
  })) as OrderItem[]
}

function makeOrder(over: Record<string, unknown> = {}): OrderForInvoice {
  return {
    id: 'o1',
    orderNumber: 'PS-2026-00000001',
    email: 'kunde@example.com',
    firstName: 'Erika',
    lastName: 'Musterfrau',
    company: null,
    street: 'Beispielweg 2',
    zip: '54321',
    city: 'Hamburg',
    country: 'DE',
    phone: null,
    shippedAt: null,
    items: makeItems(2),
    payments: [{ id: 'p1', status: 'pending' }],
    ...over,
  } as unknown as OrderForInvoice
}

async function renderToBuffer(data: InvoicePdfData, opts: { compress?: boolean } = {}): Promise<Buffer> {
  // compress:false keeps Helvetica text as literal strings in the content
  // stream so tests can grep for rendered labels (e.g. repeated table headers).
  const doc = new PDFDocument({ size: 'A4', margin: 0, bufferPages: true, compress: opts.compress ?? true })
  const chunks: Buffer[] = []
  doc.on('data', (c: Buffer) => chunks.push(c))
  const done = new Promise<Buffer>((resolve, reject) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)
  })
  renderInvoicePdf(doc, data)
  doc.end()
  return done
}

function pageCount(pdf: Buffer): number {
  return (pdf.toString('latin1').match(/\/Type \/Page(?![a-zA-Z])/g) ?? []).length
}

/**
 * Reconstructs the visible text of an uncompressed PDF (render with
 * `{ compress: false }`). PDFKit writes Helvetica text as hex-encoded chunks in
 * `TJ` arrays, split by kerning, so a plain substring grep misses words that
 * span a kern pair (e.g. "Beschreib" + "ung"). Concatenating the hex chunks in
 * document order rejoins them.
 */
function extractText(pdf: Buffer): string {
  let out = ''
  for (const token of pdf.toString('latin1').match(/<[0-9A-Fa-f]+>/g) ?? []) {
    const hex = token.slice(1, -1)
    for (let i = 0; i + 1 < hex.length; i += 2) {
      out += String.fromCharCode(Number.parseInt(hex.slice(i, i + 2), 16))
    }
  }
  return out
}

describe('buildEpcQrPayload', () => {
  it('builds the exact EPC v002 payload with stripped IBAN', () => {
    const payload = buildEpcQrPayload({
      bic: 'XXXXDEXXXXX',
      name: 'Print Shop GmbH',
      iban: 'DE00 0000 0000 0000 0000 00',
      amountCents: 123456,
      reference: 'RE-2026-00001',
    })
    expect(payload).toBe(
      'BCD\n002\n1\nSCT\nXXXXDEXXXXX\nPrint Shop GmbH\nDE00000000000000000000\nEUR1234.56\n\n\nRE-2026-00001',
    )
  })

  it('formats cent amounts without float artifacts', () => {
    const amount = (cents: number): string =>
      buildEpcQrPayload({ bic: 'B', name: 'N', iban: 'DE1', amountCents: cents, reference: 'R' }).split('\n')[7]!
    expect(amount(1)).toBe('EUR0.01')
    expect(amount(100)).toBe('EUR1.00')
    expect(amount(5490)).toBe('EUR54.90')
    expect(amount(99999999)).toBe('EUR999999.99')
  })
})

describe('recipientLines', () => {
  const base = {
    company: null,
    firstName: 'Erika',
    lastName: 'Musterfrau',
    street: 'Beispielweg 2',
    zip: '54321',
    city: 'Hamburg',
    country: 'DE',
  }

  it('omits the country line for domestic addresses', () => {
    expect(recipientLines(base, true)).toEqual(['Erika Musterfrau', 'Beispielweg 2', '54321 Hamburg'])
  })

  it('adds a localized uppercase country line for foreign addresses', () => {
    expect(recipientLines({ ...base, country: 'PL' }, true)).toContain('POLEN')
    expect(recipientLines({ ...base, country: 'PL' }, false)).toContain('POLAND')
  })

  it('includes the company as the first line when present', () => {
    expect(recipientLines({ ...base, company: 'ACME GmbH' }, true)[0]).toBe('ACME GmbH')
  })

  it('falls back to the raw code when Intl rejects the region', () => {
    expect(recipientLines({ ...base, country: 'X1' }, true)).toContain('X1')
  })
})

describe('payment state helpers', () => {
  it('isInvoicePaid handles paid, unpaid and missing payments', () => {
    expect(isInvoicePaid([{ status: 'paid' }])).toBe(true)
    expect(isInvoicePaid([{ status: 'pending' }])).toBe(false)
    expect(isInvoicePaid([])).toBe(false)
    expect(isInvoicePaid(undefined)).toBe(false)
  })

  it('shouldShowGiroCode only for unpaid bank transfers with known payments', () => {
    expect(shouldShowGiroCode({ paymentMethod: 'bank_transfer' }, [{ status: 'pending' }])).toBe(true)
    expect(shouldShowGiroCode({ paymentMethod: 'bank_transfer' }, [{ status: 'paid' }])).toBe(false)
    expect(shouldShowGiroCode({ paymentMethod: 'bank_transfer' }, undefined)).toBe(false)
    expect(shouldShowGiroCode({ paymentMethod: 'stripe' }, [{ status: 'pending' }])).toBe(false)
    // [] (known, no payments) is not "paid" and not undefined → still eligible
    expect(shouldShowGiroCode({ paymentMethod: 'bank_transfer' }, [])).toBe(true)
  })
})

describe('formatInvoiceDate', () => {
  it('uses German and English formats', () => {
    const d = new Date('2026-07-04T10:00:00Z')
    expect(formatInvoiceDate(d, true)).toBe('04.07.2026')
    expect(formatInvoiceDate(d, false)).toBe('04 Jul 2026')
  })

  it('pins the calendar date to Europe/Berlin regardless of the runner timezone', () => {
    // 23:30 UTC is already the next day in Berlin (CEST, +2) — the printed
    // Rechnungsdatum must not depend on where the server happens to run.
    const nearMidnight = new Date('2026-06-30T23:30:00Z')
    expect(formatInvoiceDate(nearMidnight, true)).toBe('01.07.2026')
  })
})

describe('renderInvoicePdf', () => {
  it('renders a single-page PDF for a small invoice', async () => {
    const pdf = await renderToBuffer({ invoice: makeInvoice(), order: makeOrder(), company })
    expect(pdf.subarray(0, 4).toString()).toBe('%PDF')
    expect(pageCount(pdf)).toBe(1)
  })

  it('prints the §19 UStG note only when vatExempt', async () => {
    const exempt = await renderToBuffer(
      { invoice: makeInvoice(), order: makeOrder(), company: { ...company, vatExempt: true } },
      { compress: false },
    )
    const liable = await renderToBuffer(
      { invoice: makeInvoice(), order: makeOrder(), company: { ...company, vatExempt: false } },
      { compress: false },
    )
    expect(extractText(exempt)).toMatch(/§\s*19 UStG/)
    expect(extractText(liable)).not.toMatch(/§\s*19 UStG/)
  })

  it('paginates long item lists with repeated table headers', async () => {
    const pdf = await renderToBuffer(
      { invoice: makeInvoice(), order: makeOrder({ items: makeItems(60) }), company },
      { compress: false },
    )
    const pages = pageCount(pdf)
    expect(pages).toBeGreaterThanOrEqual(2)
    // The 'Beschreibung' column header is redrawn at the top of every page, so
    // it must appear once per page — proving the header actually repeats.
    const headerCount = (extractText(pdf).match(/Beschreibung/g) ?? []).length
    expect(headerCount).toBe(pages)
  })

  it('renders the unpaid bank-transfer variant with a GiroCode', async () => {
    const invoice = makeInvoice()
    const qrPng = await QRCode.toBuffer(
      buildEpcQrPayload({
        bic: company.bic,
        name: company.accountHolder,
        iban: company.iban,
        amountCents: invoice.totalCents,
        reference: invoice.number,
      }),
      { type: 'png', errorCorrectionLevel: 'M', margin: 0, scale: 4 },
    )
    const pdf = await renderToBuffer({ invoice, order: makeOrder(), company, qrPng })
    expect(pdf.subarray(0, 4).toString()).toBe('%PDF')
  })

  it('renders paid invoices and the English locale', async () => {
    const pdf = await renderToBuffer({
      invoice: makeInvoice({ locale: 'en', paymentMethod: 'stripe' } as Partial<Invoice>),
      order: makeOrder({
        payments: [{ id: 'p1', status: 'paid' }],
        country: 'PL',
        company: 'ACME Sp. z o.o.',
        shippedAt: new Date('2026-07-03T10:00:00Z'),
      }),
      company,
    })
    expect(pdf.subarray(0, 4).toString()).toBe('%PDF')
    expect(pageCount(pdf)).toBe(1)
  })
})
