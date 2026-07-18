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
} from '../src/index.js'

const orderData = {
  orderNumber: 'PS-2026-00000001',
  firstName: 'Max',
  totalCents: 4998,
  orderUrl: 'https://shop.example/order/PS-2026-00000001?token=abc',
  items: [{ name: 'Spiral Vase', quantity: 2, unitPriceCents: 2499 }],
}

describe('email templates', () => {
  afterEach(() => vi.unstubAllEnvs())

  it('uses the configured company details in the header and footer', () => {
    vi.stubEnv('COMPANY_NAME', 'Robert Schreiner')
    vi.stubEnv('COMPANY_STREET', 'Kapitelwiese 14')
    vi.stubEnv('COMPANY_ZIP', '44263')
    vi.stubEnv('COMPANY_CITY', 'Dortmund')

    const rendered = renderOrderConfirmation(orderData, 'de')
    expect(rendered.html).toContain('● Robert Schreiner')
    expect(rendered.html).toContain('Robert Schreiner · Kapitelwiese 14 · 44263 Dortmund')
  })

  it('uses the same default company name in the header and footer', () => {
    const rendered = renderOrderConfirmation(orderData, 'de')
    expect(rendered.html).toContain('● Print Shop GmbH')
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
})
