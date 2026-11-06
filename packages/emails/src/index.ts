import type { ComplaintStatus, Locale } from '@print-shop/types'
import { formatCents, getLegalDocument, type LegalCompany } from '@print-shop/utils'
import { button, emailLayout, escapeHtml, paragraph } from './layout.js'

export { type EmailCompany, setEmailCompany } from './layout.js'

export interface RenderedEmail {
  subject: string
  html: string
  text: string
}

export type EmailTemplateName =
  | 'order_confirmation'
  | 'payment_received'
  | 'payment_reminder'
  | 'upload_received'
  | 'quote_available'
  | 'quote_accepted'
  | 'payment_link'
  | 'production_started'
  | 'shipping_confirmation'
  | 'invoice'
  | 'invoice_correction'
  | 'password_reset'
  | 'admin_notification'
  | 'ticket_created'
  | 'ticket_reply'
  | 'ticket_customer_reply'
  | 'complaint_received'
  | 'complaint_updated'
  | 'magic_link'
  | 'review_request'
  | 'review_submitted'
  | 'review_approved'
  | 'withdrawal_received'

/**
 * i18n: customer emails exist in every shop locale; a missing translation is a
 * type error. Attached documents (invoice PDF, AGB/Widerruf) stay German.
 * French addresses the customer with "vous", all other locales informally.
 */
type Texts = Record<Locale, string>

function pick(locale: Locale, texts: Texts): string {
  return texts[locale]
}

/** Czech has no greeting with the name: the vocative case can't be derived from it. */
function greeting(name: string, locale: Locale): string {
  const n = escapeHtml(name)
  return paragraph(
    pick(locale, {
      de: `Hallo ${n},`,
      en: `Hi ${n},`,
      pl: `Cześć ${n},`,
      fr: `Bonjour ${n},`,
      nl: `Hoi ${n},`,
      cs: 'Ahoj,',
      it: `Ciao ${n},`,
    }),
  )
}

const viewOrder: Texts = {
  de: 'Bestellung ansehen',
  en: 'View order',
  pl: 'Zobacz zamówienie',
  fr: 'Voir la commande',
  nl: 'Bestelling bekijken',
  cs: 'Zobrazit objednávku',
  it: 'Vedi ordine',
}

const viewStatus: Texts = {
  de: 'Status ansehen',
  en: 'View status',
  pl: 'Zobacz status',
  fr: 'Voir le statut',
  nl: 'Status bekijken',
  cs: 'Zobrazit stav',
  it: 'Vedi stato',
}

const payNow: Texts = {
  de: 'Jetzt bezahlen',
  en: 'Pay now',
  pl: 'Zapłać teraz',
  fr: 'Payer maintenant',
  nl: 'Nu betalen',
  cs: 'Zaplatit nyní',
  it: 'Paga ora',
}

const totalLabel: Texts = {
  de: 'Gesamtbetrag: ',
  en: 'Total: ',
  pl: 'Razem: ',
  fr: 'Total : ',
  nl: 'Totaal: ',
  cs: 'Celkem: ',
  it: 'Totale: ',
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
  return `<table style="width:100%;font-size:16px;margin:12px 0;font-variant-numeric:tabular-nums;">${rows}</table>`
}

/**
 * AGB + Widerrufsbelehrung incl. Muster-Formular on a durable medium (§ 312f Abs. 2 BGB).
 * Always the binding German version. `termsOnly` for custom-made orders without withdrawal right.
 */
function contractDocuments(
  company: LegalCompany,
  locale: Locale,
  { termsOnly = false } = {},
): { html: string; text: string } {
  const docs = [
    ['Allgemeine Geschäftsbedingungen', getLegalDocument('de', 'terms', company)],
    ...(termsOnly
      ? []
      : ([['Widerrufsbelehrung', getLegalDocument('de', 'withdrawal', company)]] as const)),
  ] as const
  const blocks = docs.flatMap(([title, doc]) =>
    doc
      ? [
          {
            title,
            parts: [
              doc.updatedAt,
              ...doc.sections.flatMap((s) => [s.heading, ...s.paragraphs, ...(s.form ?? [])]),
            ],
          },
        ]
      : [],
  )
  const intro = pick(
    locale,
    termsOnly
      ? {
          de: 'Unsere AGB zu deiner Bestellung:',
          en: 'Our terms for your order (binding German version):',
          pl: 'Nasz regulamin dla Twojego zamówienia (wiążąca wersja niemiecka):',
          fr: 'Nos CGV pour votre commande (version allemande faisant foi) :',
          nl: 'Onze algemene voorwaarden voor je bestelling (bindende Duitse versie):',
          cs: 'Naše obchodní podmínky k tvé objednávce (závazné německé znění):',
          it: 'Le nostre condizioni generali per il tuo ordine (versione tedesca vincolante):',
        }
      : {
          de: 'Unsere AGB und die Widerrufsbelehrung zu deiner Bestellung:',
          en: 'Our terms and withdrawal policy for your order (binding German version):',
          pl: 'Nasz regulamin i pouczenie o odstąpieniu od umowy dla Twojego zamówienia (wiążąca wersja niemiecka):',
          fr: 'Nos CGV et les informations sur le droit de rétractation pour votre commande (version allemande faisant foi) :',
          nl: 'Onze algemene voorwaarden en informatie over het herroepingsrecht voor je bestelling (bindende Duitse versie):',
          cs: 'Naše obchodní podmínky a poučení o odstoupení od smlouvy k tvé objednávce (závazné německé znění):',
          it: "Le nostre condizioni generali e l'informativa sul recesso per il tuo ordine (versione tedesca vincolante):",
        },
  )
  const html =
    paragraph(`<strong>${intro}</strong>`) +
    blocks
      .map(
        (b) =>
          `<h2 style="font-size:18px;margin:24px 0 8px;">${b.title}</h2>` +
          b.parts
            .map(
              (p) =>
                `<p style="font-size:13px;line-height:1.5;margin:0 0 8px;">${escapeHtml(p).replace(/\n/g, '<br>')}</p>`,
            )
            .join(''),
      )
      .join('')
  const text = [intro, ...blocks.map((b) => [b.title, ...b.parts].join('\n\n'))].join('\n\n')
  return { html, text }
}

export interface OrderConfirmationData extends OrderEmailData {
  /** Company data for the attached contract documents. */
  legal: LegalCompany
}

export function renderOrderConfirmation(
  data: OrderConfirmationData,
  locale: Locale,
): RenderedEmail {
  const n = data.orderNumber
  const subject = pick(locale, {
    de: `Bestellbestätigung ${n}`,
    en: `Order confirmation ${n}`,
    pl: `Potwierdzenie zamówienia ${n}`,
    fr: `Confirmation de commande ${n}`,
    nl: `Orderbevestiging ${n}`,
    cs: `Potvrzení objednávky ${n}`,
    it: `Conferma d'ordine ${n}`,
  })
  const title = pick(locale, {
    de: 'Danke für deine Bestellung!',
    en: 'Thank you for your order!',
    pl: 'Dziękujemy za zamówienie!',
    fr: 'Merci pour votre commande !',
    nl: 'Bedankt voor je bestelling!',
    cs: 'Děkujeme za objednávku!',
    it: 'Grazie per il tuo ordine!',
  })
  const documents = contractDocuments(data.legal, locale)
  const html = emailLayout(
    title,
    greeting(data.firstName, locale) +
      paragraph(
        pick(locale, {
          de: `wir haben deine Bestellung <strong>${n}</strong> erhalten.`,
          en: `we received your order <strong>${n}</strong>.`,
          pl: `Otrzymaliśmy Twoje zamówienie <strong>${n}</strong>.`,
          fr: `Nous avons bien reçu votre commande <strong>${n}</strong>.`,
          nl: `We hebben je bestelling <strong>${n}</strong> ontvangen.`,
          cs: `přijali jsme tvoji objednávku <strong>${n}</strong>.`,
          it: `abbiamo ricevuto il tuo ordine <strong>${n}</strong>.`,
        }),
      ) +
      itemsTable(data.items, locale) +
      paragraph(
        pick(locale, totalLabel) + `<strong>${formatCents(data.totalCents, locale)}</strong>`,
      ) +
      button(data.orderUrl, pick(locale, viewOrder)) +
      documents.html,
  )
  const text = `${title}\n${n}\n${data.orderUrl}\n\n${documents.text}`
  return { subject, html, text }
}

export function renderPaymentReceived(data: OrderEmailData, locale: Locale): RenderedEmail {
  const n = data.orderNumber
  const total = formatCents(data.totalCents, locale)
  const subject = pick(locale, {
    de: `Zahlung erhalten für ${n}`,
    en: `Payment received for ${n}`,
    pl: `Otrzymaliśmy płatność za zamówienie ${n}`,
    fr: `Paiement reçu pour la commande ${n}`,
    nl: `Betaling ontvangen voor ${n}`,
    cs: `Platba za objednávku ${n} přijata`,
    it: `Pagamento ricevuto per l'ordine ${n}`,
  })
  const title = pick(locale, {
    de: 'Zahlung erhalten',
    en: 'Payment received',
    pl: 'Płatność otrzymana',
    fr: 'Paiement reçu',
    nl: 'Betaling ontvangen',
    cs: 'Platba přijata',
    it: 'Pagamento ricevuto',
  })
  const html = emailLayout(
    title,
    paragraph(
      pick(locale, {
        de: `Deine Zahlung über <strong>${total}</strong> ist eingegangen. Deine Bestellung geht jetzt in die Produktion.`,
        en: `Your payment of <strong>${total}</strong> has arrived. Your order is now queued for production.`,
        pl: `Twoja płatność w wysokości <strong>${total}</strong> do nas dotarła. Zamówienie trafia teraz do produkcji.`,
        fr: `Votre paiement de <strong>${total}</strong> nous est bien parvenu. Votre commande passe maintenant en production.`,
        nl: `Je betaling van <strong>${total}</strong> is binnen. Je bestelling gaat nu in productie.`,
        cs: `Tvoje platba ve výši <strong>${total}</strong> dorazila. Objednávka teď jde do výroby.`,
        it: `Il tuo pagamento di <strong>${total}</strong> è arrivato. Il tuo ordine passa ora in produzione.`,
      }),
    ) +
      button(
        data.orderUrl,
        pick(locale, {
          de: 'Bestellstatus ansehen',
          en: 'View order status',
          pl: 'Zobacz status zamówienia',
          fr: 'Voir le statut de la commande',
          nl: 'Bestelstatus bekijken',
          cs: 'Zobrazit stav objednávky',
          it: "Vedi lo stato dell'ordine",
        }),
      ),
  )
  return { subject, html, text: `${title}: ${n}` }
}

/**
 * Manually triggered by an admin: links to the order page, which offers "Pay now" —
 * or to `paymentUrl` for legacy Stripe Payment Link orders (ADR 0002).
 */
export function renderPaymentReminder(
  data: OrderEmailData & { paymentUrl?: string },
  locale: Locale,
): RenderedEmail {
  const n = data.orderNumber
  const url = data.paymentUrl ?? data.orderUrl
  const total = formatCents(data.totalCents, locale)
  const subject = pick(locale, {
    de: `Zahlung offen für ${n}`,
    en: `Payment pending for ${n}`,
    pl: `Oczekujemy na płatność za zamówienie ${n}`,
    fr: `Paiement en attente pour la commande ${n}`,
    nl: `Betaling openstaand voor ${n}`,
    cs: `Čekáme na platbu za objednávku ${n}`,
    it: `Pagamento in sospeso per l'ordine ${n}`,
  })
  const title = pick(locale, {
    de: 'Zahlung noch offen',
    en: 'Payment still pending',
    pl: 'Płatność wciąż oczekuje',
    fr: 'Paiement toujours en attente',
    nl: 'Betaling nog open',
    cs: 'Platba zatím nedorazila',
    it: 'Pagamento ancora in sospeso',
  })
  const html = emailLayout(
    title,
    greeting(data.firstName, locale) +
      paragraph(
        pick(locale, {
          de: `für deine Bestellung <strong>${n}</strong> über <strong>${total}</strong> ist noch keine Zahlung eingegangen. Über den Button kannst du sie jetzt abschließen.`,
          en: `we have not yet received payment for your order <strong>${n}</strong> of <strong>${total}</strong>. Use the button below to complete it now.`,
          pl: `nie otrzymaliśmy jeszcze płatności za Twoje zamówienie <strong>${n}</strong> na kwotę <strong>${total}</strong>. Możesz ją teraz dokończyć za pomocą przycisku poniżej.`,
          fr: `nous n’avons pas encore reçu le paiement de votre commande <strong>${n}</strong> d’un montant de <strong>${total}</strong>. Vous pouvez le finaliser dès maintenant via le bouton ci-dessous.`,
          nl: `we hebben voor je bestelling <strong>${n}</strong> van <strong>${total}</strong> nog geen betaling ontvangen. Met de knop hieronder kun je die nu afronden.`,
          cs: `k tvé objednávce <strong>${n}</strong> na částku <strong>${total}</strong> jsme zatím neobdrželi platbu. Tlačítkem níže ji můžeš hned dokončit.`,
          it: `non abbiamo ancora ricevuto il pagamento per il tuo ordine <strong>${n}</strong> di <strong>${total}</strong>. Puoi completarlo ora con il pulsante qui sotto.`,
        }),
      ) +
      itemsTable(data.items, locale) +
      button(url, pick(locale, payNow)),
  )
  return { subject, html, text: `${title}: ${n}\n${url}` }
}

export interface UploadReceivedData {
  name: string
  requestId: string
  files: string[]
}

export function renderUploadReceived(data: UploadReceivedData, locale: Locale): RenderedEmail {
  const subject = pick(locale, {
    de: 'Deine Upload-Anfrage ist eingegangen',
    en: 'We received your upload request',
    pl: 'Otrzymaliśmy Twoje pliki',
    fr: 'Nous avons bien reçu votre demande',
    nl: 'We hebben je uploadaanvraag ontvangen',
    cs: 'Tvoje soubory k nám dorazily',
    it: 'Abbiamo ricevuto la tua richiesta',
  })
  const title = pick(locale, {
    de: 'Upload erhalten',
    en: 'Upload received',
    pl: 'Pliki otrzymane',
    fr: 'Fichiers reçus',
    nl: 'Upload ontvangen',
    cs: 'Soubory přijaty',
    it: 'File ricevuti',
  })
  const html = emailLayout(
    title,
    greeting(data.name, locale) +
      paragraph(
        pick(locale, {
          de: 'wir haben deine 3D-Dateien erhalten und prüfen sie. Du bekommst in Kürze ein individuelles Angebot.',
          en: 'we received your 3D files and are reviewing them. You will receive an individual quote shortly.',
          pl: 'Otrzymaliśmy Twoje pliki 3D i właśnie je sprawdzamy. Wkrótce dostaniesz indywidualną ofertę.',
          fr: 'Nous avons bien reçu vos fichiers 3D et nous les examinons. Vous recevrez très bientôt un devis personnalisé.',
          nl: 'We hebben je 3D-bestanden ontvangen en bekijken ze. Je krijgt binnenkort een offerte op maat.',
          cs: 'přijali jsme tvoje 3D soubory a prověřujeme je. Brzy dostaneš individuální nabídku.',
          it: 'abbiamo ricevuto i tuoi file 3D e li stiamo controllando. A breve riceverai un preventivo personalizzato.',
        }),
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
  const price = formatCents(data.priceCents, locale)
  const until = data.validUntil
  const subject = pick(locale, {
    de: 'Dein Angebot ist da',
    en: 'Your quote is ready',
    pl: 'Twoja oferta jest gotowa',
    fr: 'Votre devis est prêt',
    nl: 'Je offerte is klaar',
    cs: 'Tvoje nabídka je připravená',
    it: 'Il tuo preventivo è pronto',
  })
  const title = pick(locale, {
    de: 'Dein Angebot',
    en: 'Your quote',
    pl: 'Twoja oferta',
    fr: 'Votre devis',
    nl: 'Je offerte',
    cs: 'Tvoje nabídka',
    it: 'Il tuo preventivo',
  })
  const html = emailLayout(
    title,
    greeting(data.name, locale) +
      paragraph(
        pick(locale, {
          de: `wir haben deine Anfrage geprüft. Dein Preis: <strong>${price}</strong> (gültig bis ${until}).`,
          en: `we reviewed your request. Your price: <strong>${price}</strong> (valid until ${until}).`,
          pl: `Sprawdziliśmy Twoje zapytanie. Twoja cena: <strong>${price}</strong> (ważna do ${until}).`,
          fr: `Nous avons examiné votre demande. Votre prix : <strong>${price}</strong> (valable jusqu'au ${until}).`,
          nl: `We hebben je aanvraag bekeken. Je prijs: <strong>${price}</strong> (geldig tot ${until}).`,
          cs: `prověřili jsme tvoji poptávku. Tvoje cena: <strong>${price}</strong> (platí do ${until}).`,
          it: `abbiamo esaminato la tua richiesta. Il tuo prezzo: <strong>${price}</strong> (valido fino al ${until}).`,
        }),
      ) +
      (data.message ? paragraph(escapeHtml(data.message)) : '') +
      button(
        data.quoteUrl,
        pick(locale, {
          de: 'Angebot ansehen & annehmen',
          en: 'View & accept quote',
          pl: 'Zobacz i zaakceptuj ofertę',
          fr: 'Voir et accepter le devis',
          nl: 'Offerte bekijken en accepteren',
          cs: 'Zobrazit a přijmout nabídku',
          it: 'Vedi e accetta il preventivo',
        }),
      ),
  )
  return { subject, html, text: `${title}: ${data.quoteUrl}` }
}

export interface QuoteAcceptedData {
  name: string
  priceCents: number
  paymentUrl: string
}

export function renderQuoteAccepted(data: QuoteAcceptedData, locale: Locale): RenderedEmail {
  const name = escapeHtml(data.name)
  const price = formatCents(data.priceCents, locale)
  const subject = pick(locale, {
    de: 'Angebot angenommen, bitte jetzt bezahlen',
    en: 'Quote accepted, please complete payment',
    pl: 'Oferta zaakceptowana, prosimy o płatność',
    fr: 'Devis accepté, il ne reste plus qu’à payer',
    nl: 'Offerte geaccepteerd, rond nu je betaling af',
    cs: 'Nabídka přijata, prosíme o zaplacení',
    it: 'Preventivo accettato, completa il pagamento',
  })
  const title = pick(locale, {
    de: 'Angebot angenommen',
    en: 'Quote accepted',
    pl: 'Oferta zaakceptowana',
    fr: 'Devis accepté',
    nl: 'Offerte geaccepteerd',
    cs: 'Nabídka přijata',
    it: 'Preventivo accettato',
  })
  const html = emailLayout(
    title,
    paragraph(
      pick(locale, {
        de: `Danke ${name}! Sobald deine Zahlung über ${price} eingeht, starten wir die Produktion.`,
        en: `Thank you ${name}! As soon as your payment of ${price} arrives we will start production.`,
        pl: `Dziękujemy, ${name}! Gdy tylko otrzymamy płatność w wysokości ${price}, rozpoczniemy produkcję.`,
        fr: `Merci ${name} ! Dès réception de votre paiement de ${price}, nous lançons la production.`,
        nl: `Bedankt, ${name}! Zodra je betaling van ${price} binnen is, starten we de productie.`,
        cs: `Děkujeme! Jakmile dorazí tvoje platba ve výši ${price}, spustíme výrobu.`,
        it: `Grazie ${name}! Appena riceviamo il tuo pagamento di ${price}, avviamo la produzione.`,
      }),
    ) + button(data.paymentUrl, pick(locale, payNow)),
  )
  return { subject, html, text: `${title}: ${data.paymentUrl}` }
}

export interface CustomMadeLegal {
  termsUrl: string
  /** Company data for the attached terms. */
  legal: LegalCompany
}

/**
 * Admin-Bestellungen are made to order: no right of withdrawal (§ 312g Abs. 2 Nr. 1 BGB).
 * The full terms go along on a durable medium (§ 312f Abs. 2 BGB).
 */
function customMadeNotice(
  { termsUrl, legal }: CustomMadeLegal,
  locale: Locale,
): { html: string; text: string } {
  const text = pick(locale, {
    de: 'Hinweis: Es handelt sich um eine Sonderanfertigung nach deinen Vorgaben. Ein Widerrufsrecht besteht daher nicht (§ 312g Abs. 2 Nr. 1 BGB). Es gelten unsere AGB:',
    en: 'Please note: this is a custom-made item to your specification, so there is no right of withdrawal (§ 312g (2) no. 1 BGB). Our terms and conditions apply:',
    pl: 'Uwaga: jest to produkt wykonany na zamówienie według Twoich wytycznych, dlatego prawo odstąpienia od umowy nie przysługuje (§ 312g ust. 2 pkt 1 BGB). Obowiązuje nasz regulamin:',
    fr: 'Remarque : il s’agit d’une fabrication sur mesure selon vos spécifications ; le droit de rétractation ne s’applique donc pas (§ 312g al. 2 n° 1 BGB). Nos CGV s’appliquent :',
    nl: 'Let op: dit is maatwerk volgens jouw specificaties, daarom geldt er geen herroepingsrecht (§ 312g lid 2 nr. 1 BGB). Onze algemene voorwaarden zijn van toepassing:',
    cs: 'Upozornění: jde o výrobek zhotovený na zakázku podle tvých požadavků, proto nemáš právo na odstoupení od smlouvy (§ 312g odst. 2 č. 1 BGB). Platí naše obchodní podmínky:',
    it: 'Nota: si tratta di un prodotto su misura realizzato secondo le tue indicazioni, pertanto non sussiste il diritto di recesso (§ 312g co. 2 n. 1 BGB). Si applicano le nostre condizioni generali:',
  })
  const terms = contractDocuments(legal, locale, { termsOnly: true })
  return {
    html:
      paragraph(
        `<small>${text} <a href="${escapeHtml(termsUrl)}">${escapeHtml(termsUrl)}</a></small>`,
      ) + terms.html,
    text: `${text} ${termsUrl}\n\n${terms.text}`,
  }
}

export interface PaymentLinkData extends OrderEmailData, CustomMadeLegal {
  shippingCents: number
  paymentUrl: string
}

export function renderPaymentLink(data: PaymentLinkData, locale: Locale): RenderedEmail {
  const n = data.orderNumber
  const subject = pick(locale, {
    de: `Dein Zahlungslink für ${n}`,
    en: `Your payment link for ${n}`,
    pl: `Twój link do płatności za zamówienie ${n}`,
    fr: `Votre lien de paiement pour la commande ${n}`,
    nl: `Je betaallink voor ${n}`,
    cs: `Tvůj platební odkaz k objednávce ${n}`,
    it: `Il tuo link di pagamento per l'ordine ${n}`,
  })
  const title = pick(locale, {
    de: 'Dein Zahlungslink',
    en: 'Your payment link',
    pl: 'Twój link do płatności',
    fr: 'Votre lien de paiement',
    nl: 'Je betaallink',
    cs: 'Tvůj platební odkaz',
    it: 'Il tuo link di pagamento',
  })
  const notice = customMadeNotice(data, locale)
  const html = emailLayout(
    title,
    greeting(data.firstName, locale) +
      paragraph(
        pick(locale, {
          de: `hier ist deine individuelle Bestellung <strong>${n}</strong>. Sobald die Zahlung eingeht, starten wir die Produktion und du bekommst deine Rechnung.`,
          en: `here is your individual order <strong>${n}</strong>. As soon as your payment arrives we start production and send your invoice.`,
          pl: `oto Twoje indywidualne zamówienie <strong>${n}</strong>. Gdy tylko otrzymamy płatność, rozpoczniemy produkcję i wyślemy Ci fakturę.`,
          fr: `voici votre commande personnalisée <strong>${n}</strong>. Dès réception de votre paiement, nous lançons la production et vous envoyons votre facture.`,
          nl: `hier is je individuele bestelling <strong>${n}</strong>. Zodra je betaling binnen is, starten we de productie en ontvang je je factuur.`,
          cs: `tady je tvoje individuální objednávka <strong>${n}</strong>. Jakmile dorazí platba, spustíme výrobu a pošleme ti fakturu.`,
          it: `ecco il tuo ordine personalizzato <strong>${n}</strong>. Appena riceviamo il pagamento, avviamo la produzione e ti inviamo la fattura.`,
        }),
      ) +
      itemsTable(data.items, locale) +
      paragraph(
        pick(locale, {
          de: 'Versand: ',
          en: 'Shipping: ',
          pl: 'Wysyłka: ',
          fr: 'Livraison : ',
          nl: 'Verzending: ',
          cs: 'Doprava: ',
          it: 'Spedizione: ',
        }) + formatCents(data.shippingCents, locale),
      ) +
      paragraph(
        pick(locale, totalLabel) + `<strong>${formatCents(data.totalCents, locale)}</strong>`,
      ) +
      button(data.paymentUrl, pick(locale, payNow)) +
      notice.html,
  )
  const text = `${title}\n${n}\n${data.paymentUrl}\n\n${notice.text}`
  return { subject, html, text }
}

export function renderProductionStarted(data: OrderEmailData, locale: Locale): RenderedEmail {
  const n = data.orderNumber
  const subject = pick(locale, {
    de: `Produktion gestartet für ${n}`,
    en: `Production started for ${n}`,
    pl: `Rozpoczęliśmy produkcję zamówienia ${n}`,
    fr: `Production lancée pour la commande ${n}`,
    nl: `Productie gestart voor ${n}`,
    cs: `Výroba objednávky ${n} začala`,
    it: `Produzione avviata per l'ordine ${n}`,
  })
  const title = pick(locale, {
    de: 'Produktion gestartet',
    en: 'Production started',
    pl: 'Produkcja rozpoczęta',
    fr: 'Production lancée',
    nl: 'Productie gestart',
    cs: 'Výroba zahájena',
    it: 'Produzione avviata',
  })
  const html = emailLayout(
    title,
    paragraph(
      pick(locale, {
        de: 'Dein Auftrag wird jetzt gedruckt. Wir melden uns, sobald er versandbereit ist.',
        en: 'Your order is being printed now. We will let you know once it ships.',
        pl: 'Twoje zamówienie jest właśnie drukowane. Damy znać, gdy będzie gotowe do wysyłki.',
        fr: 'Votre commande est en cours d’impression. Nous vous préviendrons dès qu’elle sera prête à être expédiée.',
        nl: 'Je bestelling wordt nu geprint. We laten het je weten zodra hij klaar is voor verzending.',
        cs: 'Tvoje objednávka se právě tiskne. Ozveme se, jakmile bude připravená k odeslání.',
        it: 'Il tuo ordine è in stampa. Ti avviseremo appena sarà pronto per la spedizione.',
      }),
    ) + button(data.orderUrl, pick(locale, viewStatus)),
  )
  return { subject, html, text: `${title}: ${n}` }
}

export interface ShippingEmailData extends OrderEmailData {
  carrier: string
  trackingNumber: string
}

export function renderShippingConfirmation(data: ShippingEmailData, locale: Locale): RenderedEmail {
  const n = data.orderNumber
  const carrier = data.carrier.toUpperCase()
  const tracking = `<strong>${escapeHtml(data.trackingNumber)}</strong>`
  const subject = pick(locale, {
    de: `Deine Bestellung ${n} ist unterwegs`,
    en: `Your order ${n} has shipped`,
    pl: `Twoje zamówienie ${n} jest w drodze`,
    fr: `Votre commande ${n} a été expédiée`,
    nl: `Je bestelling ${n} is onderweg`,
    cs: `Tvoje objednávka ${n} je na cestě`,
    it: `Il tuo ordine ${n} è stato spedito`,
  })
  const title = pick(locale, {
    de: 'Versandbestätigung',
    en: 'Shipping confirmation',
    pl: 'Potwierdzenie wysyłki',
    fr: 'Confirmation d’expédition',
    nl: 'Verzendbevestiging',
    cs: 'Potvrzení odeslání',
    it: 'Conferma di spedizione',
  })
  const html = emailLayout(
    title,
    paragraph(
      pick(locale, {
        de: `Dein Paket ist mit ${carrier} unterwegs. Sendungsnummer: ${tracking}`,
        en: `Your parcel is on its way with ${carrier}. Tracking number: ${tracking}`,
        pl: `Twoja paczka jest już w drodze (${carrier}). Numer przesyłki: ${tracking}`,
        fr: `Votre colis est en route avec ${carrier}. Numéro de suivi : ${tracking}`,
        nl: `Je pakket is onderweg met ${carrier}. Trackingnummer: ${tracking}`,
        cs: `Tvůj balík je na cestě s dopravcem ${carrier}. Číslo zásilky: ${tracking}`,
        it: `Il tuo pacco è in viaggio con ${carrier}. Numero di tracciamento: ${tracking}`,
      }),
    ) + button(data.orderUrl, pick(locale, viewOrder)),
  )
  return { subject, html, text: `${title}: ${data.trackingNumber}` }
}

export interface InvoiceEmailData {
  orderNumber: string
  invoiceNumber: string
  totalCents: number
  orderUrl: string
  /** Set for Admin-Bestellungen: adds the custom-made / no-withdrawal notice and the terms. */
  customMade?: CustomMadeLegal
}

/** The attached PDF itself stays German. */
export function renderInvoice(data: InvoiceEmailData, locale: Locale): RenderedEmail {
  const inv = data.invoiceNumber
  const n = data.orderNumber
  const total = formatCents(data.totalCents, locale)
  const subject = pick(locale, {
    de: `Rechnung ${inv}`,
    en: `Invoice ${inv}`,
    pl: `Faktura ${inv}`,
    fr: `Facture ${inv}`,
    nl: `Factuur ${inv}`,
    cs: `Faktura ${inv}`,
    it: `Fattura ${inv}`,
  })
  const title = pick(locale, {
    de: 'Deine Rechnung',
    en: 'Your invoice',
    pl: 'Twoja faktura',
    fr: 'Votre facture',
    nl: 'Je factuur',
    cs: 'Tvoje faktura',
    it: 'La tua fattura',
  })
  const notice = data.customMade ? customMadeNotice(data.customMade, locale) : null
  const html = emailLayout(
    title,
    paragraph(
      pick(locale, {
        de: `Im Anhang findest du die Rechnung <strong>${inv}</strong> zu deiner Bestellung ${n} über ${total}.`,
        en: `Please find attached invoice <strong>${inv}</strong> for your order ${n} over ${total}.`,
        pl: `W załączniku znajdziesz fakturę <strong>${inv}</strong> do zamówienia ${n} na kwotę ${total}.`,
        fr: `Vous trouverez ci-joint la facture <strong>${inv}</strong> de votre commande ${n} d’un montant de ${total}.`,
        nl: `In de bijlage vind je factuur <strong>${inv}</strong> voor je bestelling ${n} van ${total}.`,
        cs: `V příloze najdeš fakturu <strong>${inv}</strong> k objednávce ${n} na částku ${total}.`,
        it: `In allegato trovi la fattura <strong>${inv}</strong> del tuo ordine ${n} per un importo di ${total}.`,
      }),
    ) + (notice?.html ?? ''),
  )
  const text = `${title}: ${inv}${notice ? `\n\n${notice.text}` : ''}`
  return { subject, html, text }
}

export interface InvoiceCorrectionEmailData {
  orderNumber: string
  invoiceNumber: string
  correctionNumber: string
  amountCents: number
  /** How the money went back: provider API or a manual transfer (bank/bitcoin). */
  provider: 'stripe' | 'paypal' | 'manual'
  orderUrl: string
}

/** Erstattung + Rechnungskorrektur (attached PDF stays German/English like the invoice). */
export function renderInvoiceCorrection(
  data: InvoiceCorrectionEmailData,
  locale: Locale,
): RenderedEmail {
  const rk = data.correctionNumber
  const inv = data.invoiceNumber
  const n = data.orderNumber
  const amount = `<strong>${formatCents(data.amountCents, locale)}</strong>`
  const subject = pick(locale, {
    de: `Erstattung zu deiner Bestellung ${n}`,
    en: `Refund for your order ${n}`,
    pl: `Zwrot środków za zamówienie ${n}`,
    fr: `Remboursement de votre commande ${n}`,
    nl: `Terugbetaling voor je bestelling ${n}`,
    cs: `Vrácení peněz k objednávce ${n}`,
    it: `Rimborso per il tuo ordine ${n}`,
  })
  const title = pick(locale, {
    de: 'Deine Erstattung',
    en: 'Your refund',
    pl: 'Twój zwrot',
    fr: 'Votre remboursement',
    nl: 'Je terugbetaling',
    cs: 'Tvoje vrácení peněz',
    it: 'Il tuo rimborso',
  })
  const channel =
    data.provider === 'manual'
      ? pick(locale, {
          de: 'Wir haben dir den Betrag zurücküberwiesen.',
          en: 'We have transferred the amount back to you.',
          pl: 'Przelaliśmy Ci tę kwotę z powrotem.',
          fr: 'Nous vous avons reversé ce montant.',
          nl: 'We hebben het bedrag naar je teruggestort.',
          cs: 'Částku jsme ti poslali zpět.',
          it: 'Ti abbiamo restituito l’importo.',
        })
      : pick(locale, {
          de: `Das Geld geht über ${data.provider === 'paypal' ? 'PayPal' : 'dein ursprüngliches Zahlungsmittel'} an dich zurück; je nach Anbieter kann die Gutschrift auf deinem Konto einige Tage dauern.`,
          en: `The money goes back via ${data.provider === 'paypal' ? 'PayPal' : 'your original payment method'}; depending on the provider it may take a few days to show up.`,
          pl: `Pieniądze wrócą przez ${data.provider === 'paypal' ? 'PayPal' : 'pierwotną metodę płatności'}; w zależności od dostawcy może to potrwać kilka dni.`,
          fr: `L’argent vous est reversé via ${data.provider === 'paypal' ? 'PayPal' : 'votre moyen de paiement initial'} ; selon le prestataire, cela peut prendre quelques jours.`,
          nl: `Het geld gaat terug via ${data.provider === 'paypal' ? 'PayPal' : 'je oorspronkelijke betaalmethode'}; afhankelijk van de aanbieder kan dat een paar dagen duren.`,
          cs: `Peníze se vrátí přes ${data.provider === 'paypal' ? 'PayPal' : 'původní platební metodu'}; podle poskytovatele to může trvat několik dní.`,
          it: `Il denaro ti verrà restituito tramite ${data.provider === 'paypal' ? 'PayPal' : 'il metodo di pagamento originale'}; a seconda del fornitore potrebbero volerci alcuni giorni.`,
        })
  const html = emailLayout(
    title,
    paragraph(
      pick(locale, {
        de: `Wir haben dir ${amount} zu deiner Bestellung ${n} erstattet. Im Anhang findest du die Rechnungskorrektur <strong>${rk}</strong> zur Rechnung ${inv}.`,
        en: `We have refunded ${amount} for your order ${n}. Please find attached invoice correction <strong>${rk}</strong> for invoice ${inv}.`,
        pl: `Zwróciliśmy Ci ${amount} za zamówienie ${n}. W załączniku znajdziesz korektę faktury <strong>${rk}</strong> do faktury ${inv}.`,
        fr: `Nous vous avons remboursé ${amount} pour votre commande ${n}. Vous trouverez ci-joint la facture rectificative <strong>${rk}</strong> relative à la facture ${inv}.`,
        nl: `We hebben ${amount} terugbetaald voor je bestelling ${n}. In de bijlage vind je de factuurcorrectie <strong>${rk}</strong> bij factuur ${inv}.`,
        cs: `Vrátili jsme ti ${amount} k objednávce ${n}. V příloze najdeš opravu faktury <strong>${rk}</strong> k faktuře ${inv}.`,
        it: `Ti abbiamo rimborsato ${amount} per il tuo ordine ${n}. In allegato trovi la fattura di rettifica <strong>${rk}</strong> relativa alla fattura ${inv}.`,
      }),
    ) +
      paragraph(channel) +
      button(data.orderUrl, pick(locale, viewOrder)),
  )
  return { subject, html, text: `${title}: ${formatCents(data.amountCents, locale)} (${rk})` }
}

export interface PasswordResetData {
  name: string
  resetUrl: string
}

export function renderPasswordReset(data: PasswordResetData, locale: Locale): RenderedEmail {
  const subject = pick(locale, {
    de: 'Passwort zurücksetzen',
    en: 'Reset your password',
    pl: 'Zresetuj hasło',
    fr: 'Réinitialiser votre mot de passe',
    nl: 'Wachtwoord opnieuw instellen',
    cs: 'Obnovení hesla',
    it: 'Reimposta la password',
  })
  const title = subject
  const html = emailLayout(
    title,
    greeting(data.name, locale) +
      paragraph(
        pick(locale, {
          de: 'klicke auf den Button, um ein neues Passwort zu vergeben. Der Link ist 1 Stunde gültig.',
          en: 'click the button to set a new password. The link is valid for 1 hour.',
          pl: 'Kliknij przycisk, aby ustawić nowe hasło. Link jest ważny przez 1 godzinę.',
          fr: 'Cliquez sur le bouton pour définir un nouveau mot de passe. Le lien est valable 1 heure.',
          nl: 'Klik op de knop om een nieuw wachtwoord in te stellen. De link is 1 uur geldig.',
          cs: 'klikni na tlačítko a nastav si nové heslo. Odkaz platí 1 hodinu.',
          it: 'clicca sul pulsante per impostare una nuova password. Il link è valido per 1 ora.',
        }),
      ) +
      button(
        data.resetUrl,
        pick(locale, {
          de: 'Neues Passwort vergeben',
          en: 'Set new password',
          pl: 'Ustaw nowe hasło',
          fr: 'Définir un nouveau mot de passe',
          nl: 'Nieuw wachtwoord instellen',
          cs: 'Nastavit nové heslo',
          it: 'Imposta nuova password',
        }),
      ),
  )
  return { subject, html, text: `${title}: ${data.resetUrl}` }
}

export interface AdminNotificationData {
  event: string
  detail: string
  adminUrl: string
}

/** Internal: always German. */
export function renderAdminNotification(
  data: AdminNotificationData,
  _locale: Locale,
): RenderedEmail {
  const subject = `[Admin] ${data.event}`
  const html = emailLayout(
    data.event,
    paragraph(escapeHtml(data.detail)) + button(data.adminUrl, 'Open admin'),
  )
  return { subject, html, text: `${data.event}: ${data.detail}` }
}

export interface TicketCreatedData {
  name: string
  ticketNumber: string
  subject: string
  ticketUrl: string
}

export function renderTicketCreated(data: TicketCreatedData, locale: Locale): RenderedEmail {
  const t = `<strong>${data.ticketNumber}</strong>`
  const s = escapeHtml(data.subject)
  const subject = pick(locale, {
    de: `Support-Ticket ${data.ticketNumber} erstellt`,
    en: `Support ticket ${data.ticketNumber} created`,
    pl: `Utworzono zgłoszenie ${data.ticketNumber}`,
    fr: `Ticket d’assistance ${data.ticketNumber} créé`,
    nl: `Supportticket ${data.ticketNumber} aangemaakt`,
    cs: `Tiket podpory ${data.ticketNumber} vytvořen`,
    it: `Ticket di assistenza ${data.ticketNumber} creato`,
  })
  const title = pick(locale, {
    de: 'Wir haben deine Anfrage erhalten',
    en: 'We received your request',
    pl: 'Otrzymaliśmy Twoje zgłoszenie',
    fr: 'Nous avons bien reçu votre demande',
    nl: 'We hebben je vraag ontvangen',
    cs: 'Tvůj dotaz jsme přijali',
    it: 'Abbiamo ricevuto la tua richiesta',
  })
  const html = emailLayout(
    title,
    greeting(data.name, locale) +
      paragraph(
        pick(locale, {
          de: `dein Support-Ticket ${t} („${s}") ist bei uns eingegangen und wir melden uns bald. Über den Link siehst du den Stand und kannst jederzeit antworten.`,
          en: `we have received your support ticket ${t} ("${s}") and will get back to you soon. The link below shows its status, and you can reply there at any time.`,
          pl: `Twoje zgłoszenie ${t} („${s}”) do nas dotarło, wkrótce się odezwiemy. Pod linkiem sprawdzisz jego status i w każdej chwili odpowiesz.`,
          fr: `Nous avons bien reçu votre ticket ${t} (« ${s} ») et revenons vers vous rapidement. Le lien ci-dessous vous permet de suivre son statut et d’y répondre à tout moment.`,
          nl: `We hebben je supportticket ${t} ("${s}") ontvangen en nemen snel contact met je op. Via de link hieronder zie je de status en kun je altijd reageren.`,
          cs: `tvůj tiket ${t} („${s}“) k nám dorazil a brzy se ozveme. Přes odkaz uvidíš jeho stav a můžeš kdykoli odpovědět.`,
          it: `abbiamo ricevuto il tuo ticket ${t} («${s}») e ti risponderemo presto. Dal link qui sotto puoi vederne lo stato e rispondere in qualsiasi momento.`,
        }),
      ) +
      button(
        data.ticketUrl,
        pick(locale, {
          de: 'Ticket ansehen',
          en: 'View ticket',
          pl: 'Zobacz zgłoszenie',
          fr: 'Voir le ticket',
          nl: 'Ticket bekijken',
          cs: 'Zobrazit tiket',
          it: 'Vedi ticket',
        }),
      ),
  )
  return { subject, html, text: `${title}: ${data.ticketNumber}\n${data.ticketUrl}` }
}

export interface TicketReplyData {
  name: string
  ticketNumber: string
  ticketUrl: string
}

export function renderTicketReply(data: TicketReplyData, locale: Locale): RenderedEmail {
  const t = `<strong>${data.ticketNumber}</strong>`
  const subject = pick(locale, {
    de: `Neue Antwort zu deinem Ticket ${data.ticketNumber}`,
    en: `New reply to your ticket ${data.ticketNumber}`,
    pl: `Nowa odpowiedź w zgłoszeniu ${data.ticketNumber}`,
    fr: `Nouvelle réponse à votre ticket ${data.ticketNumber}`,
    nl: `Nieuw antwoord op je ticket ${data.ticketNumber}`,
    cs: `Nová odpověď k tvému tiketu ${data.ticketNumber}`,
    it: `Nuova risposta al tuo ticket ${data.ticketNumber}`,
  })
  const title = pick(locale, {
    de: 'Neue Antwort vom Support',
    en: 'New reply from support',
    pl: 'Nowa odpowiedź od obsługi klienta',
    fr: 'Nouvelle réponse du support',
    nl: 'Nieuw antwoord van support',
    cs: 'Nová odpověď od podpory',
    it: 'Nuova risposta dall’assistenza',
  })
  const html = emailLayout(
    title,
    greeting(data.name, locale) +
      paragraph(
        pick(locale, {
          de: `unser Team hat auf dein Ticket ${t} geantwortet.`,
          en: `our team replied to your ticket ${t}.`,
          pl: `Nasz zespół odpowiedział w Twoim zgłoszeniu ${t}.`,
          fr: `Notre équipe a répondu à votre ticket ${t}.`,
          nl: `Ons team heeft gereageerd op je ticket ${t}.`,
          cs: `náš tým odpověděl na tvůj tiket ${t}.`,
          it: `il nostro team ha risposto al tuo ticket ${t}.`,
        }),
      ) +
      button(
        data.ticketUrl,
        pick(locale, {
          de: 'Antwort lesen',
          en: 'Read reply',
          pl: 'Przeczytaj odpowiedź',
          fr: 'Lire la réponse',
          nl: 'Antwoord lezen',
          cs: 'Přečíst odpověď',
          it: 'Leggi la risposta',
        }),
      ),
  )
  return { subject, html, text: `${title}: ${data.ticketNumber}\n${data.ticketUrl}` }
}

export interface TicketCustomerReplyData {
  ticketNumber: string
  subject: string
  adminUrl: string
}

/** Internal notification when a customer replied on the public ticket page. */
export function renderTicketCustomerReply(
  data: TicketCustomerReplyData,
  _locale: Locale,
): RenderedEmail {
  const subject = `[Ticket] Neue Kundenantwort: ${data.ticketNumber}`
  const html = emailLayout(
    `Neue Kundenantwort zu ${data.ticketNumber}`,
    paragraph(escapeHtml(data.subject)) + button(data.adminUrl, 'Ticket öffnen'),
  )
  return { subject, html, text: `${subject}: ${data.adminUrl}` }
}

// ---------- Complaints (Reklamationen) ----------

export interface ComplaintEmailData {
  complaintNumber: string
  orderNumber: string
  firstName: string
  complaintUrl: string
}

export function renderComplaintReceived(data: ComplaintEmailData, locale: Locale): RenderedEmail {
  const c = data.complaintNumber
  const o = `<strong>${data.orderNumber}</strong>`
  const subject = pick(locale, {
    de: `Reklamation ${c} eingegangen`,
    en: `Complaint ${c} received`,
    pl: `Reklamacja ${c} przyjęta`,
    fr: `Réclamation ${c} reçue`,
    nl: `Klacht ${c} ontvangen`,
    cs: `Reklamace ${c} přijata`,
    it: `Reclamo ${c} ricevuto`,
  })
  const title = pick(locale, {
    de: 'Reklamation eingegangen',
    en: 'Complaint received',
    pl: 'Reklamacja przyjęta',
    fr: 'Réclamation reçue',
    nl: 'Klacht ontvangen',
    cs: 'Reklamace přijata',
    it: 'Reclamo ricevuto',
  })
  const cs = `<strong>${c}</strong>`
  const html = emailLayout(
    title,
    greeting(data.firstName, locale) +
      paragraph(
        pick(locale, {
          de: `wir haben deine Reklamation ${cs} zur Bestellung ${o} erhalten und melden uns, sobald wir sie geprüft haben.`,
          en: `we received your complaint ${cs} for order ${o} and will get back to you once we have reviewed it.`,
          pl: `Otrzymaliśmy Twoją reklamację ${cs} do zamówienia ${o}. Odezwiemy się, gdy ją sprawdzimy.`,
          fr: `Nous avons bien reçu votre réclamation ${cs} concernant la commande ${o} et reviendrons vers vous après examen.`,
          nl: `We hebben je klacht ${cs} over bestelling ${o} ontvangen en laten van ons horen zodra we hem hebben bekeken.`,
          cs: `přijali jsme tvoji reklamaci ${cs} k objednávce ${o} a ozveme se, jakmile ji prověříme.`,
          it: `abbiamo ricevuto il tuo reclamo ${cs} relativo all’ordine ${o} e ti risponderemo dopo averlo esaminato.`,
        }),
      ) +
      button(data.complaintUrl, pick(locale, viewStatus)),
  )
  return { subject, html, text: `${title}: ${c}\n${data.complaintUrl}` }
}

const COMPLAINT_STATUS_LABELS: Record<ComplaintStatus, Texts> = {
  submitted: {
    de: 'Eingereicht',
    en: 'Submitted',
    pl: 'Zgłoszona',
    fr: 'Reçue',
    nl: 'Ingediend',
    cs: 'Přijato',
    it: 'Ricevuto',
  },
  in_review: {
    de: 'In Prüfung',
    en: 'In review',
    pl: 'W trakcie analizy',
    fr: 'En cours d’examen',
    nl: 'In behandeling',
    cs: 'V posouzení',
    it: 'In verifica',
  },
  info_needed: {
    de: 'Weitere Informationen benötigt',
    en: 'More information needed',
    pl: 'Wymagane informacje',
    fr: 'Informations requises',
    nl: 'Informatie nodig',
    cs: 'Nutné informace',
    it: 'Servono informazioni',
  },
  approved: {
    de: 'Genehmigt',
    en: 'Approved',
    pl: 'Zatwierdzona',
    fr: 'Approuvée',
    nl: 'Goedgekeurd',
    cs: 'Schváleno',
    it: 'Approvato',
  },
  rejected: {
    de: 'Abgelehnt',
    en: 'Rejected',
    pl: 'Odrzucona',
    fr: 'Rejetée',
    nl: 'Afgewezen',
    cs: 'Zamítnuto',
    it: 'Respinto',
  },
  replacement_planned: {
    de: 'Ersatzdruck geplant',
    en: 'Replacement planned',
    pl: 'Zaplanowano ponowny druk',
    fr: 'Réimpression prévue',
    nl: 'Herdruk gepland',
    cs: 'Naplánován nový tisk',
    it: 'Ristampa prevista',
  },
  refund_planned: {
    de: 'Erstattung geplant',
    en: 'Refund planned',
    pl: 'Zaplanowano zwrot',
    fr: 'Remboursement prévu',
    nl: 'Terugbetaling gepland',
    cs: 'Naplánováno vrácení peněz',
    it: 'Rimborso previsto',
  },
  closed: {
    de: 'Abgeschlossen',
    en: 'Closed',
    pl: 'Zamknięta',
    fr: 'Clôturée',
    nl: 'Afgesloten',
    cs: 'Uzavřeno',
    it: 'Chiuso',
  },
}

export interface ComplaintUpdatedData extends ComplaintEmailData {
  status: ComplaintStatus
  message?: string
}

export function renderComplaintUpdated(data: ComplaintUpdatedData, locale: Locale): RenderedEmail {
  const c = data.complaintNumber
  const cs = `<strong>${c}</strong>`
  const statusLabel = pick(locale, COMPLAINT_STATUS_LABELS[data.status])
  const st = escapeHtml(statusLabel)
  const subject = pick(locale, {
    de: `Update zu deiner Reklamation ${c}`,
    en: `Update on your complaint ${c}`,
    pl: `Aktualizacja reklamacji ${c}`,
    fr: `Mise à jour de votre réclamation ${c}`,
    nl: `Update over je klacht ${c}`,
    cs: `Novinky k tvé reklamaci ${c}`,
    it: `Aggiornamento sul tuo reclamo ${c}`,
  })
  const title = pick(locale, {
    de: 'Reklamation aktualisiert',
    en: 'Complaint updated',
    pl: 'Reklamacja zaktualizowana',
    fr: 'Réclamation mise à jour',
    nl: 'Klacht bijgewerkt',
    cs: 'Reklamace aktualizována',
    it: 'Reclamo aggiornato',
  })
  const html = emailLayout(
    title,
    greeting(data.firstName, locale) +
      paragraph(
        pick(locale, {
          de: `es gibt Neuigkeiten zu deiner Reklamation ${cs}: ${st}.`,
          en: `there is an update on your complaint ${cs}: ${st}.`,
          pl: `Mamy nowe informacje w sprawie Twojej reklamacji ${cs}: ${st}.`,
          fr: `Du nouveau concernant votre réclamation ${cs} : ${st}.`,
          nl: `Er is nieuws over je klacht ${cs}: ${st}.`,
          cs: `máme novinky k tvé reklamaci ${cs}: ${st}.`,
          it: `ci sono novità sul tuo reclamo ${cs}: ${st}.`,
        }),
      ) +
      (data.message ? paragraph(escapeHtml(data.message)) : '') +
      button(
        data.complaintUrl,
        pick(locale, {
          de: 'Details ansehen',
          en: 'View details',
          pl: 'Zobacz szczegóły',
          fr: 'Voir les détails',
          nl: 'Details bekijken',
          cs: 'Zobrazit podrobnosti',
          it: 'Vedi dettagli',
        }),
      ),
  )
  return {
    subject,
    html,
    text: `${title}: ${c}, ${statusLabel}\n${data.complaintUrl}`,
  }
}

// ---------- Customer portal (magic link) ----------

export interface MagicLinkData {
  portalUrl: string
  expiresDays: number
}

export function renderMagicLink(data: MagicLinkData, locale: Locale): RenderedEmail {
  const d = data.expiresDays
  const subject = pick(locale, {
    de: 'Dein Zugang zum Kundenbereich',
    en: 'Your customer portal access',
    pl: 'Twój dostęp do konta klienta',
    fr: 'Votre accès à l’espace client',
    nl: 'Je toegang tot de klantenomgeving',
    cs: 'Tvůj přístup do zákaznické sekce',
    it: 'Il tuo accesso all’area clienti',
  })
  const title = pick(locale, {
    de: 'Kundenbereich öffnen',
    en: 'Open customer portal',
    pl: 'Otwórz konto klienta',
    fr: 'Ouvrir l’espace client',
    nl: 'Klantenomgeving openen',
    cs: 'Otevřít zákaznickou sekci',
    it: 'Apri l’area clienti',
  })
  const html = emailLayout(
    title,
    paragraph(
      pick(locale, {
        de: 'Mit dem folgenden Link kannst du deine Bestellungen, Rechnungen und Angebote einsehen. Der Link gilt nur für dich, bitte gib ihn nicht weiter.',
        en: 'Use the link below to view your orders, invoices and quotes. The link is only for you, so please do not share it.',
        pl: 'Pod tym linkiem zobaczysz swoje zamówienia, faktury i oferty. Link jest przeznaczony tylko dla Ciebie, nie przekazuj go dalej.',
        fr: 'Le lien ci-dessous vous permet de consulter vos commandes, factures et devis. Il vous est strictement personnel, merci de ne pas le partager.',
        nl: 'Via de link hieronder bekijk je je bestellingen, facturen en offertes. De link is alleen voor jou, deel hem dus niet.',
        cs: 'Přes tento odkaz uvidíš svoje objednávky, faktury a nabídky. Odkaz je jen pro tebe, prosím nikomu ho nepřeposílej.',
        it: 'Con il link qui sotto puoi vedere i tuoi ordini, fatture e preventivi. Il link è solo per te, non condividerlo.',
      }),
    ) +
      button(
        data.portalUrl,
        pick(locale, {
          de: 'Kundenbereich öffnen',
          en: 'Open portal',
          pl: 'Otwórz konto',
          fr: 'Ouvrir l’espace client',
          nl: 'Klantenomgeving openen',
          cs: 'Otevřít zákaznickou sekci',
          it: 'Apri l’area clienti',
        }),
      ) +
      paragraph(
        pick(locale, {
          de: `Der Link ist ${d} Tage gültig. Danach kannst du jederzeit einen neuen anfordern.`,
          en: `The link is valid for ${d} days. You can request a new one at any time.`,
          pl: `Link jest ważny przez ${d} dni. Potem możesz w każdej chwili poprosić o nowy.`,
          fr: `Le lien est valable ${d} jours. Vous pourrez ensuite en demander un nouveau à tout moment.`,
          nl: `De link is ${d} dagen geldig. Daarna kun je altijd een nieuwe aanvragen.`,
          cs: `Odkaz platí ${d} dní. Potom si můžeš kdykoli vyžádat nový.`,
          it: `Il link è valido per ${d} giorni. Dopo potrai richiederne uno nuovo in qualsiasi momento.`,
        }),
      ),
  )
  return { subject, html, text: `${title}: ${data.portalUrl}` }
}

// ---------- Reviews ----------

export interface ReviewRequestData {
  orderNumber: string
  firstName: string
  items: { name: string }[]
  reviewUrl: string
}

export function renderReviewRequest(data: ReviewRequestData, locale: Locale): RenderedEmail {
  const n = data.orderNumber
  const subject = pick(locale, {
    de: `Wie zufrieden bist du mit Bestellung ${n}?`,
    en: `How happy are you with order ${n}?`,
    pl: `Jak oceniasz zamówienie ${n}?`,
    fr: `Que pensez-vous de votre commande ${n} ?`,
    nl: `Hoe tevreden ben je met bestelling ${n}?`,
    cs: `Jak hodnotíš objednávku ${n}?`,
    it: `Com'è andato il tuo ordine ${n}?`,
  })
  const title = pick(locale, {
    de: 'Wie gefällt dir deine Bestellung?',
    en: 'How do you like your order?',
    pl: 'Jak podoba Ci się zamówienie?',
    fr: 'Votre commande vous plaît-elle ?',
    nl: 'Hoe bevalt je bestelling?',
    cs: 'Jak se ti líbí tvoje objednávka?',
    it: 'Ti piace il tuo ordine?',
  })
  const html = emailLayout(
    title,
    greeting(data.firstName, locale) +
      paragraph(
        pick(locale, {
          de: 'wenn du kurz Zeit hast, bewerte gern diese Artikel:',
          en: 'if you have a minute, please rate these items:',
          pl: 'Jeśli masz chwilę, oceń te produkty:',
          fr: 'Si vous avez une minute, notez ces articles :',
          nl: 'Heb je even tijd? Beoordeel dan deze artikelen:',
          cs: 'pokud máš chvilku, ohodnoť prosím tyto produkty:',
          it: 'se hai un minuto, lascia una recensione per questi articoli:',
        }),
      ) +
      paragraph(data.items.map((i) => escapeHtml(i.name)).join('<br>')) +
      button(
        data.reviewUrl,
        pick(locale, {
          de: 'Jetzt bewerten',
          en: 'Write a review',
          pl: 'Oceń teraz',
          fr: 'Donner mon avis',
          nl: 'Nu beoordelen',
          cs: 'Ohodnotit',
          it: 'Scrivi una recensione',
        }),
      ),
  )
  return { subject, html, text: `${title}: ${n}\n${data.reviewUrl}` }
}

export interface ReviewSubmittedData {
  firstName: string
  productName: string
}

export function renderReviewSubmitted(data: ReviewSubmittedData, locale: Locale): RenderedEmail {
  const p = `<strong>${escapeHtml(data.productName)}</strong>`
  const subject = pick(locale, {
    de: 'Danke für deine Bewertung!',
    en: 'Thanks for your review!',
    pl: 'Dziękujemy za opinię!',
    fr: 'Merci pour votre avis !',
    nl: 'Bedankt voor je review!',
    cs: 'Děkujeme za hodnocení!',
    it: 'Grazie per la tua recensione!',
  })
  const title = pick(locale, {
    de: 'Bewertung eingegangen',
    en: 'Review received',
    pl: 'Opinia otrzymana',
    fr: 'Avis reçu',
    nl: 'Review ontvangen',
    cs: 'Hodnocení přijato',
    it: 'Recensione ricevuta',
  })
  const html = emailLayout(
    title,
    greeting(data.firstName, locale) +
      paragraph(
        pick(locale, {
          de: `danke für deine Bewertung zu ${p}. Wir prüfen sie kurz und schalten sie dann frei.`,
          en: `thank you for reviewing ${p}. We will review and publish it shortly.`,
          pl: `Dziękujemy za opinię o ${p}. Szybko ją sprawdzimy i opublikujemy.`,
          fr: `Merci pour votre avis sur ${p}. Nous le vérifions rapidement avant de le publier.`,
          nl: `Bedankt voor je review van ${p}. We bekijken hem kort en zetten hem daarna online.`,
          cs: `děkujeme za hodnocení produktu ${p}. Krátce ho zkontrolujeme a pak zveřejníme.`,
          it: `grazie per la tua recensione di ${p}. La controlliamo a breve e poi la pubblichiamo.`,
        }),
      ),
  )
  return { subject, html, text: `${title}: ${data.productName}` }
}

export interface ReviewApprovedData {
  firstName: string
  productName: string
  productUrl: string
}

export function renderReviewApproved(data: ReviewApprovedData, locale: Locale): RenderedEmail {
  const p = `<strong>${escapeHtml(data.productName)}</strong>`
  const subject = pick(locale, {
    de: 'Deine Bewertung ist online',
    en: 'Your review is live',
    pl: 'Twoja opinia jest już widoczna',
    fr: 'Votre avis est en ligne',
    nl: 'Je review staat online',
    cs: 'Tvoje hodnocení je online',
    it: 'La tua recensione è online',
  })
  const title = pick(locale, {
    de: 'Bewertung freigegeben',
    en: 'Review published',
    pl: 'Opinia opublikowana',
    fr: 'Avis publié',
    nl: 'Review gepubliceerd',
    cs: 'Hodnocení zveřejněno',
    it: 'Recensione pubblicata',
  })
  const html = emailLayout(
    title,
    greeting(data.firstName, locale) +
      paragraph(
        pick(locale, {
          de: `deine Bewertung zu ${p} wurde freigegeben und ist jetzt sichtbar.`,
          en: `your review of ${p} has been approved and is now visible.`,
          pl: `Twoja opinia o ${p} została zatwierdzona i jest już widoczna.`,
          fr: `Votre avis sur ${p} a été validé et est désormais visible.`,
          nl: `Je review van ${p} is goedgekeurd en nu zichtbaar.`,
          cs: `tvoje hodnocení produktu ${p} bylo schváleno a je teď vidět.`,
          it: `la tua recensione di ${p} è stata approvata ed è ora visibile.`,
        }),
      ) +
      button(
        data.productUrl,
        pick(locale, {
          de: 'Produkt ansehen',
          en: 'View product',
          pl: 'Zobacz produkt',
          fr: 'Voir le produit',
          nl: 'Product bekijken',
          cs: 'Zobrazit produkt',
          it: 'Vedi prodotto',
        }),
      ),
  )
  return { subject, html, text: `${title}: ${data.productName}\n${data.productUrl}` }
}

export interface WithdrawalReceivedData {
  name: string
  email: string
  orderNumber: string
  /** Withdrawn items; empty = whole order. */
  items?: string
  message?: string
  receivedAt: Date
  ticketNumber: string
}

/** Eingangsbestätigung der elektronischen Widerrufsfunktion (§ 356a Abs. 4 BGB). */
export function renderWithdrawalReceived(
  data: WithdrawalReceivedData,
  locale: Locale,
): RenderedEmail {
  const n = data.orderNumber
  const subject = pick(locale, {
    de: `Eingangsbestätigung deines Widerrufs (Bestellung ${n})`,
    en: `Confirmation of receipt of your withdrawal (order ${n})`,
    pl: `Potwierdzenie otrzymania odstąpienia od umowy (zamówienie ${n})`,
    fr: `Accusé de réception de votre rétractation (commande ${n})`,
    nl: `Ontvangstbevestiging van je herroeping (bestelling ${n})`,
    cs: `Potvrzení přijetí odstoupení od smlouvy (objednávka ${n})`,
    it: `Conferma di ricezione del recesso (ordine ${n})`,
  })
  const title = pick(locale, {
    de: 'Dein Widerruf ist eingegangen',
    en: 'We received your withdrawal',
    pl: 'Otrzymaliśmy Twoje odstąpienie od umowy',
    fr: 'Nous avons bien reçu votre rétractation',
    nl: 'We hebben je herroeping ontvangen',
    cs: 'Tvoje odstoupení od smlouvy jsme přijali',
    it: 'Abbiamo ricevuto il tuo recesso',
  })
  const receivedAt = data.receivedAt.toLocaleString(locale, {
    timeZone: 'Europe/Berlin',
    dateStyle: 'long',
    timeStyle: 'medium',
  })
  const germanTime = pick(locale, {
    de: 'deutsche Zeit',
    en: 'German time',
    pl: 'czas niemiecki',
    fr: 'heure allemande',
    nl: 'Duitse tijd',
    cs: 'německý čas',
    it: 'ora tedesca',
  })
  const rows: [string, string][] = [
    [
      pick(locale, {
        de: 'Eingang',
        en: 'Received',
        pl: 'Data otrzymania',
        fr: 'Reçu le',
        nl: 'Ontvangen',
        cs: 'Přijato',
        it: 'Ricevuto il',
      }),
      `${receivedAt} (${germanTime})`,
    ],
    [
      pick(locale, {
        de: 'Name',
        en: 'Name',
        pl: 'Imię i nazwisko',
        fr: 'Nom',
        nl: 'Naam',
        cs: 'Jméno',
        it: 'Nome',
      }),
      data.name,
    ],
    [
      pick(locale, {
        de: 'E-Mail',
        en: 'Email',
        pl: 'E-mail',
        fr: 'E-mail',
        nl: 'E-mail',
        cs: 'E-mail',
        it: 'E-mail',
      }),
      data.email,
    ],
    [
      pick(locale, {
        de: 'Bestellnummer',
        en: 'Order number',
        pl: 'Numer zamówienia',
        fr: 'Numéro de commande',
        nl: 'Bestelnummer',
        cs: 'Číslo objednávky',
        it: 'Numero d’ordine',
      }),
      n,
    ],
    [
      pick(locale, {
        de: 'Widerrufen',
        en: 'Withdrawn',
        pl: 'Zakres odstąpienia',
        fr: 'Articles concernés',
        nl: 'Herroepen',
        cs: 'Odstoupení se týká',
        it: 'Oggetto del recesso',
      }),
      data.items ||
        pick(locale, {
          de: 'gesamte Bestellung',
          en: 'entire order',
          pl: 'całe zamówienie',
          fr: 'toute la commande',
          nl: 'hele bestelling',
          cs: 'celé objednávky',
          it: 'intero ordine',
        }),
    ],
    ...(data.message
      ? ([
          [
            pick(locale, {
              de: 'Nachricht',
              en: 'Message',
              pl: 'Wiadomość',
              fr: 'Message',
              nl: 'Bericht',
              cs: 'Zpráva',
              it: 'Messaggio',
            }),
            data.message,
          ],
        ] as [string, string][])
      : []),
    [
      pick(locale, {
        de: 'Vorgangsnummer',
        en: 'Reference',
        pl: 'Numer sprawy',
        fr: 'Référence',
        nl: 'Referentie',
        cs: 'Číslo případu',
        it: 'Numero di riferimento',
      }),
      data.ticketNumber,
    ],
  ]
  const declaration = pick(locale, {
    de: `Hiermit widerrufe ich den von mir abgeschlossenen Vertrag über die Bestellung ${n}.`,
    en: `I hereby withdraw from my contract for order ${n}.`,
    pl: `Niniejszym odstępuję od zawartej przeze mnie umowy dotyczącej zamówienia ${n}.`,
    fr: `Je vous notifie par la présente ma rétractation du contrat portant sur la commande ${n}.`,
    nl: `Hierbij herroep ik de door mij gesloten overeenkomst voor bestelling ${n}.`,
    cs: `Tímto odstupuji od smlouvy uzavřené na objednávku ${n}.`,
    it: `Con la presente recedo dal contratto da me concluso relativo all’ordine ${n}.`,
  })
  const html = emailLayout(
    title,
    greeting(data.name, locale) +
      paragraph(
        pick(locale, {
          de: 'wir bestätigen den Eingang deiner über unsere Widerrufsfunktion abgegebenen Erklärung:',
          en: 'we confirm receipt of the declaration you submitted via our withdrawal function:',
          pl: 'Potwierdzamy otrzymanie oświadczenia złożonego za pomocą naszego formularza odstąpienia od umowy:',
          fr: 'Nous accusons réception de la déclaration que vous avez envoyée via notre formulaire de rétractation :',
          nl: 'We bevestigen de ontvangst van de verklaring die je via onze herroepingsfunctie hebt verstuurd:',
          cs: 'potvrzujeme přijetí tvého prohlášení zaslaného přes náš formulář pro odstoupení od smlouvy:',
          it: 'confermiamo di aver ricevuto la dichiarazione che hai inviato tramite la nostra funzione di recesso:',
        }),
      ) +
      paragraph(`<em>„${escapeHtml(declaration)}“</em>`) +
      `<table style="width:100%;font-size:15px;margin:12px 0;">${rows
        .map(
          ([k, v]) =>
            `<tr><td style="padding:4px 12px 4px 0;vertical-align:top;white-space:nowrap;">${k}</td><td style="padding:4px 0;">${escapeHtml(v)}</td></tr>`,
        )
        .join('')}</table>` +
      paragraph(
        pick(locale, {
          de: 'Wir melden uns mit den nächsten Schritten zur Rücksendung und Erstattung. Bitte bewahre diese E-Mail auf.',
          en: 'We will get back to you with the next steps for the return and refund. Please keep this email.',
          pl: 'Odezwiemy się z kolejnymi krokami dotyczącymi zwrotu towaru i pieniędzy. Zachowaj tego e-maila.',
          fr: 'Nous reviendrons vers vous avec les prochaines étapes pour le retour et le remboursement. Merci de conserver cet e-mail.',
          nl: 'We nemen contact met je op over de volgende stappen voor het terugsturen en de terugbetaling. Bewaar deze e-mail goed.',
          cs: 'Ozveme se s dalším postupem k vrácení zboží a peněz. Tento e-mail si prosím uschovej.',
          it: 'Ti contatteremo con i prossimi passi per il reso e il rimborso. Conserva questa e-mail.',
        }),
      ),
  )
  const text = [title, declaration, ...rows.map(([k, v]) => `${k}: ${v}`)].join('\n')
  return { subject, html, text }
}
