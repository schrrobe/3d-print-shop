import type { InvoiceCorrection } from '@prisma/client'
import PDFDocument from 'pdfkit'
import { describe, expect, it, vi } from 'vitest'

vi.mock('../src/lib/prisma.js', () => {
  let last = 0
  const tx = {
    invoiceCorrectionCounter: {
      upsert: vi.fn(async () => ({ year: new Date().getFullYear(), lastSequence: ++last })),
    },
    invoiceCorrection: {
      create: vi.fn(async ({ data }: { data: object }) => ({ id: 'rk1', ...data })),
    },
  }
  return {
    prisma: {
      ...tx,
      invoiceCorrection: { ...tx.invoiceCorrection, findUnique: vi.fn().mockResolvedValue(null) },
      $transaction: vi.fn((fn: (t: unknown) => unknown) => fn(tx)),
    },
  }
})

const { createInvoiceCorrection } = await import('../src/services/invoice-correction.js')
const { renderInvoiceCorrectionPdf } = await import('../src/services/invoice-correction-pdf.js')

describe('createInvoiceCorrection', () => {
  it('numbers corrections RK-<year>-<hash> from their own counter', async () => {
    const a = await createInvoiceCorrection({
      id: 'ref_1',
      amountCents: 1234,
      reason: 'Kratzer',
      invoice: { id: 'inv_1', locale: 'de' },
    })
    const b = await createInvoiceCorrection({
      id: 'ref_2',
      amountCents: 1,
      reason: null,
      invoice: { id: 'inv_1', locale: 'de' },
    })
    expect(a.number).toMatch(/^RK-\d{4}-[0-9A-HJKMNP-TV-Z]{6}$/)
    expect(b.number).not.toBe(a.number)
    expect(a).toMatchObject({ refundId: 'ref_1', invoiceId: 'inv_1', amountCents: 1234 })
  })
})

/** See invoice-pdf.test.ts: rejoins the hex text chunks of an uncompressed PDF. */
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

describe('renderInvoiceCorrectionPdf', () => {
  it('prints the negative amount and references the original invoice', async () => {
    const doc = new PDFDocument({ size: 'A4', margin: 0, bufferPages: true, compress: false })
    const chunks: Buffer[] = []
    doc.on('data', (c: Buffer) => chunks.push(c))
    const done = new Promise<Buffer>((resolve) =>
      doc.on('end', () => resolve(Buffer.concat(chunks))),
    )
    renderInvoiceCorrectionPdf(doc, {
      correction: {
        id: 'rk1',
        number: 'RK-2026-ABC123',
        locale: 'de',
        amountCents: 1234,
        reason: 'Kratzer am Deckel',
        issuedAt: new Date('2026-08-01T10:00:00Z'),
      } as InvoiceCorrection,
      invoice: {
        number: 'RE-2026-7Q3K9X',
        issuedAt: new Date('2026-07-04T10:00:00Z'),
        paymentMethod: 'stripe',
      },
      order: {
        orderNumber: 'PS-1',
        firstName: 'Max',
        lastName: 'Kunde',
        company: null,
        street: 'Weg 1',
        zip: '12345',
        city: 'Berlin',
        country: 'DE',
        items: [],
      } as never,
      company: {
        name: 'Shop',
        street: 'Str. 1',
        zip: '10115',
        city: 'Berlin',
        email: 'a@b.de',
        phone: '',
        website: '',
        taxNumber: '1/2/3',
        owner: 'Inhaber',
        iban: 'DE00',
        bic: 'X',
        accountHolder: 'Shop',
        paymentTermsDays: 14,
        vatExempt: true,
      },
      provider: 'stripe',
    })
    doc.end()
    const text = extractText(await done)

    expect(text).toContain('Rechnungskorrektur RK-2026-ABC123')
    expect(text).toContain('Erstattung zu Rechnung RE-2026-7Q3K9X')
    expect(text).toContain('RE-2026-7Q3K9X vom 04.07.2026')
    expect(text).toMatch(/-12,34/)
    expect(text).toContain('§ 19 UStG')
    expect(text).toContain('Kratzer am Deckel')
  })
})
