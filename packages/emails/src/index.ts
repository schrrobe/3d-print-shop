import type { Locale } from '@print-shop/types'
import { formatCents } from '@print-shop/utils'
import { button, emailLayout, escapeHtml, paragraph } from './layout.js'

export interface RenderedEmail {
  subject: string
  html: string
  text: string
}

export type EmailTemplateName =
  | 'order_confirmation'
  | 'payment_received'
  | 'upload_received'
  | 'quote_available'
  | 'quote_accepted'
  | 'production_started'
  | 'shipping_confirmation'
  | 'invoice'
  | 'password_reset'
  | 'admin_notification'

/**
 * i18n: de + en are fully translated; the remaining shop locales (pl, fr, nl, cs)
 * fall back to English until translations are provided.
 */
function pick(locale: Locale, de: string, en: string): string {
  return locale === 'de' ? de : en
}

export interface OrderEmailData {
  orderNumber: string
  firstName: string
  totalCents: number
  orderUrl: string
  items: { name: string; quantity: number; unitPriceCents: number }[]
}

function itemsTable(items: OrderEmailData['items'], locale: Locale): string {
  const rows = items
    .map(
      (i) =>
        `<tr><td style="padding:4px 8px 4px 0;">${i.quantity}× ${escapeHtml(i.name)}</td><td style="text-align:right;">${formatCents(i.unitPriceCents * i.quantity, locale)}</td></tr>`,
    )
    .join('')
  return `<table style="width:100%;font-size:14px;margin:12px 0;">${rows}</table>`
}

export function renderOrderConfirmation(data: OrderEmailData, locale: Locale): RenderedEmail {
  const subject = pick(
    locale,
    `Bestellbestätigung ${data.orderNumber}`,
    `Order confirmation ${data.orderNumber}`,
  )
  const title = pick(locale, 'Danke für deine Bestellung!', 'Thank you for your order!')
  const html = emailLayout(
    title,
    paragraph(pick(locale, `Hallo ${escapeHtml(data.firstName)},`, `Hi ${escapeHtml(data.firstName)},`)) +
      paragraph(
        pick(
          locale,
          `wir haben deine Bestellung <strong>${data.orderNumber}</strong> erhalten.`,
          `we received your order <strong>${data.orderNumber}</strong>.`,
        ),
      ) +
      itemsTable(data.items, locale) +
      paragraph(
        pick(locale, 'Gesamtbetrag: ', 'Total: ') + `<strong>${formatCents(data.totalCents, locale)}</strong>`,
      ) +
      button(data.orderUrl, pick(locale, 'Bestellung ansehen', 'View order')),
  )
  const text = `${title}\n${data.orderNumber}\n${data.orderUrl}`
  return { subject, html, text }
}

export function renderPaymentReceived(data: OrderEmailData, locale: Locale): RenderedEmail {
  const subject = pick(
    locale,
    `Zahlung erhalten für ${data.orderNumber}`,
    `Payment received for ${data.orderNumber}`,
  )
  const title = pick(locale, 'Zahlung erhalten', 'Payment received')
  const html = emailLayout(
    title,
    paragraph(
      pick(
        locale,
        `deine Zahlung über <strong>${formatCents(data.totalCents, locale)}</strong> ist eingegangen. Deine Bestellung geht jetzt in die Produktion.`,
        `your payment of <strong>${formatCents(data.totalCents, locale)}</strong> has arrived. Your order is now queued for production.`,
      ),
    ) + button(data.orderUrl, pick(locale, 'Bestellstatus ansehen', 'View order status')),
  )
  return { subject, html, text: `${title}: ${data.orderNumber}` }
}

export interface UploadReceivedData {
  name: string
  requestId: string
  files: string[]
}

export function renderUploadReceived(data: UploadReceivedData, locale: Locale): RenderedEmail {
  const subject = pick(locale, 'Deine Upload-Anfrage ist eingegangen', 'We received your upload request')
  const title = pick(locale, 'Upload erhalten', 'Upload received')
  const html = emailLayout(
    title,
    paragraph(pick(locale, `Hallo ${escapeHtml(data.name)},`, `Hi ${escapeHtml(data.name)},`)) +
      paragraph(
        pick(
          locale,
          'wir haben deine 3D-Dateien erhalten und prüfen sie. Du bekommst in Kürze ein individuelles Angebot.',
          'we received your 3D files and are reviewing them. You will receive an individual quote shortly.',
        ),
      ) +
      paragraph(data.files.map(escapeHtml).join('<br>')),
  )
  return { subject, html, text: `${title}: ${data.files.join(', ')}` }
}

export interface QuoteEmailData {
  name: string
  priceCents: number
  quoteUrl: string
  validUntil: string
  message?: string
}

export function renderQuoteAvailable(data: QuoteEmailData, locale: Locale): RenderedEmail {
  const subject = pick(locale, 'Dein Angebot ist da', 'Your quote is ready')
  const title = pick(locale, 'Dein individuelles Angebot', 'Your individual quote')
  const html = emailLayout(
    title,
    paragraph(pick(locale, `Hallo ${escapeHtml(data.name)},`, `Hi ${escapeHtml(data.name)},`)) +
      paragraph(
        pick(
          locale,
          `wir haben deine Anfrage geprüft. Dein Preis: <strong>${formatCents(data.priceCents, locale)}</strong> (gültig bis ${data.validUntil}).`,
          `we reviewed your request. Your price: <strong>${formatCents(data.priceCents, locale)}</strong> (valid until ${data.validUntil}).`,
        ),
      ) +
      (data.message ? paragraph(escapeHtml(data.message)) : '') +
      button(data.quoteUrl, pick(locale, 'Angebot ansehen & annehmen', 'View & accept quote')),
  )
  return { subject, html, text: `${title}: ${data.quoteUrl}` }
}

export interface QuoteAcceptedData {
  name: string
  priceCents: number
  paymentUrl: string
}

export function renderQuoteAccepted(data: QuoteAcceptedData, locale: Locale): RenderedEmail {
  const subject = pick(locale, 'Angebot angenommen — jetzt bezahlen', 'Quote accepted — complete payment')
  const title = pick(locale, 'Angebot angenommen', 'Quote accepted')
  const html = emailLayout(
    title,
    paragraph(
      pick(
        locale,
        `danke ${escapeHtml(data.name)}! Sobald deine Zahlung über ${formatCents(data.priceCents, locale)} eingeht, starten wir die Produktion.`,
        `thank you ${escapeHtml(data.name)}! As soon as your payment of ${formatCents(data.priceCents, locale)} arrives we will start production.`,
      ),
    ) + button(data.paymentUrl, pick(locale, 'Jetzt bezahlen', 'Pay now')),
  )
  return { subject, html, text: `${title}: ${data.paymentUrl}` }
}

export function renderProductionStarted(data: OrderEmailData, locale: Locale): RenderedEmail {
  const subject = pick(
    locale,
    `Produktion gestartet für ${data.orderNumber}`,
    `Production started for ${data.orderNumber}`,
  )
  const title = pick(locale, 'Produktion gestartet', 'Production started')
  const html = emailLayout(
    title,
    paragraph(
      pick(
        locale,
        'dein Auftrag wird jetzt gedruckt. Wir melden uns, sobald er versandbereit ist.',
        'your order is being printed now. We will let you know once it ships.',
      ),
    ) + button(data.orderUrl, pick(locale, 'Status ansehen', 'View status')),
  )
  return { subject, html, text: `${title}: ${data.orderNumber}` }
}

export interface ShippingEmailData extends OrderEmailData {
  carrier: string
  trackingNumber: string
}

export function renderShippingConfirmation(data: ShippingEmailData, locale: Locale): RenderedEmail {
  const subject = pick(
    locale,
    `Deine Bestellung ${data.orderNumber} ist unterwegs`,
    `Your order ${data.orderNumber} has shipped`,
  )
  const title = pick(locale, 'Versandbestätigung', 'Shipping confirmation')
  const html = emailLayout(
    title,
    paragraph(
      pick(
        locale,
        `dein Paket ist mit ${data.carrier.toUpperCase()} unterwegs. Sendungsnummer: <strong>${escapeHtml(data.trackingNumber)}</strong>`,
        `your parcel is on its way with ${data.carrier.toUpperCase()}. Tracking number: <strong>${escapeHtml(data.trackingNumber)}</strong>`,
      ),
    ) + button(data.orderUrl, pick(locale, 'Bestellung ansehen', 'View order')),
  )
  return { subject, html, text: `${title}: ${data.trackingNumber}` }
}

export interface InvoiceEmailData {
  orderNumber: string
  invoiceNumber: string
  totalCents: number
  orderUrl: string
}

export function renderInvoice(data: InvoiceEmailData, locale: Locale): RenderedEmail {
  const subject = pick(locale, `Rechnung ${data.invoiceNumber}`, `Invoice ${data.invoiceNumber}`)
  const title = pick(locale, 'Deine Rechnung', 'Your invoice')
  const html = emailLayout(
    title,
    paragraph(
      pick(
        locale,
        `im Anhang findest du die Rechnung <strong>${data.invoiceNumber}</strong> zu deiner Bestellung ${data.orderNumber} über ${formatCents(data.totalCents, locale)}.`,
        `attached you find invoice <strong>${data.invoiceNumber}</strong> for your order ${data.orderNumber} over ${formatCents(data.totalCents, locale)}.`,
      ),
    ),
  )
  return { subject, html, text: `${title}: ${data.invoiceNumber}` }
}

export interface PasswordResetData {
  name: string
  resetUrl: string
}

export function renderPasswordReset(data: PasswordResetData, locale: Locale): RenderedEmail {
  const subject = pick(locale, 'Passwort zurücksetzen', 'Reset your password')
  const title = subject
  const html = emailLayout(
    title,
    paragraph(pick(locale, `Hallo ${escapeHtml(data.name)},`, `Hi ${escapeHtml(data.name)},`)) +
      paragraph(
        pick(
          locale,
          'klicke auf den Button, um ein neues Passwort zu vergeben. Der Link ist 1 Stunde gültig.',
          'click the button to set a new password. The link is valid for 1 hour.',
        ),
      ) +
      button(data.resetUrl, pick(locale, 'Neues Passwort vergeben', 'Set new password')),
  )
  return { subject, html, text: `${title}: ${data.resetUrl}` }
}

export interface AdminNotificationData {
  event: string
  detail: string
  adminUrl: string
}

export function renderAdminNotification(data: AdminNotificationData, _locale: Locale): RenderedEmail {
  const subject = `[Admin] ${data.event}`
  const html = emailLayout(
    data.event,
    paragraph(escapeHtml(data.detail)) + button(data.adminUrl, 'Open admin'),
  )
  return { subject, html, text: `${data.event}: ${data.detail}` }
}
