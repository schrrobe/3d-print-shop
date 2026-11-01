import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  renderAdminNotification,
  renderInvoice,
  renderOrderConfirmation,
  renderPasswordReset,
  renderPaymentReceived,
  renderProductionStarted,
  renderQuoteAccepted,
  renderQuoteAvailable,
  renderShippingConfirmation,
  renderUploadReceived,
  renderWithdrawalReceived,
} from '../src/index.js'

const orderData = {
  orderNumber: 'PS-2026-00000001',
  firstName: 'Max',
  totalCents: 4998,
  orderUrl: 'https://shop.example/order/PS-2026-00000001?token=abc',
  items: [{ name: 'Spiral Vase', quantity: 2, unitPriceCents: 2499 }],
  legal: {
    name: 'Muster Shop',
    street: 'Teststr. 1',
    zip: '12345',
    city: 'Teststadt',
    email: 'shop@example.com',
    withdrawUrl: 'https://shop.example/withdraw',
  },
}

describe('email templates', () => {
  afterEach(() => vi.unstubAllEnvs())

  it('uses the configured company details in the footer', () => {
    vi.stubEnv('COMPANY_NAME', 'Robert Schreiner')
    vi.stubEnv('COMPANY_STREET', 'Kapitelwiese 14')
    vi.stubEnv('COMPANY_ZIP', '44263')
    vi.stubEnv('COMPANY_CITY', 'Dortmund')

    const rendered = renderOrderConfirmation(orderData, 'de')
    expect(rendered.html).toContain('Robert Schreiner · Kapitelwiese 14 · 44263 Dortmund')
  })

  it('renders the shop wordmark and default company name', () => {
    const rendered = renderOrderConfirmation(orderData, 'de')
    expect(rendered.html).toContain('>kaliber</span>')
    expect(rendered.html).toContain('Print Shop GmbH')
  })

  it('renders order confirmation in de and en', () => {
    const de = renderOrderConfirmation(orderData, 'de')
    expect(de.subject).toContain('Bestellbestätigung')
    expect(de.html).toContain('PS-2026-00000001')
    expect(de.html).toContain('49,98')

    const en = renderOrderConfirmation(orderData, 'en')
    expect(en.subject).toContain('Order confirmation')
  })

  it('falls back to English for untranslated locales', () => {
    const pl = renderOrderConfirmation(orderData, 'pl')
    expect(pl.subject).toContain('Order confirmation')
  })

  it('escapes HTML in user-provided values', () => {
    const rendered = renderUploadReceived(
      { name: '<script>alert(1)</script>', requestId: 'qr_1', files: ['a.stl'] },
      'de',
    )
    expect(rendered.html).not.toContain('<script>alert(1)</script>')
    expect(rendered.html).toContain('&lt;script&gt;')
  })

  it('renders all 10 templates without throwing', () => {
    expect(renderOrderConfirmation(orderData, 'de').html).toBeTruthy()
    expect(renderPaymentReceived(orderData, 'de').html).toBeTruthy()
    expect(
      renderUploadReceived({ name: 'Max', requestId: 'q', files: ['a.stl'] }, 'de').html,
    ).toBeTruthy()
    expect(
      renderQuoteAvailable(
        { name: 'Max', priceCents: 100, quoteUrl: 'https://x', validUntil: '2026-07-16' },
        'de',
      ).html,
    ).toBeTruthy()
    expect(
      renderQuoteAccepted({ name: 'Max', priceCents: 100, paymentUrl: 'https://x' }, 'de').html,
    ).toBeTruthy()
    expect(renderProductionStarted(orderData, 'de').html).toBeTruthy()
    expect(
      renderShippingConfirmation({ ...orderData, carrier: 'dhl', trackingNumber: 'T123' }, 'de')
        .html,
    ).toBeTruthy()
    expect(
      renderInvoice(
        {
          orderNumber: 'PS-1',
          invoiceNumber: 'RE-2026-00001',
          totalCents: 100,
          orderUrl: 'https://x',
        },
        'de',
      ).html,
    ).toBeTruthy()
    expect(renderPasswordReset({ name: 'Max', resetUrl: 'https://x' }, 'de').html).toBeTruthy()
    expect(
      renderAdminNotification(
        { event: 'Neue Bestellung', detail: 'x', adminUrl: 'https://x' },
        'de',
      ).html,
    ).toBeTruthy()
  })

  it('attaches terms and withdrawal policy to the order confirmation (§ 312f Abs. 2 BGB)', () => {
    for (const locale of ['de', 'en'] as const) {
      const { html, text } = renderOrderConfirmation(orderData, locale)
      expect(html).toContain('Allgemeine Geschäftsbedingungen')
      expect(html).toContain('Muster-Widerrufsformular')
      expect(html).toContain('https://shop.example/withdraw')
      expect(text).toContain('An Muster Shop')
      expect(text).not.toMatch(/\{(name|street|zip|city|email|withdrawUrl)\}/)
    }
  })

  it('confirms an online withdrawal with content and date/time (§ 356a Abs. 4 BGB)', () => {
    const rendered = renderWithdrawalReceived(
      {
        name: 'Max <b>',
        email: 'max@example.com',
        orderNumber: 'PS-2026-1',
        items: '1x 9 mm Box',
        receivedAt: new Date('2026-10-31T12:34:56Z'),
        ticketNumber: 'TIC-1',
      },
      'de',
    )
    expect(rendered.subject).toContain('PS-2026-1')
    expect(rendered.html).toContain('1x 9 mm Box')
    expect(rendered.html).toContain('13:34:56')
    expect(rendered.html).toContain('Max &lt;b&gt;')
    expect(rendered.text).toContain('Hiermit widerrufe ich')
  })
})
