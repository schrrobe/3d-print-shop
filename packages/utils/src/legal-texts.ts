export type LegalDocumentKey = 'imprint' | 'privacy' | 'terms' | 'withdrawal'

export interface LegalSection {
  heading: string
  paragraphs: string[]
  /** Link label for the /support contact form (§ 5 DDG second contact channel). */
  contactForm?: string
  form?: string[]
}

export interface LegalDocumentTranslation {
  updatedAt: string
  sections: LegalSection[]
}

/** Values for the `{name}`, `{street}`, `{zip}`, `{city}`, `{email}`, `{withdrawUrl}` placeholders. */
export interface LegalCompany {
  name: string
  street: string
  zip: string
  city: string
  email: string
  /** Absolute URL of the electronic withdrawal function (§ 356a BGB). */
  withdrawUrl: string
}

/** Path of the electronic withdrawal function (§ 356a BGB) in the shop. */
export const WITHDRAW_PATH = '/withdraw'

/**
 * German is the binding contract language. Imprint and privacy policy are
 * still Vue templates (they carry links), so only terms + withdrawal live here.
 */
const de: Partial<Record<LegalDocumentKey, LegalDocumentTranslation>> = {
  terms: {
    updatedAt: 'Stand: 31.10.2026',
    sections: [
      {
        heading: '1. Geltungsbereich',
        paragraphs: [
          'Diese Allgemeinen Geschäftsbedingungen (AGB) gelten für alle Verträge zwischen {name}, {street}, {zip} {city}, Deutschland (nachfolgend „wir“ oder „uns“) und Verbrauchern im Sinne von § 13 BGB über den Verkauf von Waren über diesen Onlineshop.',
        ],
      },
      {
        heading: '2. Vertragspartner, Vertragssprache und Speicherung des Vertragstexts',
        paragraphs: [
          'Vertragspartner ist {name}, {street}, {zip} {city}, Deutschland, E-Mail: {email}. Vertragssprache ist Deutsch; Übersetzungen dieser Seite dienen nur der Information.',
          'Wir speichern den Vertragstext. Mit der Bestellbestätigung senden wir dir die Bestelldaten, diese AGB und die Widerrufsbelehrung per E-Mail. Deine Bestellung kannst du zusätzlich über den Link in der Bestellbestätigung abrufen. Die jeweils aktuellen AGB kannst du jederzeit auf dieser Seite abrufen und ausdrucken.',
        ],
      },
      {
        heading: '3. Angebot, Bestellvorgang und Vertragsschluss',
        paragraphs: [
          'Die Darstellung der Produkte im Onlineshop stellt kein rechtlich bindendes Angebot, sondern eine unverbindliche Aufforderung zur Bestellung dar.',
          'Bestellvorgang: Du konfigurierst ein Produkt und legst es in den Warenkorb. In der Kasse gibst du Kontakt- und Lieferdaten ein und wählst die Zahlungsart. Vor dem Absenden siehst du eine Bestellübersicht mit allen Positionen, Versandkosten und dem Gesamtpreis. Eingabefehler kannst du bis dahin jederzeit in den Formularfeldern bzw. über den Warenkorb korrigieren oder den Vorgang durch Schließen des Browserfensters abbrechen. Mit Klick auf „Jetzt kostenpflichtig bestellen“ gibst du ein verbindliches Angebot zum Kauf der Waren im Warenkorb ab.',
          'Der Vertrag kommt zustande, wenn wir dein Angebot durch die Bestellbestätigung per E-Mail annehmen oder die Ware versenden.',
          'Für individuell angefragte 3D-Drucke nach hochgeladenen Dateien erstellen wir nach Prüfung ein Angebot. Dieses ist 14 Tage ab Zugang gültig. Der Vertrag kommt mit deiner Annahme des Angebots zustande.',
        ],
      },
      {
        heading: '4. Produkte und Herstellung',
        paragraphs: [
          'Alle Produkte werden erst nach Bestellung im 3D-Druckverfahren hergestellt. Kaliber, Größe und Farben wählst du aus den beim jeweiligen Produkt angebotenen Optionen; optional kannst du eine Box gegen Aufpreis mit einem Namen personalisieren lassen. Verfahrensbedingt sind feine Schichtlinien und leichte Oberflächenstrukturen sichtbar. Produktabbildungen dienen der Veranschaulichung; Farben können je nach Bildschirm abweichen. Deine gesetzlichen Mängelrechte bleiben unberührt.',
          'Die Boxen dienen der Ordnung und Sortierung. Sie ersetzen kein Behältnis bzw. keinen Waffenschrank, wie ihn § 36 Waffengesetz für die Aufbewahrung von Munition vorschreibt. Munition ist nicht Bestandteil des Angebots.',
        ],
      },
      {
        heading: '5. Preise und Versandkosten',
        paragraphs: [
          'Alle angegebenen Preise sind Endpreise in Euro. Als Kleinunternehmer im Sinne von § 19 UStG weisen wir keine Umsatzsteuer aus.',
          'Zusätzlich fallen Versandkosten an: innerhalb Deutschlands 6,99 € (versandkostenfrei ab 80,00 € Bestellwert), in alle anderen Lieferländer 15,00 € (versandkostenfrei ab 100,00 €). Ab einem Bestellwert von 100,00 € erhältst du zusätzlich eine 50er Patronenbox nach Wahl kostenlos.',
          'Bei Lieferungen in die Schweiz können bei der Einfuhr Zölle, Einfuhrumsatzsteuer und Gebühren des Versanddienstleisters anfallen. Diese sind nicht im Preis enthalten und von dir zu tragen.',
        ],
      },
      {
        heading: '6. Zahlung',
        paragraphs: [
          'Zur Verfügung stehen Zahlung per Karte und weiteren in der Kasse angezeigten Zahlungsarten über Stripe, Vorkasse per Banküberweisung und Bitcoin. Bei Vorkasse gewähren wir den in der Kasse angezeigten Rabatt auf den Warenwert; Bankdaten und Verwendungszweck erhältst du nach der Bestellung, der Betrag ist sofort fällig. Bei Zahlung mit Bitcoin ist der bei Bestellung angezeigte Betrag innerhalb der angegebenen Zahlungsfrist an die angezeigte Adresse zu übermitteln. Die Produktion beginnt erst nach vollständigem Zahlungseingang.',
        ],
      },
      {
        heading: '7. Lieferung',
        paragraphs: [
          'Wir liefern nach Deutschland, Österreich, in die Schweiz, die Niederlande, Belgien, Luxemburg, Frankreich, Dänemark, Polen, Tschechien, Italien und Spanien. Die Lieferzeit beträgt innerhalb Deutschlands 3 bis 8 Werktage und in die übrigen Lieferländer 7 bis 14 Werktage, jeweils ab vollständigem Zahlungseingang. Bei individuell angefragten Druckaufträgen nennen wir die voraussichtliche Lieferzeit im Angebot. Der Versand erfolgt mit DHL oder Hermes.',
        ],
      },
      {
        heading: '8. Eigentumsvorbehalt',
        paragraphs: ['Die Ware bleibt bis zur vollständigen Bezahlung unser Eigentum.'],
      },
      {
        heading: '9. Widerrufsrecht',
        paragraphs: [
          'Verbrauchern steht ein gesetzliches Widerrufsrecht zu. Die Einzelheiten ergeben sich aus der Widerrufsbelehrung. Den Widerruf kannst du auch online über „Vertrag widerrufen“ im Fußbereich jeder Seite unter {withdrawUrl} erklären.',
          'Kein Widerrufsrecht besteht nach § 312g Abs. 2 Nr. 1 BGB für Boxen mit persönlichem Namensschriftzug (Personalisierung) und für 3D-Drucke nach von dir hochgeladenen Dateien. Für widerrufene Waren trägst du die unmittelbaren Kosten der Rücksendung.',
        ],
      },
      {
        heading: '10. Gewährleistung',
        paragraphs: [
          'Es gelten die gesetzlichen Mängelrechte. Mängel kannst du uns über das Reklamationsformular im Shop oder per E-Mail an {email} melden.',
        ],
      },
      {
        heading: '11. Streitbeilegung',
        paragraphs: [
          'Wir sind nicht bereit und nicht verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.',
        ],
      },
      {
        heading: '12. Anwendbares Recht',
        paragraphs: [
          'Es gilt deutsches Recht unter Ausschluss des UN-Kaufrechts. Gegenüber Verbrauchern gilt diese Rechtswahl nur, soweit dadurch nicht der Schutz entzogen wird, der durch zwingende Bestimmungen des Rechts des Staates gewährt wird, in dem der Verbraucher seinen gewöhnlichen Aufenthalt hat.',
        ],
      },
    ],
  },
  withdrawal: {
    updatedAt: 'Stand: 31.10.2026',
    sections: [
      {
        heading: 'Widerrufsrecht',
        paragraphs: [
          'Du hast das Recht, binnen vierzehn Tagen ohne Angabe von Gründen diesen Vertrag zu widerrufen.',
          'Die Widerrufsfrist beträgt vierzehn Tage ab dem Tag, an dem du oder ein von dir benannter Dritter, der nicht der Beförderer ist, die Waren in Besitz genommen hast bzw. hat. Hast du mehrere Waren im Rahmen einer einheitlichen Bestellung bestellt und werden diese getrennt geliefert, beginnt die Frist an dem Tag, an dem du oder ein von dir benannter Dritter, der nicht der Beförderer ist, die letzte Ware in Besitz genommen hast bzw. hat.',
          'Um dein Widerrufsrecht auszuüben, musst du uns ({name}, {street}, {zip} {city}, Deutschland, E-Mail: {email}) mittels einer eindeutigen Erklärung (z. B. ein mit der Post versandter Brief oder eine E-Mail) über deinen Entschluss, diesen Vertrag zu widerrufen, informieren. Du kannst dafür das unten stehende Muster-Widerrufsformular verwenden, das jedoch nicht vorgeschrieben ist.',
          'Du kannst dein Widerrufsrecht auch online über die Schaltfläche „Vertrag widerrufen“ im Fußbereich jeder Seite unseres Shops bzw. unter {withdrawUrl} ausüben. Wenn du diese Online-Funktion nutzt, übermitteln wir dir auf einem dauerhaften Datenträger (z. B. durch eine E-Mail) unverzüglich eine Eingangsbestätigung mit Informationen zum Inhalt der Widerrufserklärung sowie dem Datum und der Uhrzeit ihres Eingangs.',
          'Zur Wahrung der Widerrufsfrist reicht es aus, dass du die Mitteilung über die Ausübung des Widerrufsrechts vor Ablauf der Widerrufsfrist absendest.',
        ],
      },
      {
        heading: 'Folgen des Widerrufs',
        paragraphs: [
          'Wenn du diesen Vertrag widerrufst, haben wir dir alle Zahlungen, die wir von dir erhalten haben, einschließlich der Lieferkosten (mit Ausnahme der zusätzlichen Kosten, die sich daraus ergeben, dass du eine andere Art der Lieferung als die von uns angebotene, günstigste Standardlieferung gewählt hast), unverzüglich und spätestens binnen vierzehn Tagen ab dem Tag zurückzuzahlen, an dem die Mitteilung über deinen Widerruf dieses Vertrags bei uns eingegangen ist. Für diese Rückzahlung verwenden wir dasselbe Zahlungsmittel, das du bei der ursprünglichen Transaktion eingesetzt hast, es sei denn, mit dir wurde ausdrücklich etwas anderes vereinbart; in keinem Fall werden dir wegen dieser Rückzahlung Entgelte berechnet. Wir können die Rückzahlung verweigern, bis wir die Waren wieder zurückerhalten haben oder bis du den Nachweis erbracht hast, dass du die Waren zurückgesandt hast, je nachdem, welches der frühere Zeitpunkt ist.',
          'Du hast die Waren unverzüglich und in jedem Fall spätestens binnen vierzehn Tagen ab dem Tag, an dem du uns über den Widerruf dieses Vertrags unterrichtest, an {name}, {street}, {zip} {city}, Deutschland zurückzusenden oder zu übergeben. Die Frist ist gewahrt, wenn du die Waren vor Ablauf der Frist von vierzehn Tagen absendest. Du trägst die unmittelbaren Kosten der Rücksendung der Waren.',
          'Du musst für einen etwaigen Wertverlust der Waren nur aufkommen, wenn dieser Wertverlust auf einen zur Prüfung der Beschaffenheit, Eigenschaften und Funktionsweise der Waren nicht notwendigen Umgang mit ihnen zurückzuführen ist.',
        ],
      },
      {
        heading: 'Ausschluss des Widerrufsrechts',
        paragraphs: [
          'Das Widerrufsrecht besteht nicht bei Verträgen zur Lieferung von Waren, die nicht vorgefertigt sind und für deren Herstellung eine individuelle Auswahl oder Bestimmung durch den Verbraucher maßgeblich ist oder die eindeutig auf die persönlichen Bedürfnisse des Verbrauchers zugeschnitten sind (§ 312g Abs. 2 Nr. 1 BGB).',
          'In unserem Shop betrifft das Boxen mit persönlichem Namensschriftzug (Personalisierung) sowie 3D-Drucke nach von dir hochgeladenen Dateien. Enthält eine Bestellung auch andere Waren, bleibt das Widerrufsrecht für diese bestehen.',
        ],
      },
      {
        heading: 'Muster-Widerrufsformular',
        paragraphs: [
          'Wenn du den Vertrag widerrufen willst, fülle bitte dieses Formular aus und sende es zurück.',
        ],
        form: [
          'An {name}\n{street}\n{zip} {city}\nDeutschland\nE-Mail: {email}',
          'Hiermit widerrufe(n) ich/wir (*) den von mir/uns (*) abgeschlossenen Vertrag über den Kauf der folgenden Waren (*) / die Erbringung der folgenden Dienstleistung (*):',
          'Bestellt am (*) / erhalten am (*)\nName des/der Verbraucher(s)\nAnschrift des/der Verbraucher(s)\nUnterschrift des/der Verbraucher(s) (nur bei Mitteilung auf Papier)\nDatum',
          '(*) Unzutreffendes streichen.',
        ],
      },
    ],
  },
}

const en: Record<LegalDocumentKey, LegalDocumentTranslation> = {
  imprint: {
    updatedAt: 'Last updated: 31 October 2026',
    sections: [
      {
        heading: 'Information pursuant to section 5 DDG',
        paragraphs: ['{name}\n{street}\n{zip} {city}\nGermany'],
      },
      {
        heading: 'Contact',
        paragraphs: ['Email: {email}'],
        contactForm: 'Contact form',
      },
      {
        heading: 'Business activity',
        paragraphs: ['Manufacture and sale of individually produced 3D-printed products.'],
      },
      {
        heading: 'Responsible for content pursuant to section 18(2) MStV',
        paragraphs: ['{name}\n{street}\n{zip} {city}\nGermany'],
      },
      {
        heading: 'Liability for content and links',
        paragraphs: [
          'We prepare this website with due care but cannot guarantee that all information is correct, complete or up to date. External websites linked from this website are the responsibility of their respective operators. We will remove links to unlawful content without delay once we become aware of them.',
        ],
      },
      {
        heading: 'Copyright',
        paragraphs: [
          'The content and works published on this website are protected by German copyright law. Any use outside the limits of copyright law requires the prior written consent of {name} or the respective rights holder.',
        ],
      },
    ],
  },
  privacy: {
    updatedAt: 'Last updated: 31 October 2026',
    sections: [
      {
        heading: '1. Controller',
        paragraphs: [
          'The controller for processing personal data on this website is {name}, {street}, {zip} {city}, Germany; email: {email}. No data protection officer has been appointed.',
        ],
      },
      {
        heading: '2. Hosting and server logs',
        paragraphs: [
          'The website runs on a virtual private server (VPS) of Hostinger International Ltd., Larnaca, Cyprus, which acts as our processor. Server location: [OPEN: add data-centre location as per Hostinger contract]. To provide, stabilise and secure the website, the server processes IP address, date and time of access, requested page, transferred data volume, referrer URL and browser and operating-system information. The legal basis is Article 6(1)(f) GDPR. Log data is deleted when no longer needed for these purposes, at the latest after [OPEN: add log retention period].',
        ],
      },
      {
        heading: '3. Cookies and consent management',
        paragraphs: [
          'We use necessary storage for the cart, wishlist, language, display settings and management of your cookie choice. This is required to operate the website (section 25(2) no. 2 TDDDG, Article 6(1)(f) GDPR).',
          'If you reach us via a partner link (e.g. from an influencer, address starting with /r/), we set the cookie ps_ref for 30 days. It contains only the link code and the time of the click and is used solely to attribute an order to the partner for their commission. We count the click without IP address, device or browser data; the cookie is not passed to third parties (Article 6(1)(f) GDPR, settlement with our sales partners).',
          'We store your choice in the browser and document a random identifier, selected categories, version, language, time and user agent to prove consent. You may change or withdraw consent at any time with future effect via “Settings” in the footer.',
        ],
      },
      {
        heading: '4. Orders, payment and shipping',
        paragraphs: [
          'For orders we process title or name, billing and delivery address, email address, optional telephone number, order, product, payment and shipping data to perform the contract, allocate payments, issue invoices and dispatch goods (Article 6(1)(b) GDPR). Statutory commercial and tax obligations are processed under Article 6(1)(c) GDPR.',
          'If you choose to pay via Stripe, after you submit the order we embed Stripe’s payment form (Stripe.js) directly in the checkout or order status page. You enter your payment, device and transaction data directly with Stripe; we do not receive full card details. The provider is Stripe Payments Europe, Ltd., Dublin, Ireland, which acts as payment service provider under its own responsibility. Processing by Stripe, Inc. in the USA is possible and is based on the EU-US Data Privacy Framework or EU standard contractual clauses. Privacy information: https://stripe.com/privacy. For bank transfers we process the payment data reported to us with the incoming payment.',
          'For Bitcoin, we derive a payment address from our own wallet and check receipt of payment using public blockchain data [OPEN: name the blockchain query service used, if any]. Blockchain transactions are publicly visible and cannot be deleted retrospectively. We do not use private keys on the web server. For delivery, we pass your name, delivery address and the order and contact data required for shipping to DHL or Hermes.',
        ],
      },
      {
        heading: '5. Email, customer area and support',
        paragraphs: [
          'Transactional emails such as order confirmations, invoices, quote and shipping information and support replies are sent via Brevo (Sendinblue SAS, Paris, France) as our processor; email replies to support tickets are also received via Brevo. This processes in particular email address, name, order or case data and message content (Article 6(1)(b) GDPR; for technical logging and abuse prevention Article 6(1)(f) GDPR).',
          'Personal, time-limited access links to the customer area are sent to the email address provided; their hash and access events including IP address are stored to provide your order, quote and invoice data securely. We process the contact, order and content data you send with support requests and complaints, including optional attachments, in order to handle your request.',
          'If you declare withdrawal online via “Withdraw from contract”, we process your name, email address, order number, the goods concerned, your optional message and the date and time of receipt. We create a support case from this and send you an acknowledgement of receipt by email. The legal basis is Article 6(1)(c) GDPR in conjunction with section 356a BGB and Article 6(1)(b) GDPR (unwinding the contract).',
          'Only customers who ordered the product from us can leave a review. We process star rating, title, text, an optional photo and the display name you choose. After our review we publish the review, display name and photo with the product; email address and order data are not shown. The legal basis is Article 6(1)(f) GDPR (showing genuine customer opinions). You can request deletion of your review at any time. [OPEN: define retention period for reviews] After an order is completed we send you a one-time email asking for a review (Article 6(1)(f) GDPR in conjunction with section 7(3) UWG). You can object to this use of your email address at any time, e.g. by email to {email}. [OPEN: add objection notice at checkout and in every review request]',
        ],
      },
      {
        heading: '6. Model uploads and quotes',
        paragraphs: [
          'For an upload request we process your name, email address, optional telephone number, description, quantity, the uploaded STL or 3MF files and the accepted upload-terms version in order to review the model, prepare and communicate a quote and, where applicable, perform a resulting contract (Article 6(1)(b) GDPR). Files are not made publicly available.',
        ],
      },
      {
        heading: '7. Google Analytics 4, Google Tag Manager and own reach measurement',
        paragraphs: [
          'Google Analytics 4 is loaded only with your consent to the Statistics category. It processes usage, page, device/browser, approximate location and online identifier data to measure reach and improve our offering (section 25(1) TDDDG, Article 6(1)(a) GDPR). Provider: Google Ireland Limited, Gordon House, Barrow Street, Dublin 4, Ireland. Processing by Google LLC in the USA may occur; Google LLC is certified under the EU-US Data Privacy Framework (European Commission adequacy decision of 10 July 2023). You can withdraw consent at any time in the cookie settings. Privacy information: https://policies.google.com/privacy',
          'We load Google Tag Manager from the same provider only if you have consented to both Statistics and Marketing. It manages website tags and processes in particular your IP address and technical browser data (section 25(1) TDDDG, Article 6(1)(a) GDPR).',
          'With Statistics consent we also record page views, product views and cart and checkout events with our own reach measurement stored on our server. For this we store a random visitor ID (ps_vid), a session ID, landing page, language, browser identifier (user agent) and the device type derived from it, the domain of the referring page, campaign parameters (UTM) and click IDs from ad links (fbclid, ttclid, gclid), but no IP address. When you order, we link the session to the order to evaluate campaign effectiveness (section 25(1) TDDDG, Article 6(1)(a) GDPR). We delete the user agent, referring domain and click IDs after 90 days and the events themselves after 395 days.',
        ],
      },
      {
        heading: '8. Meta Pixel and TikTok Pixel',
        paragraphs: [
          'Meta Pixel and TikTok Pixel are loaded only with your consent to the Marketing category. They allow Meta and TikTok to attribute visits and actions on this website to marketing campaigns, build audiences and measure advertising effectiveness, processing online identifiers, IP address, browser/device data and page-view and interaction data (section 25(1) TDDDG, Article 6(1)(a) GDPR).',
          'With the same consent we also send the events page view, product view, add to cart, checkout start and purchase directly from our server to Meta (Conversions API) and TikTok (Events API). This transmits your IP address, user agent, the pixel cookies (_fbp, _fbc, _ttp) or ad click IDs, the event value and product, and for purchases your email address as a SHA-256 hash. Page views, product views, cart and checkout events are forwarded without being stored. For purchases we keep the IP and cookie data until payment (at most 30 days) and the resulting event until it has been transmitted, at most 90 days. With Marketing but without Statistics consent we do not store our own reach measurement.',
          'TikTok Pixel provider: TikTok Technology Limited, 10 Earlsfort Terrace, Dublin 2, D02 T380, Ireland; processing in third countries (incl. USA, Singapore) cannot be ruled out and is based on EU standard contractual clauses. Meta Pixel provider: Meta Platforms Ireland Limited, Merrion Road, Dublin 4, D04 X2K5, Ireland. We and Meta are joint controllers for collecting the data and transmitting it to Meta (Article 26 GDPR); Meta alone is responsible for the subsequent processing. Processing by Meta Platforms, Inc. in the USA is possible; Meta Platforms, Inc. is certified under the EU-US Data Privacy Framework. You can withdraw consent at any time in the cookie settings. Privacy information: https://www.facebook.com/privacy/policy/ and https://www.tiktok.com/legal/privacy-policy-eea',
        ],
      },
      {
        heading: '9. Retention periods',
        paragraphs: [
          'We delete personal data once its purpose ends unless a statutory retention obligation or deletion hold applies. Invoices and associated order and payment data are retained for ten years from the end of the calendar year of issue. Consent records are kept for three years from withdrawal or last change, email logs for 90 days. Uncommissioned upload and quote requests are generally deleted after twelve months; model files are deleted under the shorter periods applicable to them. The complete deletion periods and procedure are set out internally in our deletion and retention concept.',
        ],
      },
      {
        heading: '10. Your rights',
        paragraphs: [
          'Subject to statutory conditions, you have rights of access, rectification, erasure, restriction of processing and data portability. You may withdraw consent at any time with future effect. Contact {email}.',
          'Right to object: Where we process data on the basis of Article 6(1)(f) GDPR, you may object at any time on grounds relating to your particular situation (Article 21 GDPR).',
          'Providing the data marked as mandatory in the order form is necessary to conclude the contract; without it we cannot carry out the order. Other information is voluntary. No automated decision-making, including profiling, within the meaning of Article 22 GDPR takes place.',
          'You also have the right to lodge a complaint with a data protection supervisory authority. The competent authority for us is generally the State Commissioner for Data Protection and Freedom of Information of North Rhine-Westphalia.',
        ],
      },
      {
        heading: '11. Updates to this policy',
        paragraphs: [
          'We update this privacy policy when data processing or legal requirements change. The current version is always available on this page.',
        ],
      },
    ],
  },
  terms: {
    updatedAt: 'Last updated: 31 October 2026',
    sections: [
      {
        heading: '1. Scope',
        paragraphs: [
          'These General Terms and Conditions (GTC) apply to all contracts between {name}, {street}, {zip} {city}, Germany (hereinafter “we” or “us”) and consumers within the meaning of section 13 BGB (German Civil Code) for the sale of goods via this online shop.',
        ],
      },
      {
        heading: '2. Contracting party, contract language and storage of the contract text',
        paragraphs: [
          'Your contracting party is {name}, {street}, {zip} {city}, Germany, email: {email}. The contract language is German; translations of this page are for information only.',
          'We store the contract text. With the order confirmation we send you the order details, these GTC and the cancellation policy by email. You can also access your order via the link in the order confirmation. You can view and print the current GTC on this page at any time.',
        ],
      },
      {
        heading: '3. Offer, ordering process and conclusion of contract',
        paragraphs: [
          'The presentation of products in the online shop does not constitute a legally binding offer but a non-binding invitation to order.',
          'Ordering process: You configure a product and add it to the cart. At checkout you enter your contact and delivery details and choose a payment method. Before submitting, you see an order summary with all items, shipping costs and the total price. Until then you can correct input errors at any time in the form fields or via the cart, or cancel the process by closing the browser window. By clicking “Order with obligation to pay” you submit a binding offer to purchase the goods in the cart.',
          'The contract is concluded when we accept your offer by sending the order confirmation by email or by dispatching the goods.',
          'For individually requested 3D prints based on uploaded files, we prepare a quote after review. It is valid for 14 days from receipt. The contract is concluded when you accept the quote.',
        ],
      },
      {
        heading: '4. Products and manufacture',
        paragraphs: [
          'All products are only manufactured by 3D printing after you order. You choose calibre, size and colours from the options offered for each product; optionally, you can have a box personalised with a name for a surcharge. Due to the process, fine layer lines and slight surface textures are visible. Product images are for illustration; colours may vary depending on your screen. Your statutory warranty rights remain unaffected.',
          'The boxes are intended for organising and sorting. They do not replace a container or gun safe as required by section 36 of the German Weapons Act (Waffengesetz) for storing ammunition. Ammunition is not part of the offer.',
        ],
      },
      {
        heading: '5. Prices and shipping costs',
        paragraphs: [
          'All prices stated are final prices in euros. As a small business within the meaning of section 19 UStG, we do not charge VAT.',
          'Shipping costs are added: €6.99 within Germany (free shipping from an order value of €80.00) and €15.00 to all other delivery countries (free shipping from €100.00). From an order value of €100.00 you also receive one 50-round cartridge box of your choice free of charge.',
          'For deliveries to Switzerland, customs duties, import VAT and fees of the shipping carrier may be charged on import. These are not included in the price and are borne by you.',
        ],
      },
      {
        heading: '6. Payment',
        paragraphs: [
          'The following payment methods are available: card and other payment methods shown at checkout via Stripe, prepayment by bank transfer, and Bitcoin. For prepayment we grant the discount on the value of the goods shown at checkout; you receive the bank details and payment reference after ordering, and the amount is due immediately. For Bitcoin payments, the amount shown when ordering must be transferred to the address shown within the stated payment period. Production only starts once payment has been received in full.',
        ],
      },
      {
        heading: '7. Delivery',
        paragraphs: [
          'We deliver to Germany, Austria, Switzerland, the Netherlands, Belgium, Luxembourg, France, Denmark, Poland, the Czech Republic, Italy and Spain. Delivery takes 3 to 8 business days within Germany and 7 to 14 business days to the other delivery countries, in each case from receipt of full payment. For individually requested print orders, we state the expected delivery time in the quote. Shipping is by DHL or Hermes.',
        ],
      },
      {
        heading: '8. Retention of title',
        paragraphs: ['The goods remain our property until paid in full.'],
      },
      {
        heading: '9. Right of withdrawal',
        paragraphs: [
          'Consumers have a statutory right of withdrawal. Details are set out in the cancellation policy. You can also declare your withdrawal online via “Withdraw from contract” in the footer of every page or at {withdrawUrl}.',
          'Under section 312g(2) no. 1 BGB there is no right of withdrawal for boxes with a personal name inscription (personalisation) or for 3D prints made from files you uploaded. For goods you withdraw from, you bear the direct cost of returning them.',
        ],
      },
      {
        heading: '10. Warranty',
        paragraphs: [
          'The statutory warranty rights apply. You can report defects to us via the complaint form in the shop or by email to {email}.',
        ],
      },
      {
        heading: '11. Dispute resolution',
        paragraphs: [
          'We are neither willing nor obliged to participate in dispute resolution proceedings before a consumer arbitration board.',
        ],
      },
      {
        heading: '12. Applicable law',
        paragraphs: [
          'German law applies, excluding the UN Convention on Contracts for the International Sale of Goods. For consumers, this choice of law applies only insofar as it does not deprive them of the protection granted by mandatory provisions of the law of the state in which they have their habitual residence.',
        ],
      },
    ],
  },
  withdrawal: {
    updatedAt: 'Last updated: 31 October 2026',
    sections: [
      {
        heading: 'Right of withdrawal',
        paragraphs: [
          'You have the right to withdraw from this contract within fourteen days without giving any reason.',
          'The withdrawal period is fourteen days from the day on which you, or a third party other than the carrier and indicated by you, acquire physical possession of the goods. If you ordered multiple goods in one order and they are delivered separately, the period begins on the day on which you, or a third party other than the carrier and indicated by you, acquire physical possession of the last good.',
          'To exercise your right of withdrawal, you must inform us ({name}, {street}, {zip} {city}, Germany, email: {email}) of your decision to withdraw from this contract by an unequivocal statement (e.g. a letter sent by post or an email). You may use the model withdrawal form below, but it is not obligatory.',
          'You can also exercise your right of withdrawal online via the “Withdraw from contract” button in the footer of every page of our shop or at {withdrawUrl}. If you use this online function, we will send you an acknowledgement of receipt on a durable medium (e.g. by email) without delay, stating the content of your withdrawal declaration and the date and time of its receipt.',
          'To meet the withdrawal deadline, it is sufficient for you to send your communication concerning your exercise of the right of withdrawal before the withdrawal period has expired.',
        ],
      },
      {
        heading: 'Consequences of withdrawal',
        paragraphs: [
          'If you withdraw from this contract, we shall reimburse to you all payments received from you, including the costs of delivery (with the exception of the supplementary costs resulting from your choice of a type of delivery other than the least expensive type of standard delivery offered by us), without undue delay and in any event not later than fourteen days from the day on which we are informed about your decision to withdraw from this contract. We will carry out such reimbursement using the same means of payment as you used for the initial transaction, unless you have expressly agreed otherwise; in any event, you will not incur any fees as a result of such reimbursement. We may withhold reimbursement until we have received the goods back or you have supplied evidence of having sent back the goods, whichever is the earliest.',
          'You shall send back the goods or hand them over to {name}, {street}, {zip} {city}, Germany, without undue delay and in any event not later than fourteen days from the day on which you communicate your withdrawal from this contract to us. The deadline is met if you send back the goods before the period of fourteen days has expired. You will bear the direct cost of returning the goods.',
          'You are only liable for any diminished value of the goods resulting from handling other than what is necessary to establish the nature, characteristics and functioning of the goods.',
        ],
      },
      {
        heading: 'Exclusion of the right of withdrawal',
        paragraphs: [
          'The right of withdrawal does not apply to contracts for the supply of goods which are not prefabricated and for whose production an individual selection or determination by the consumer is decisive, or which are clearly tailored to the personal needs of the consumer (section 312g(2) no. 1 BGB).',
          'In our shop this applies to boxes with a personal name inscription (personalisation) and to 3D prints made from files you uploaded. If an order also contains other goods, the right of withdrawal remains in place for those goods.',
        ],
      },
      {
        heading: 'Model withdrawal form',
        paragraphs: [
          'If you want to withdraw from the contract, please complete and return this form.',
        ],
        form: [
          'To {name}\n{street}\n{zip} {city}\nGermany\nEmail: {email}',
          'I/We (*) hereby give notice that I/We (*) withdraw from my/our (*) contract of sale of the following goods (*) / for the provision of the following service (*):',
          'Ordered on (*) / received on (*)\nName of consumer(s)\nAddress of consumer(s)\nSignature of consumer(s) (only if this form is notified on paper)\nDate',
          '(*) Delete as appropriate.',
        ],
      },
    ],
  },
}

const fr: Record<LegalDocumentKey, LegalDocumentTranslation> = {
  imprint: {
    updatedAt: 'Dernière mise à jour : 31 octobre 2026',
    sections: [
      {
        heading: 'Informations légales',
        paragraphs: ['{name}\n{street}\n{zip} {city}\nAllemagne\nE-mail : {email}'],
        contactForm: 'Formulaire de contact',
      },
      {
        heading: 'Activité et responsabilité',
        paragraphs: [
          'Fabrication et vente de produits imprimés en 3D réalisés individuellement. Responsable du contenu : {name}, à l’adresse ci-dessus.',
        ],
      },
      {
        heading: 'Responsabilité et droit d’auteur',
        paragraphs: [
          'Le contenu est préparé avec soin, sans garantie d’exactitude, d’exhaustivité ou d’actualité. Les exploitants des sites externes sont responsables de leur contenu ; les liens illicites sont retirés dès que nous en avons connaissance. Les contenus sont protégés par le droit d’auteur allemand et toute utilisation hors des limites légales exige l’accord écrit préalable du titulaire des droits.',
        ],
      },
    ],
  },
  privacy: {
    updatedAt: 'Dernière mise à jour : 31 octobre 2026',
    sections: [
      {
        heading: '1. Responsable du traitement',
        paragraphs: [
          'Le responsable du traitement des données personnelles sur ce site est {name}, {street}, {zip} {city}, Allemagne ; e-mail : {email}. Aucun délégué à la protection des données n’est désigné.',
        ],
      },
      {
        heading: '2. Hébergement et journaux du serveur',
        paragraphs: [
          'Le site est exploité sur un serveur privé virtuel (VPS) de Hostinger International Ltd., Larnaca, Chypre, qui agit en tant que sous-traitant pour notre compte. Emplacement du serveur : [OPEN : compléter l’emplacement du centre de données selon le contrat Hostinger]. Pour la mise à disposition, la stabilité et la sécurité du site, le serveur traite notamment l’adresse IP, la date et l’heure de l’accès, la page consultée, le volume de données transféré, l’URL de référence ainsi que des informations sur le navigateur et le système d’exploitation (art. 6, paragraphe 1, point f, RGPD). Les journaux sont supprimés dès qu’ils ne sont plus nécessaires à ces fins, au plus tard après [OPEN : compléter la durée de conservation des journaux].',
        ],
      },
      {
        heading: '3. Cookies et gestion du consentement',
        paragraphs: [
          'Nous utilisons des mécanismes de stockage nécessaires pour le panier, la liste d’envies, la langue, l’affichage et la gestion de votre choix de cookies. Ils sont indispensables au fonctionnement du site (article 25, paragraphe 2, n° 2 TDDDG, art. 6, paragraphe 1, point f, RGPD).',
          'Si vous arrivez chez nous via un lien partenaire (par exemple d’un influenceur, adresse commençant par /r/), nous déposons le cookie ps_ref pour 30 jours. Il contient uniquement le code du lien et l’heure du clic et sert exclusivement à attribuer une commande au partenaire pour sa commission. Nous comptons le clic sans adresse IP ni données d’appareil ou de navigateur ; le cookie n’est transmis à aucun tiers (art. 6, paragraphe 1, point f, RGPD, décompte avec nos partenaires commerciaux).',
          'Votre choix est enregistré dans le navigateur. Pour pouvoir prouver le consentement, nous documentons en outre un identifiant aléatoire, les catégories choisies, la version, la langue, l’heure et l’agent utilisateur. Vous pouvez à tout moment modifier ou retirer votre consentement pour l’avenir via « Paramètres » dans le pied de page.',
        ],
      },
      {
        heading: '4. Commande, paiement et livraison',
        paragraphs: [
          'Pour une commande, nous traitons civilité ou nom, adresses de facturation et de livraison, adresse e-mail, numéro de téléphone facultatif ainsi que les données de commande, de produit, de paiement et d’expédition afin d’exécuter le contrat, d’attribuer les paiements, d’émettre les factures et d’expédier la marchandise (art. 6, paragraphe 1, point b, RGPD). Les obligations légales commerciales et fiscales relèvent de l’art. 6, paragraphe 1, point c, RGPD.',
          'Si vous choisissez de payer via Stripe, nous intégrons après l’envoi de la commande le formulaire de paiement de Stripe (Stripe.js) directement dans la page de paiement ou de suivi de commande. Vous saisissez vos données de paiement, d’appareil et de transaction directement auprès de Stripe ; nous ne recevons pas les données complètes de la carte. Le prestataire est Stripe Payments Europe, Ltd., Dublin, Irlande, qui agit sous sa propre responsabilité en tant que prestataire de services de paiement. Un traitement par Stripe, Inc. aux États-Unis est possible ; il repose sur le EU-US Data Privacy Framework ou sur les clauses contractuelles types de l’UE. Informations : https://stripe.com/privacy. En cas de virement bancaire, nous traitons les données de paiement qui nous sont communiquées lors de la réception du paiement.',
          'Pour Bitcoin, nous dérivons une adresse de paiement de notre propre portefeuille et vérifions la réception du paiement à l’aide de données publiques de la blockchain [OPEN : indiquer le service de consultation de la blockchain utilisé, le cas échéant]. Les transactions blockchain sont publiques et ne peuvent pas être supprimées a posteriori. Nous n’utilisons pas de clés privées sur le serveur web. Pour la livraison, nous transmettons le nom, l’adresse de livraison et les données de commande et de contact nécessaires à DHL ou Hermes.',
        ],
      },
      {
        heading: '5. E-mails, espace client et assistance',
        paragraphs: [
          'Nous envoyons les e-mails transactionnels (confirmations de commande, factures, informations sur les offres et l’expédition, réponses aux demandes d’assistance) via Brevo (Sendinblue SAS, Paris, France) en tant que sous-traitant ; nous recevons également via Brevo les réponses par e-mail aux tickets d’assistance. Sont notamment traités l’adresse e-mail, le nom, les données de commande ou de dossier et le contenu du message (art. 6, paragraphe 1, point b, RGPD ; pour la documentation technique et la prévention des abus, art. 6, paragraphe 1, point f, RGPD).',
          'Pour l’espace client, nous envoyons un lien d’accès personnel et limité dans le temps à l’adresse e-mail indiquée ; son empreinte (hash) et les événements d’accès, adresse IP comprise, sont enregistrés afin de mettre à disposition vos données de commande, d’offre et de facturation en toute sécurité. Lorsque vous nous contactez ou déposez une réclamation, nous traitons les données de contact, de commande et de contenu transmises, y compris les pièces jointes facultatives, pour traiter votre demande.',
          'Si vous déclarez votre rétractation en ligne via « Se rétracter du contrat », nous traitons le nom, l’adresse e-mail, le numéro de commande, les marchandises concernées, votre message facultatif ainsi que la date et l’heure de réception. Nous créons un dossier d’assistance et vous envoyons un accusé de réception par e-mail. Base juridique : art. 6, paragraphe 1, point c, RGPD en liaison avec l’article 356a BGB et art. 6, paragraphe 1, point b, RGPD (liquidation du contrat).',
          'Seules les personnes ayant commandé le produit chez nous peuvent laisser un avis. Nous traitons les étoiles, le titre, le texte, une photo facultative et le nom d’affichage que vous choisissez. Après vérification, nous publions l’avis, le nom d’affichage et la photo sur la page du produit ; l’adresse e-mail et les données de commande ne sont pas affichées. Base juridique : art. 6, paragraphe 1, point f, RGPD (présentation d’avis authentiques de clients). Vous pouvez demander à tout moment la suppression de votre avis. [OPEN : définir la durée de conservation des avis] Après la clôture d’une commande, nous vous envoyons une seule fois un e-mail vous invitant à laisser un avis (art. 6, paragraphe 1, point f, RGPD en liaison avec l’article 7, paragraphe 3 UWG). Vous pouvez vous opposer à tout moment à cette utilisation de votre adresse e-mail, par exemple par e-mail à {email}. [OPEN : ajouter la mention d’opposition lors du passage en caisse et dans chaque demande d’avis]',
        ],
      },
      {
        heading: '6. Téléversement de modèles et offres',
        paragraphs: [
          'Pour une demande avec téléversement, nous traitons le nom, l’adresse e-mail, le numéro de téléphone facultatif, la description, la quantité, les fichiers STL ou 3MF ainsi que la version acceptée des conditions de téléversement afin d’examiner le modèle, d’établir et de communiquer une offre et, le cas échéant, d’exécuter le contrat qui en résulte (art. 6, paragraphe 1, point b, RGPD). Les fichiers ne sont pas rendus publics.',
        ],
      },
      {
        heading: '7. Google Analytics 4, Google Tag Manager et mesure d’audience propre',
        paragraphs: [
          'Google Analytics 4 n’est chargé qu’avec votre consentement à la catégorie « Statistiques ». Il traite des données d’utilisation, de pages, d’appareil et de navigateur, de localisation approximative et des identifiants en ligne afin de mesurer l’audience et d’améliorer notre offre (article 25, paragraphe 1 TDDDG, art. 6, paragraphe 1, point a, RGPD). Prestataire : Google Ireland Limited, Gordon House, Barrow Street, Dublin 4, Irlande. Un traitement par Google LLC aux États-Unis est possible ; Google LLC est certifiée au titre du EU-US Data Privacy Framework (décision d’adéquation de la Commission européenne du 10 juillet 2023). Vous pouvez retirer votre consentement à tout moment dans les paramètres des cookies. Informations : https://policies.google.com/privacy',
          'Nous ne chargeons Google Tag Manager, du même prestataire, que si vous avez consenti à la fois à « Statistiques » et à « Marketing ». Il sert à gérer les balises du site et traite notamment votre adresse IP et des données techniques du navigateur (article 25, paragraphe 1 TDDDG, art. 6, paragraphe 1, point a, RGPD).',
          'Avec votre consentement à « Statistiques », nous enregistrons en outre, au moyen d’une mesure d’audience propre stockée sur notre serveur, les pages vues, les consultations de produits ainsi que les événements du panier et du passage en caisse. Nous stockons pour cela un identifiant de visiteur aléatoire (ps_vid), un identifiant de session, la page d’entrée, la langue, l’identifiant du navigateur (user agent) et le type d’appareil qui en est déduit, le domaine de la page de provenance, les paramètres de campagne (UTM) et les identifiants de clic issus de liens publicitaires (fbclid, ttclid, gclid), mais aucune adresse IP. Lors d’une commande, nous associons la session à la commande afin d’évaluer l’efficacité des campagnes (article 25, paragraphe 1 TDDDG, art. 6, paragraphe 1, point a, RGPD). Nous supprimons l’identifiant du navigateur, le domaine de provenance et les identifiants de clic après 90 jours, et les événements eux-mêmes après 395 jours.',
        ],
      },
      {
        heading: '8. Meta Pixel et TikTok Pixel',
        paragraphs: [
          'Meta Pixel et TikTok Pixel ne sont chargés qu’avec votre consentement à la catégorie « Marketing ». Ils permettent à Meta et à TikTok d’attribuer les visites et actions sur ce site à des campagnes marketing, de constituer des audiences et de mesurer l’efficacité de la publicité ; sont traités des identifiants en ligne, l’adresse IP, des données de navigateur et d’appareil ainsi que des informations sur les pages vues et les interactions (article 25, paragraphe 1 TDDDG, art. 6, paragraphe 1, point a, RGPD).',
          'Avec le même consentement, nous transmettons en outre les événements page vue, consultation de produit, panier, début du paiement et achat directement depuis notre serveur à Meta (Conversions API) et à TikTok (Events API). Sont transmis l’adresse IP, l’agent utilisateur, les cookies des pixels (_fbp, _fbc, _ttp) ou les identifiants de clic publicitaire, la valeur et le produit de l’événement et, lors d’un achat, votre adresse e-mail sous forme de hash SHA-256. Les pages vues, consultations de produit, événements de panier et de début de paiement sont transmis sans stockage. Pour l’achat, nous conservons les données IP et de cookies jusqu’au paiement (30 jours au maximum) et l’événement qui en résulte jusqu’à sa transmission, 90 jours au maximum. Si vous avez consenti uniquement à « Marketing » et non à « Statistiques », nous ne stockons aucune mesure d’audience propre.',
          'Prestataire de TikTok Pixel : TikTok Technology Limited, 10 Earlsfort Terrace, Dublin 2, D02 T380, Irlande ; un traitement dans des pays tiers (notamment États-Unis, Singapour) ne peut être exclu et repose sur les clauses contractuelles types de l’UE. Prestataire de Meta Pixel : Meta Platforms Ireland Limited, Merrion Road, Dublin 4, D04 X2K5, Irlande. Pour la collecte et la transmission des données à Meta, nous sommes responsables conjoints avec Meta (art. 26 RGPD) ; Meta est seule responsable du traitement ultérieur. Un traitement par Meta Platforms, Inc. aux États-Unis est possible ; Meta Platforms, Inc. est certifiée au titre du EU-US Data Privacy Framework. Vous pouvez retirer votre consentement à tout moment dans les paramètres des cookies. Informations : https://www.facebook.com/privacy/policy/ et https://www.tiktok.com/legal/privacy-policy-eea',
        ],
      },
      {
        heading: '9. Durées de conservation',
        paragraphs: [
          'Nous supprimons les données personnelles dès que leur finalité disparaît, sauf obligation légale de conservation ou gel de suppression. Les factures et les données de commande et de paiement associées sont conservées dix ans à compter de la fin de l’année civile d’émission. Les preuves de consentement sont conservées trois ans à compter du retrait ou de la dernière modification, les journaux d’e-mails 90 jours. Les demandes de téléversement et d’offre non commandées sont en principe supprimées après douze mois, les fichiers de modèles selon les délais plus courts qui leur sont applicables. Les délais de suppression complets et la procédure sont définis en interne dans notre concept de suppression et de conservation.',
        ],
      },
      {
        heading: '10. Vos droits',
        paragraphs: [
          'Dans les conditions prévues par la loi, vous disposez d’un droit d’accès, de rectification, d’effacement, de limitation du traitement et de portabilité des données. Vous pouvez retirer à tout moment un consentement donné, avec effet pour l’avenir. Contactez-nous à {email}.',
          'Droit d’opposition : lorsque nous traitons des données sur la base de l’art. 6, paragraphe 1, point f, RGPD, vous pouvez vous y opposer à tout moment pour des raisons tenant à votre situation particulière (art. 21 RGPD).',
          'La fourniture des données signalées comme obligatoires dans le formulaire de commande est nécessaire à la conclusion du contrat ; sans elles, nous ne pouvons pas exécuter la commande. Les autres informations sont facultatives. Aucune prise de décision automatisée, y compris le profilage, au sens de l’art. 22 RGPD n’a lieu.',
          'Vous avez également le droit d’introduire une réclamation auprès d’une autorité de contrôle de la protection des données. L’autorité compétente pour nous est en principe la Landesbeauftragte für Datenschutz und Informationsfreiheit de Rhénanie-du-Nord-Westphalie.',
        ],
      },
      {
        heading: '11. Mise à jour de la présente déclaration',
        paragraphs: [
          'Nous adaptons la présente déclaration de confidentialité lorsque les traitements de données ou les exigences légales changent. La version en vigueur est toujours disponible sur cette page.',
        ],
      },
    ],
  },
  terms: {
    updatedAt: 'Dernière mise à jour : 31 octobre 2026',
    sections: [
      {
        heading: '1. Champ d’application',
        paragraphs: [
          'Les présentes conditions générales de vente (CGV) s’appliquent à tous les contrats conclus entre {name}, {street}, {zip} {city}, Allemagne (ci-après « nous ») et des consommateurs au sens de l’article 13 BGB (Code civil allemand) portant sur la vente de marchandises via cette boutique en ligne.',
        ],
      },
      {
        heading: '2. Cocontractant, langue du contrat et conservation du texte du contrat',
        paragraphs: [
          'Votre cocontractant est {name}, {street}, {zip} {city}, Allemagne, e-mail : {email}. La langue du contrat est l’allemand ; les traductions de cette page sont fournies à titre informatif uniquement.',
          'Nous conservons le texte du contrat. Avec la confirmation de commande, nous vous envoyons par e-mail les données de la commande, les présentes CGV et les informations sur la rétractation. Vous pouvez en outre consulter votre commande via le lien figurant dans la confirmation de commande. Vous pouvez consulter et imprimer à tout moment les CGV en vigueur sur cette page.',
        ],
      },
      {
        heading: '3. Offre, processus de commande et conclusion du contrat',
        paragraphs: [
          'La présentation des produits dans la boutique en ligne ne constitue pas une offre juridiquement contraignante, mais une invitation non contraignante à passer commande.',
          'Processus de commande : vous configurez un produit et l’ajoutez au panier. Lors du passage en caisse, vous saisissez vos coordonnées et votre adresse de livraison et choisissez le mode de paiement. Avant l’envoi, vous voyez un récapitulatif de la commande avec tous les articles, les frais de port et le prix total. Jusque-là, vous pouvez corriger à tout moment les erreurs de saisie dans les champs du formulaire ou via le panier, ou interrompre le processus en fermant la fenêtre du navigateur. En cliquant sur « Commander avec obligation de paiement », vous faites une offre ferme d’achat des marchandises figurant dans le panier.',
          'Le contrat est conclu lorsque nous acceptons votre offre par la confirmation de commande envoyée par e-mail ou par l’expédition de la marchandise.',
          'Pour les impressions 3D demandées individuellement sur la base de fichiers téléversés, nous établissons une offre après examen. Celle-ci est valable 14 jours à compter de sa réception. Le contrat est conclu lorsque vous acceptez l’offre.',
        ],
      },
      {
        heading: '4. Produits et fabrication',
        paragraphs: [
          'Tous les produits ne sont fabriqués par impression 3D qu’après la commande. Vous choisissez le calibre, la taille et les couleurs parmi les options proposées pour chaque produit ; en option, vous pouvez faire personnaliser une boîte avec un nom moyennant un supplément. En raison du procédé, de fines lignes de couche et de légères structures de surface sont visibles. Les illustrations des produits sont fournies à titre indicatif ; les couleurs peuvent varier selon l’écran. Vos droits légaux en cas de défaut ne sont pas affectés.',
          'Les boîtes servent au rangement et au tri. Elles ne remplacent pas le contenant ou l’armoire forte exigés par l’article 36 de la loi allemande sur les armes (Waffengesetz) pour la conservation des munitions. Les munitions ne font pas partie de l’offre.',
        ],
      },
      {
        heading: '5. Prix et frais de port',
        paragraphs: [
          'Tous les prix indiqués sont des prix finaux en euros. En tant que petite entreprise au sens de l’article 19 UStG, nous ne facturons pas de TVA.',
          'Des frais de port s’ajoutent : 6,99 € en Allemagne (livraison offerte dès 80,00 € de commande), 15,00 € vers tous les autres pays de livraison (livraison offerte dès 100,00 €). Dès 100,00 € de commande, vous recevez en outre gratuitement une boîte à cartouches de 50 de votre choix.',
          'Pour les livraisons en Suisse, des droits de douane, la TVA à l’importation et des frais du transporteur peuvent être dus lors de l’importation. Ils ne sont pas inclus dans le prix et sont à votre charge.',
        ],
      },
      {
        heading: '6. Paiement',
        paragraphs: [
          'Sont disponibles le paiement par carte et par les autres modes de paiement affichés lors du passage en caisse via Stripe, le paiement anticipé par virement bancaire et Bitcoin. En cas de paiement anticipé, nous accordons la remise sur la valeur des marchandises affichée lors du passage en caisse ; vous recevez les coordonnées bancaires et la référence de paiement après la commande, et le montant est immédiatement exigible. En cas de paiement en Bitcoin, le montant affiché lors de la commande doit être transféré à l’adresse indiquée dans le délai de paiement indiqué. La production ne commence qu’après réception de l’intégralité du paiement.',
        ],
      },
      {
        heading: '7. Livraison',
        paragraphs: [
          'Nous livrons en Allemagne, en Autriche, en Suisse, aux Pays-Bas, en Belgique, au Luxembourg, en France, au Danemark, en Pologne, en Tchéquie, en Italie et en Espagne. Le délai de livraison est de 3 à 8 jours ouvrés en Allemagne et de 7 à 14 jours ouvrés vers les autres pays de livraison, à compter de la réception de l’intégralité du paiement. Pour les impressions demandées individuellement, nous indiquons le délai de livraison prévu dans l’offre. L’expédition est assurée par DHL ou Hermes.',
        ],
      },
      {
        heading: '8. Réserve de propriété',
        paragraphs: ['La marchandise reste notre propriété jusqu’à son paiement intégral.'],
      },
      {
        heading: '9. Droit de rétractation',
        paragraphs: [
          'Les consommateurs disposent d’un droit légal de rétractation. Les détails figurent dans les informations sur la rétractation. Vous pouvez également déclarer votre rétractation en ligne via « Se rétracter du contrat » en pied de chaque page ou à l’adresse {withdrawUrl}.',
          'Conformément à l’article 312g, paragraphe 2, n° 1 BGB, il n’existe pas de droit de rétractation pour les boîtes portant une inscription nominative personnelle (personnalisation) ni pour les impressions 3D réalisées à partir de fichiers que vous avez téléversés. Pour les marchandises faisant l’objet d’une rétractation, vous supportez les frais directs de renvoi.',
        ],
      },
      {
        heading: '10. Garantie',
        paragraphs: [
          'Les droits légaux en matière de défauts s’appliquent. Vous pouvez nous signaler un défaut via le formulaire de réclamation de la boutique ou par e-mail à {email}.',
        ],
      },
      {
        heading: '11. Règlement des litiges',
        paragraphs: [
          'Nous ne sommes ni disposés ni tenus à participer à une procédure de règlement des litiges devant un organisme de médiation de la consommation.',
        ],
      },
      {
        heading: '12. Droit applicable',
        paragraphs: [
          'Le droit allemand s’applique, à l’exclusion de la Convention des Nations unies sur les contrats de vente internationale de marchandises. À l’égard des consommateurs, ce choix de loi ne s’applique que dans la mesure où il ne les prive pas de la protection accordée par les dispositions impératives du droit de l’État dans lequel ils ont leur résidence habituelle.',
        ],
      },
    ],
  },
  withdrawal: {
    updatedAt: 'Dernière mise à jour : 31 octobre 2026',
    sections: [
      {
        heading: 'Droit de rétractation',
        paragraphs: [
          'Vous avez le droit de vous rétracter du présent contrat sans donner de motif dans un délai de quatorze jours.',
          'Le délai de rétractation est de quatorze jours à compter du jour où vous-même, ou un tiers autre que le transporteur et désigné par vous, prenez physiquement possession des biens. Si vous avez commandé plusieurs biens dans une seule commande et qu’ils sont livrés séparément, le délai court à compter du jour où vous-même, ou un tiers autre que le transporteur et désigné par vous, prenez physiquement possession du dernier bien.',
          'Pour exercer le droit de rétractation, vous devez nous notifier ({name}, {street}, {zip} {city}, Allemagne, e-mail : {email}) votre décision de rétractation du présent contrat au moyen d’une déclaration dénuée d’ambiguïté (par exemple, lettre envoyée par la poste ou e-mail). Vous pouvez utiliser le modèle de formulaire de rétractation ci-dessous, mais ce n’est pas obligatoire.',
          'Vous pouvez également exercer votre droit de rétractation en ligne via le bouton « Se rétracter du contrat » en pied de chaque page de notre boutique ou à l’adresse {withdrawUrl}. Si vous utilisez cette fonction en ligne, nous vous enverrons sans délai, sur un support durable (par exemple par e-mail), un accusé de réception indiquant le contenu de votre déclaration de rétractation ainsi que la date et l’heure de sa réception.',
          'Pour que le délai de rétractation soit respecté, il suffit que vous transmettiez votre communication relative à l’exercice du droit de rétractation avant l’expiration du délai de rétractation.',
        ],
      },
      {
        heading: 'Effets de la rétractation',
        paragraphs: [
          'En cas de rétractation de votre part du présent contrat, nous vous rembourserons tous les paiements reçus de vous, y compris les frais de livraison (à l’exception des frais supplémentaires découlant du fait que vous avez choisi, le cas échéant, un mode de livraison autre que le mode moins coûteux de livraison standard proposé par nous), sans retard excessif et, en tout état de cause, au plus tard quatorze jours à compter du jour où nous sommes informés de votre décision de rétractation du présent contrat. Nous procéderons au remboursement en utilisant le même moyen de paiement que celui que vous aurez utilisé pour la transaction initiale, sauf si vous convenez expressément d’un moyen différent ; en tout état de cause, ce remboursement n’occasionnera pas de frais pour vous. Nous pouvons différer le remboursement jusqu’à ce que nous ayons reçu le bien ou jusqu’à ce que vous ayez fourni une preuve d’expédition du bien, la date retenue étant celle du premier de ces faits.',
          'Vous devez renvoyer ou rendre le bien à {name}, {street}, {zip} {city}, Allemagne, sans retard excessif et, en tout état de cause, au plus tard quatorze jours après que vous nous aurez communiqué votre décision de rétractation du présent contrat. Ce délai est réputé respecté si vous renvoyez le bien avant l’expiration du délai de quatorze jours. Vous devrez prendre en charge les frais directs de renvoi du bien.',
          'Votre responsabilité est engagée uniquement à l’égard de la dépréciation du bien résultant de manipulations autres que celles nécessaires pour établir la nature, les caractéristiques et le bon fonctionnement de ce bien.',
        ],
      },
      {
        heading: 'Exclusion du droit de rétractation',
        paragraphs: [
          'Le droit de rétractation ne s’applique pas aux contrats de fourniture de biens qui ne sont pas préfabriqués et dont la fabrication dépend d’un choix ou d’une détermination individuels du consommateur, ou qui sont clairement adaptés aux besoins personnels du consommateur (article 312g, paragraphe 2, n° 1 BGB).',
          'Dans notre boutique, cela concerne les boîtes portant une inscription nominative personnelle (personnalisation) ainsi que les impressions 3D réalisées à partir de fichiers que vous avez téléversés. Si une commande contient également d’autres marchandises, le droit de rétractation est maintenu pour celles-ci.',
        ],
      },
      {
        heading: 'Modèle de formulaire de rétractation',
        paragraphs: [
          'Si vous souhaitez vous rétracter du contrat, veuillez compléter et renvoyer le présent formulaire.',
        ],
        form: [
          'À l’attention de {name}\n{street}\n{zip} {city}\nAllemagne\nE-mail : {email}',
          'Je/Nous (*) vous notifie/notifions (*) par la présente ma/notre (*) rétractation du contrat portant sur la vente du bien (*) / pour la prestation de services (*) ci-dessous :',
          'Commandé le (*) / reçu le (*)\nNom du (des) consommateur(s)\nAdresse du (des) consommateur(s)\nSignature du (des) consommateur(s) (uniquement en cas de notification du présent formulaire sur papier)\nDate',
          '(*) Rayez la mention inutile.',
        ],
      },
    ],
  },
}

const nl: Record<LegalDocumentKey, LegalDocumentTranslation> = {
  imprint: {
    updatedAt: 'Laatst bijgewerkt: 31 oktober 2026',
    sections: [
      {
        heading: 'Wettelijke informatie',
        paragraphs: ['{name}\n{street}\n{zip} {city}\nDuitsland\nE-mail: {email}'],
        contactForm: 'Contactformulier',
      },
      {
        heading: 'Activiteit en verantwoordelijkheid',
        paragraphs: [
          'Productie en verkoop van individueel vervaardigde 3D-geprinte producten. Verantwoordelijk voor de inhoud: {name}, op bovenstaand adres.',
        ],
      },
      {
        heading: 'Aansprakelijkheid en auteursrecht',
        paragraphs: [
          'De inhoud wordt zorgvuldig opgesteld, maar wij kunnen de juistheid, volledigheid en actualiteit niet garanderen. Exploitanten van externe websites zijn verantwoordelijk voor hun inhoud; links naar onrechtmatige inhoud worden verwijderd zodra wij daarvan kennisnemen. De inhoud is beschermd door het Duitse auteursrecht; gebruik buiten de wettelijke grenzen vereist voorafgaande schriftelijke toestemming van de rechthebbende.',
        ],
      },
    ],
  },
  privacy: {
    updatedAt: 'Laatst bijgewerkt: 31 oktober 2026',
    sections: [
      {
        heading: '1. Verwerkingsverantwoordelijke',
        paragraphs: [
          'Verwerkingsverantwoordelijke voor de verwerking van persoonsgegevens op deze website is {name}, {street}, {zip} {city}, Duitsland; e-mail: {email}. Er is geen functionaris voor gegevensbescherming aangewezen.',
        ],
      },
      {
        heading: '2. Hosting en serverlogbestanden',
        paragraphs: [
          'De website draait op een virtuele server (VPS) van Hostinger International Ltd., Larnaca, Cyprus, die als verwerker voor ons optreedt. Serverlocatie: [OPEN: locatie van het datacenter volgens het Hostinger-contract aanvullen]. Voor de beschikbaarheid, stabiliteit en beveiliging van de website verwerkt de server onder meer IP-adres, datum en tijd van de oproep, opgeroepen pagina, overgedragen datavolume, referrer-URL en gegevens over browser en besturingssysteem (art. 6 lid 1 onder f AVG). Loggegevens worden verwijderd zodra ze voor deze doeleinden niet meer nodig zijn, uiterlijk na [OPEN: bewaartermijn van logbestanden aanvullen].',
        ],
      },
      {
        heading: '3. Cookies en toestemmingsbeheer',
        paragraphs: [
          'Wij gebruiken noodzakelijke opslagmechanismen voor winkelwagen, verlanglijst, taal, weergave en het beheer van je cookiekeuze. Deze zijn nodig voor de werking van de website (§ 25 lid 2 nr. 2 TDDDG, art. 6 lid 1 onder f AVG).',
          'Kom je via een partnerlink (bijv. van een influencer, adres begint met /r/) bij ons, dan plaatsen wij het cookie ps_ref voor 30 dagen. Het bevat alleen de linkcode en het tijdstip van de klik en dient uitsluitend om een bestelling voor de provisie aan de partner toe te wijzen. De klik tellen wij zonder IP-adres, apparaat- of browsergegevens; het cookie wordt niet aan derden doorgegeven (art. 6 lid 1 onder f AVG, afrekening met onze verkooppartners).',
          'Je keuze wordt in de browser opgeslagen. Om de toestemming te kunnen aantonen, leggen wij bovendien een willekeurige identificatiecode, de gekozen categorieën, versie, taal, tijdstip en user-agent vast. Je kunt je toestemming altijd met werking voor de toekomst wijzigen of intrekken via „Instellingen” in de footer.',
        ],
      },
      {
        heading: '4. Bestelling, betaling en verzending',
        paragraphs: [
          'Bij een bestelling verwerken wij aanhef of naam, factuur- en bezorgadres, e-mailadres, optioneel telefoonnummer en bestel-, product-, betaal- en verzendgegevens om de overeenkomst uit te voeren, betalingen toe te wijzen, facturen op te stellen en de goederen te verzenden (art. 6 lid 1 onder b AVG). Voor wettelijke handels- en fiscale verplichtingen geldt art. 6 lid 1 onder c AVG.',
          'Kies je voor betaling via Stripe, dan integreren wij na het verzenden van de bestelling het betaalformulier van Stripe (Stripe.js) rechtstreeks in de afreken- of bestelstatuspagina. Je betaal-, apparaat- en transactiegegevens voer je daarbij rechtstreeks bij Stripe in; wij ontvangen geen volledige kaartgegevens. Aanbieder is Stripe Payments Europe, Ltd., Dublin, Ierland, die als betaaldienstverlener onder eigen verantwoordelijkheid handelt. Verwerking door Stripe, Inc. in de VS is mogelijk en berust op het EU-US Data Privacy Framework of op EU-modelcontractbepalingen. Meer informatie: https://stripe.com/privacy. Bij bankoverschrijving verwerken wij de betaalgegevens die ons bij de ontvangst van de betaling worden meegedeeld.',
          'Bij Bitcoin leiden wij een betaaladres af uit onze eigen wallet en controleren wij de ontvangst van de betaling aan de hand van openbare blockchaingegevens [OPEN: eventueel gebruikte blockchain-opvraagdienst vermelden]. Blockchaintransacties zijn openbaar zichtbaar en kunnen achteraf niet worden verwijderd. Wij gebruiken geen privésleutels op de webserver. Voor de bezorging geven wij naam, bezorgadres en de voor de verzending benodigde bestel- en contactgegevens door aan DHL of Hermes.',
        ],
      },
      {
        heading: '5. E-mail, klantenportaal en support',
        paragraphs: [
          'Transactionele e-mails zoals orderbevestigingen, facturen, offerte- en verzendinformatie en antwoorden op supportvragen versturen wij via Brevo (Sendinblue SAS, Parijs, Frankrijk) als verwerker; ook e-mailantwoorden op supporttickets ontvangen wij via Brevo. Daarbij worden met name e-mailadres, naam, bestel- of dossiergegevens en de inhoud van het bericht verwerkt (art. 6 lid 1 onder b AVG; voor technische documentatie en misbruikpreventie art. 6 lid 1 onder f AVG).',
          'Voor het klantenportaal sturen wij een persoonlijke, in tijd beperkte toegangslink naar het opgegeven e-mailadres; de hash daarvan en toegangsgebeurtenissen inclusief IP-adres worden opgeslagen om je bestel-, offerte- en factuurgegevens veilig beschikbaar te stellen. Als je contact met ons opneemt of een klacht indient, verwerken wij de door jou verstrekte contact-, bestel- en inhoudsgegevens, inclusief optionele bijlagen, om je verzoek af te handelen.',
          'Verklaar je de herroeping online via „Overeenkomst herroepen”, dan verwerken wij naam, e-mailadres, bestelnummer, de betreffende goederen, je optionele bericht en datum en tijdstip van ontvangst. Wij maken hiervan een supportdossier aan en sturen je een ontvangstbevestiging per e-mail. Rechtsgrondslag is art. 6 lid 1 onder c AVG in samenhang met § 356a BGB en art. 6 lid 1 onder b AVG (afwikkeling van de overeenkomst).',
          'Alleen wie het product bij ons heeft besteld, kan een beoordeling geven. Wij verwerken sterren, titel, tekst, optioneel een foto en de door jou gekozen weergavenaam. Na onze controle publiceren wij de beoordeling, weergavenaam en foto bij het product; e-mailadres en bestelgegevens worden niet getoond. Rechtsgrondslag is art. 6 lid 1 onder f AVG (weergave van echte klantmeningen). Je kunt altijd verwijdering van je beoordeling vragen. [OPEN: bewaartermijn voor beoordelingen vastleggen] Na afronding van een bestelling sturen wij je eenmalig een e-mail met het verzoek om een beoordeling (art. 6 lid 1 onder f AVG juncto § 7 lid 3 UWG). Je kunt op elk moment bezwaar maken tegen dit gebruik van je e-mailadres, bijvoorbeeld per e-mail aan {email}. [OPEN: bezwaarvermelding bij het afrekenen en in elk beoordelingsverzoek toevoegen]',
        ],
      },
      {
        heading: '6. Modeluploads en offertes',
        paragraphs: [
          'Bij een uploadaanvraag verwerken wij naam, e-mailadres, optioneel telefoonnummer, beschrijving, aantal, de geüploade STL- of 3MF-bestanden en de geaccepteerde versie van de uploadvoorwaarden om het model te controleren, een offerte op te stellen en te communiceren en eventueel een daaruit voortvloeiende overeenkomst uit te voeren (art. 6 lid 1 onder b AVG). De bestanden worden niet openbaar gemaakt.',
        ],
      },
      {
        heading: '7. Google Analytics 4, Google Tag Manager en eigen bereikmeting',
        paragraphs: [
          'Google Analytics 4 wordt alleen geladen met je toestemming voor de categorie „Statistiek”. Het verwerkt gebruiks-, pagina-, apparaat- en browsergegevens, globale locatiegegevens en online-identificatoren om het bereik te meten en ons aanbod te verbeteren (§ 25 lid 1 TDDDG, art. 6 lid 1 onder a AVG). Aanbieder: Google Ireland Limited, Gordon House, Barrow Street, Dublin 4, Ierland. Verwerking door Google LLC in de VS is mogelijk; Google LLC is gecertificeerd onder het EU-US Data Privacy Framework (adequaatheidsbesluit van de Europese Commissie van 10 juli 2023). Je kunt je toestemming altijd intrekken via de cookie-instellingen. Meer informatie: https://policies.google.com/privacy',
          'Google Tag Manager van dezelfde aanbieder laden wij alleen als je zowel voor „Statistiek” als voor „Marketing” toestemming hebt gegeven. Het dient voor het beheer van websitetags en verwerkt daarbij met name je IP-adres en technische browsergegevens (§ 25 lid 1 TDDDG, art. 6 lid 1 onder a AVG).',
          'Met toestemming voor „Statistiek” registreren wij bovendien met een eigen, op onze server opgeslagen bereikmeting paginaweergaven, productweergaven en winkelwagen- en afrekengebeurtenissen. Daarvoor slaan wij een willekeurige bezoekers-ID (ps_vid), een sessie-ID, de landingspagina, de taal, de browseridentificatie (user agent) en het daaruit afgeleide apparaattype, het domein van de verwijzende pagina, campagneparameters (UTM) en klik-ID’s uit advertentielinks (fbclid, ttclid, gclid) op, maar geen IP-adres. Bij een bestelling koppelen wij de sessie aan de bestelling om de effectiviteit van campagnes te evalueren (§ 25 lid 1 TDDDG, art. 6 lid 1 onder a AVG). Browseridentificatie, verwijzend domein en klik-ID’s verwijderen wij na 90 dagen, de gebeurtenissen zelf na 395 dagen.',
        ],
      },
      {
        heading: '8. Meta Pixel en TikTok Pixel',
        paragraphs: [
          'Meta Pixel en TikTok Pixel worden alleen geladen met je toestemming voor de categorie „Marketing”. Ze stellen Meta en TikTok in staat bezoeken en acties op deze website aan marketingcampagnes toe te wijzen, doelgroepen te vormen en de effectiviteit van advertenties te meten; daarbij worden online-identificatoren, IP-adres, browser- en apparaatgegevens en informatie over paginaweergaven en interacties verwerkt (§ 25 lid 1 TDDDG, art. 6 lid 1 onder a AVG).',
          'Met dezelfde toestemming sturen wij de gebeurtenissen paginaweergave, productweergave, winkelwagen, start afrekenen en aankoop bovendien rechtstreeks vanaf onze server naar Meta (Conversions API) en TikTok (Events API). Daarbij worden IP-adres, user-agent, de pixelcookies (_fbp, _fbc, _ttp) of klik-ID’s uit advertentielinks, waarde en product van de gebeurtenis en bij een aankoop je e-mailadres als SHA-256-hash doorgegeven. Paginaweergaven, productweergaven, winkelwagen en start afrekenen sturen wij door zonder opslag. Voor de aankoop bewaren wij IP- en cookiegegevens tot de betaling (maximaal 30 dagen) en de daaruit gevormde melding tot de succesvolle overdracht, maximaal 90 dagen. Heb je alleen voor „Marketing” en niet voor „Statistiek” toestemming gegeven, dan slaan wij geen eigen bereikmeting op.',
          'Aanbieder van TikTok Pixel: TikTok Technology Limited, 10 Earlsfort Terrace, Dublin 2, D02 T380, Ierland; verwerking in derde landen (o.a. VS, Singapore) kan niet worden uitgesloten en berust op EU-modelcontractbepalingen. Aanbieder van Meta Pixel: Meta Platforms Ireland Limited, Merrion Road, Dublin 4, D04 X2K5, Ierland. Voor het verzamelen en doorgeven van de gegevens aan Meta zijn wij samen met Meta gezamenlijk verwerkingsverantwoordelijke (art. 26 AVG); voor de verdere verwerking is Meta als enige verantwoordelijk. Verwerking door Meta Platforms, Inc. in de VS is mogelijk; Meta Platforms, Inc. is gecertificeerd onder het EU-US Data Privacy Framework. Je kunt je toestemming altijd intrekken via de cookie-instellingen. Meer informatie: https://www.facebook.com/privacy/policy/ en https://www.tiktok.com/legal/privacy-policy-eea',
        ],
      },
      {
        heading: '9. Bewaartermijnen',
        paragraphs: [
          'Wij verwijderen persoonsgegevens zodra het doel vervalt en er geen wettelijke bewaarplicht of verwijderingsblokkade geldt. Facturen en bijbehorende bestel- en betaalgegevens bewaren wij tien jaar vanaf het einde van het kalenderjaar van uitgifte. Bewijs van toestemming bewaren wij drie jaar na intrekking of laatste wijziging, e-maillogs 90 dagen. Niet-opgedragen upload- en offerteaanvragen worden in de regel na twaalf maanden verwijderd, modelbestanden volgens de daarvoor geldende kortere termijnen. De volledige verwijdertermijnen en de procedure zijn intern vastgelegd in ons verwijder- en bewaarbeleid.',
        ],
      },
      {
        heading: '10. Je rechten',
        paragraphs: [
          'Onder de wettelijke voorwaarden heb je recht op inzage, rectificatie, verwijdering, beperking van de verwerking en gegevensoverdraagbaarheid. Een gegeven toestemming kun je altijd met werking voor de toekomst intrekken. Neem daarvoor contact op via {email}.',
          'Recht van bezwaar: verwerken wij gegevens op grond van art. 6 lid 1 onder f AVG, dan kun je op grond van met je specifieke situatie verband houdende redenen altijd bezwaar maken (art. 21 AVG).',
          'Het verstrekken van de in het bestelformulier als verplicht gemarkeerde gegevens is nodig voor het sluiten van de overeenkomst; zonder deze gegevens kunnen wij de bestelling niet uitvoeren. Overige gegevens zijn vrijwillig. Er vindt geen geautomatiseerde besluitvorming, inclusief profilering, in de zin van art. 22 AVG plaats.',
          'Daarnaast heb je het recht een klacht in te dienen bij een toezichthoudende autoriteit voor gegevensbescherming. Voor ons is in de regel de Landesbeauftragte für Datenschutz und Informationsfreiheit Noordrijn-Westfalen bevoegd.',
        ],
      },
      {
        heading: '11. Wijzigingen van deze verklaring',
        paragraphs: [
          'Wij passen deze privacyverklaring aan wanneer gegevensverwerkingen of wettelijke eisen veranderen. De actuele versie vind je altijd op deze pagina.',
        ],
      },
    ],
  },
  terms: {
    updatedAt: 'Laatst bijgewerkt: 31 oktober 2026',
    sections: [
      {
        heading: '1. Toepassingsgebied',
        paragraphs: [
          'Deze algemene voorwaarden (AV) gelden voor alle overeenkomsten tussen {name}, {street}, {zip} {city}, Duitsland (hierna „wij” of „ons”) en consumenten in de zin van § 13 BGB (Duits Burgerlijk Wetboek) over de verkoop van goederen via deze webshop.',
        ],
      },
      {
        heading: '2. Contractpartij, taal van de overeenkomst en opslag van de contracttekst',
        paragraphs: [
          'Je contractpartij is {name}, {street}, {zip} {city}, Duitsland, e-mail: {email}. De taal van de overeenkomst is Duits; vertalingen van deze pagina dienen uitsluitend ter informatie.',
          'Wij slaan de contracttekst op. Met de orderbevestiging sturen wij je de bestelgegevens, deze algemene voorwaarden en de informatie over het herroepingsrecht per e-mail. Je kunt je bestelling bovendien bekijken via de link in de orderbevestiging. De actuele algemene voorwaarden kun je altijd op deze pagina bekijken en afdrukken.',
        ],
      },
      {
        heading: '3. Aanbod, bestelproces en totstandkoming van de overeenkomst',
        paragraphs: [
          'De presentatie van de producten in de webshop is geen juridisch bindend aanbod, maar een vrijblijvende uitnodiging om te bestellen.',
          'Bestelproces: je configureert een product en legt het in de winkelwagen. Bij het afrekenen vul je je contact- en bezorggegevens in en kies je de betaalmethode. Voor het verzenden zie je een besteloverzicht met alle artikelen, verzendkosten en de totaalprijs. Tot dat moment kun je invoerfouten altijd in de formuliervelden of via de winkelwagen corrigeren of het proces afbreken door het browservenster te sluiten. Door te klikken op „Bestellen met betalingsverplichting” doe je een bindend aanbod tot koop van de goederen in de winkelwagen.',
          'De overeenkomst komt tot stand wanneer wij je aanbod aanvaarden met de orderbevestiging per e-mail of door de goederen te verzenden.',
          'Voor individueel aangevraagde 3D-prints op basis van geüploade bestanden maken wij na controle een offerte. Deze is 14 dagen na ontvangst geldig. De overeenkomst komt tot stand wanneer je de offerte aanvaardt.',
        ],
      },
      {
        heading: '4. Producten en vervaardiging',
        paragraphs: [
          'Alle producten worden pas na de bestelling met 3D-printing vervaardigd. Kaliber, formaat en kleuren kies je uit de opties die bij het betreffende product worden aangeboden; optioneel kun je een box tegen meerprijs met een naam laten personaliseren. Door het procedé zijn fijne laaglijnen en lichte oppervlaktestructuren zichtbaar. Productafbeeldingen dienen ter illustratie; kleuren kunnen per beeldscherm afwijken. Je wettelijke rechten bij gebreken blijven onverlet.',
          'De boxen dienen om te ordenen en te sorteren. Ze vervangen geen opbergmiddel of wapenkluis zoals § 36 van de Duitse Wapenwet (Waffengesetz) voorschrijft voor het bewaren van munitie. Munitie maakt geen deel uit van het aanbod.',
        ],
      },
      {
        heading: '5. Prijzen en verzendkosten',
        paragraphs: [
          'Alle vermelde prijzen zijn eindprijzen in euro. Als kleine ondernemer in de zin van § 19 UStG berekenen wij geen btw.',
          'Daarnaast worden verzendkosten in rekening gebracht: binnen Duitsland € 6,99 (gratis verzending vanaf € 80,00 bestelwaarde), naar alle andere leverlanden € 15,00 (gratis verzending vanaf € 100,00). Vanaf een bestelwaarde van € 100,00 ontvang je bovendien gratis een patroonbox voor 50 patronen naar keuze.',
          'Bij leveringen naar Zwitserland kunnen bij invoer douanerechten, invoer-btw en kosten van de vervoerder verschuldigd zijn. Deze zijn niet in de prijs inbegrepen en komen voor jouw rekening.',
        ],
      },
      {
        heading: '6. Betaling',
        paragraphs: [
          'Beschikbaar zijn betaling per kaart en andere bij het afrekenen getoonde betaalmethoden via Stripe, vooruitbetaling per bankoverschrijving en Bitcoin. Bij vooruitbetaling geven wij de bij het afrekenen getoonde korting op de goederenwaarde; de bankgegevens en het betalingskenmerk ontvang je na de bestelling en het bedrag is direct opeisbaar. Bij betaling met Bitcoin moet het bij de bestelling getoonde bedrag binnen de vermelde betalingstermijn naar het getoonde adres worden overgemaakt. De productie begint pas na volledige ontvangst van de betaling.',
        ],
      },
      {
        heading: '7. Levering',
        paragraphs: [
          'Wij leveren naar Duitsland, Oostenrijk, Zwitserland, Nederland, België, Luxemburg, Frankrijk, Denemarken, Polen, Tsjechië, Italië en Spanje. De levertijd bedraagt binnen Duitsland 3 tot 8 werkdagen en naar de overige leverlanden 7 tot 14 werkdagen, telkens na volledige ontvangst van de betaling. Bij individueel aangevraagde printopdrachten vermelden wij de verwachte levertijd in de offerte. Verzending gebeurt met DHL of Hermes.',
        ],
      },
      {
        heading: '8. Eigendomsvoorbehoud',
        paragraphs: ['De goederen blijven ons eigendom tot volledige betaling.'],
      },
      {
        heading: '9. Herroepingsrecht',
        paragraphs: [
          'Consumenten hebben een wettelijk herroepingsrecht. De details staan in de informatie over het herroepingsrecht. Je kunt de herroeping ook online verklaren via „Overeenkomst herroepen” onderaan elke pagina of op {withdrawUrl}.',
          'Op grond van § 312g lid 2 nr. 1 BGB bestaat er geen herroepingsrecht voor boxen met een persoonlijke naamopdruk (personalisatie) en voor 3D-prints op basis van door jou geüploade bestanden. Voor herroepen goederen draag je de directe kosten van terugzending.',
        ],
      },
      {
        heading: '10. Garantie',
        paragraphs: [
          'De wettelijke rechten bij gebreken zijn van toepassing. Gebreken kun je bij ons melden via het klachtenformulier in de shop of per e-mail aan {email}.',
        ],
      },
      {
        heading: '11. Geschillenbeslechting',
        paragraphs: [
          'Wij zijn niet bereid en niet verplicht deel te nemen aan geschillenbeslechtingsprocedures bij een geschilleninstantie voor consumenten.',
        ],
      },
      {
        heading: '12. Toepasselijk recht',
        paragraphs: [
          'Duits recht is van toepassing, met uitsluiting van het Weens Koopverdrag. Tegenover consumenten geldt deze rechtskeuze alleen voor zover hun daardoor niet de bescherming wordt ontnomen die wordt geboden door dwingende bepalingen van het recht van het land waar de consument zijn gewone verblijfplaats heeft.',
        ],
      },
    ],
  },
  withdrawal: {
    updatedAt: 'Laatst bijgewerkt: 31 oktober 2026',
    sections: [
      {
        heading: 'Herroepingsrecht',
        paragraphs: [
          'Je hebt het recht om binnen veertien dagen zonder opgave van redenen deze overeenkomst te herroepen.',
          'De herroepingstermijn bedraagt veertien dagen vanaf de dag waarop jij of een door jou aangewezen derde, die niet de vervoerder is, de goederen fysiek in bezit neemt. Heb je meerdere goederen in één bestelling besteld en worden deze afzonderlijk geleverd, dan begint de termijn op de dag waarop jij of een door jou aangewezen derde, die niet de vervoerder is, het laatste goed fysiek in bezit neemt.',
          'Om je herroepingsrecht uit te oefenen, moet je ons ({name}, {street}, {zip} {city}, Duitsland, e-mail: {email}) via een ondubbelzinnige verklaring (bv. een per post verzonden brief of een e-mail) op de hoogte stellen van je beslissing de overeenkomst te herroepen. Je kunt hiervoor het onderstaande modelformulier voor herroeping gebruiken, maar bent hiertoe niet verplicht.',
          'Je kunt je herroepingsrecht ook online uitoefenen via de knop „Overeenkomst herroepen” onderaan elke pagina van onze shop of op {withdrawUrl}. Als je deze onlinefunctie gebruikt, sturen wij je onverwijld op een duurzame gegevensdrager (bv. per e-mail) een ontvangstbevestiging met de inhoud van je herroepingsverklaring en de datum en het tijdstip van ontvangst.',
          'Om de herroepingstermijn te halen, volstaat het dat je je mededeling over de uitoefening van het herroepingsrecht verzendt voordat de herroepingstermijn is verstreken.',
        ],
      },
      {
        heading: 'Gevolgen van de herroeping',
        paragraphs: [
          'Als je deze overeenkomst herroept, betalen wij je alle betalingen die wij van je hebben ontvangen, inclusief leveringskosten (met uitzondering van eventuele extra kosten ten gevolge van je keuze voor een andere wijze van levering dan de door ons geboden goedkoopste standaardlevering), onverwijld en in ieder geval niet later dan veertien dagen terug nadat wij op de hoogte zijn gesteld van je beslissing de overeenkomst te herroepen. Wij betalen je terug met hetzelfde betaalmiddel als waarmee je de oorspronkelijke transactie hebt verricht, tenzij uitdrukkelijk anders met je is overeengekomen; in ieder geval worden je voor deze terugbetaling geen kosten in rekening gebracht. Wij mogen wachten met terugbetalen tot wij de goederen hebben teruggekregen of tot je hebt aangetoond dat je de goederen hebt teruggezonden, al naargelang welk tijdstip eerst valt.',
          'Je moet de goederen onverwijld en in ieder geval niet later dan veertien dagen na de dag waarop je ons over de herroeping van deze overeenkomst hebt geïnformeerd, terugzenden of overhandigen aan {name}, {street}, {zip} {city}, Duitsland. Je bent op tijd als je de goederen terugstuurt voordat de termijn van veertien dagen is verstreken. Je draagt de directe kosten van het terugzenden van de goederen.',
          'Je bent alleen aansprakelijk voor de waardevermindering van de goederen die het gevolg is van een behandeling van de goederen die verder gaat dan nodig is om de aard, de kenmerken en de werking van de goederen vast te stellen.',
        ],
      },
      {
        heading: 'Uitsluiting van het herroepingsrecht',
        paragraphs: [
          'Het herroepingsrecht geldt niet voor overeenkomsten voor de levering van goederen die niet geprefabriceerd zijn en voor de vervaardiging waarvan een individuele keuze of bepaling door de consument doorslaggevend is, of die duidelijk zijn afgestemd op de persoonlijke behoeften van de consument (§ 312g lid 2 nr. 1 BGB).',
          'In onze shop betreft dit boxen met een persoonlijke naamopdruk (personalisatie) en 3D-prints op basis van door jou geüploade bestanden. Bevat een bestelling ook andere goederen, dan blijft het herroepingsrecht voor die goederen bestaan.',
        ],
      },
      {
        heading: 'Modelformulier voor herroeping',
        paragraphs: [
          'Als je de overeenkomst wilt herroepen, vul dan dit formulier in en stuur het terug.',
        ],
        form: [
          'Aan {name}\n{street}\n{zip} {city}\nDuitsland\nE-mail: {email}',
          'Hierbij herroep(en) ik/wij (*) de door mij/ons (*) gesloten overeenkomst betreffende de koop van de volgende goederen (*) / de levering van de volgende dienst (*):',
          'Besteld op (*) / ontvangen op (*)\nNaam consument(en)\nAdres consument(en)\nHandtekening consument(en) (alleen wanneer dit formulier op papier wordt ingediend)\nDatum',
          '(*) Doorhalen wat niet van toepassing is.',
        ],
      },
    ],
  },
}

const pl: Record<LegalDocumentKey, LegalDocumentTranslation> = {
  imprint: {
    updatedAt: 'Ostatnia aktualizacja: 31 października 2026 r.',
    sections: [
      {
        heading: 'Informacje prawne',
        paragraphs: ['{name}\n{street}\n{zip} {city}\nNiemcy\nE-mail: {email}'],
        contactForm: 'Formularz kontaktowy',
      },
      {
        heading: 'Działalność i odpowiedzialność',
        paragraphs: [
          'Produkcja i sprzedaż indywidualnie wykonywanych produktów drukowanych w 3D. Osoba odpowiedzialna za treść: {name}, pod powyższym adresem.',
        ],
      },
      {
        heading: 'Odpowiedzialność i prawa autorskie',
        paragraphs: [
          'Treści przygotowujemy z należytą starannością, lecz nie gwarantujemy ich poprawności, kompletności ani aktualności. Operatorzy zewnętrznych stron odpowiadają za własne treści; odnośniki do treści bezprawnych usuwamy po uzyskaniu informacji. Treści są chronione niemieckim prawem autorskim; korzystanie poza granicami ustawowymi wymaga uprzedniej pisemnej zgody uprawnionego.',
        ],
      },
    ],
  },
  privacy: {
    updatedAt: 'Ostatnia aktualizacja: 31 października 2026 r.',
    sections: [
      {
        heading: '1. Administrator',
        paragraphs: [
          'Administratorem danych osobowych przetwarzanych na tej stronie jest {name}, {street}, {zip} {city}, Niemcy; e-mail: {email}. Nie wyznaczono inspektora ochrony danych.',
        ],
      },
      {
        heading: '2. Hosting i logi serwera',
        paragraphs: [
          'Strona działa na wirtualnym serwerze prywatnym (VPS) firmy Hostinger International Ltd., Larnaka, Cypr, która działa na nasze zlecenie jako podmiot przetwarzający. Lokalizacja serwera: [OPEN: uzupełnić lokalizację centrum danych zgodnie z umową z Hostinger]. W celu udostępnienia, stabilności i bezpieczeństwa strony serwer przetwarza m.in. adres IP, datę i godzinę wywołania, wywołaną stronę, ilość przesłanych danych, adres URL odsyłający oraz informacje o przeglądarce i systemie operacyjnym (art. 6 ust. 1 lit. f RODO). Logi są usuwane, gdy nie są już potrzebne do tych celów, najpóźniej po [OPEN: uzupełnić okres przechowywania logów].',
        ],
      },
      {
        heading: '3. Pliki cookie i zarządzanie zgodami',
        paragraphs: [
          'Używamy niezbędnych mechanizmów przechowywania dla koszyka, listy życzeń, języka, wyświetlania i zarządzania Twoim wyborem dotyczącym plików cookie. Są one niezbędne do działania strony (§ 25 ust. 2 pkt 2 TDDDG, art. 6 ust. 1 lit. f RODO).',
          'Jeśli trafiasz do nas przez link partnerski (np. influencera, adres zaczyna się od /r/), ustawiamy plik cookie ps_ref na 30 dni. Zawiera on wyłącznie kod linku i czas kliknięcia i służy wyłącznie do przypisania zamówienia partnerowi w celu naliczenia jego prowizji. Kliknięcie liczymy bez adresu IP, danych urządzenia ani przeglądarki; plik cookie nie jest przekazywany osobom trzecim (art. 6 ust. 1 lit. f RODO, rozliczenia z naszymi partnerami handlowymi).',
          'Twój wybór jest zapisywany w przeglądarce. Aby móc wykazać udzielenie zgody, dokumentujemy dodatkowo losowy identyfikator, wybrane kategorie, wersję, język, czas i user-agent. Zgodę możesz w każdej chwili zmienić lub wycofać ze skutkiem na przyszłość w „Ustawieniach” w stopce.',
        ],
      },
      {
        heading: '4. Zamówienie, płatność i wysyłka',
        paragraphs: [
          'Przy zamówieniu przetwarzamy formę zwracania się lub imię i nazwisko, adres rozliczeniowy i adres dostawy, adres e-mail, opcjonalnie numer telefonu oraz dane zamówienia, produktu, płatności i wysyłki, aby wykonać umowę, przypisać płatności, wystawić faktury i wysłać towar (art. 6 ust. 1 lit. b RODO). W zakresie obowiązków wynikających z prawa handlowego i podatkowego podstawą jest art. 6 ust. 1 lit. c RODO.',
          'Jeśli wybierzesz płatność przez Stripe, po wysłaniu zamówienia osadzamy formularz płatności Stripe (Stripe.js) bezpośrednio na stronie kasy lub statusu zamówienia. Dane płatności, urządzenia i transakcji wprowadzasz bezpośrednio w Stripe; nie otrzymujemy pełnych danych karty. Dostawcą jest Stripe Payments Europe, Ltd., Dublin, Irlandia, działająca na własną odpowiedzialność jako dostawca usług płatniczych. Możliwe jest przetwarzanie przez Stripe, Inc. w USA na podstawie EU-US Data Privacy Framework lub standardowych klauzul umownych UE. Więcej informacji: https://stripe.com/privacy. Przy przelewie bankowym przetwarzamy dane płatności przekazane nam wraz z wpływem płatności.',
          'Przy płatności w Bitcoinach wyprowadzamy adres płatności z naszego własnego portfela i sprawdzamy wpływ płatności na podstawie publicznych danych blockchain [OPEN: wskazać ewentualnie używaną usługę odpytywania blockchain]. Transakcje blockchain są publicznie widoczne i nie mogą zostać później usunięte. Nie używamy kluczy prywatnych na serwerze WWW. W celu doręczenia przekazujemy imię i nazwisko, adres dostawy oraz dane zamówienia i kontaktowe niezbędne do realizacji wysyłki firmie DHL lub Hermes.',
        ],
      },
      {
        heading: '5. Komunikacja e-mail, strefa klienta i wsparcie',
        paragraphs: [
          'E-maile transakcyjne, takie jak potwierdzenia zamówień, faktury, informacje o ofertach i wysyłce oraz odpowiedzi na zgłoszenia wsparcia, wysyłamy przez Brevo (Sendinblue SAS, Paryż, Francja) jako podmiot przetwarzający; przez Brevo odbieramy również odpowiedzi e-mail na zgłoszenia wsparcia. Przetwarzane są przy tym w szczególności adres e-mail, imię i nazwisko, dane zamówienia lub sprawy oraz treść wiadomości (art. 6 ust. 1 lit. b RODO; w zakresie dokumentacji technicznej i przeciwdziałania nadużyciom art. 6 ust. 1 lit. f RODO).',
          'Do strefy klienta wysyłamy na podany adres e-mail osobisty link dostępu ograniczony w czasie; zapisujemy jego hash oraz zdarzenia dostępu wraz z adresem IP, aby bezpiecznie udostępniać Twoje dane zamówień, ofert i faktur. Gdy kontaktujesz się z nami lub składasz reklamację, przetwarzamy przekazane przez Ciebie dane kontaktowe, dane zamówienia i treść, w tym opcjonalne załączniki, aby obsłużyć Twoją sprawę.',
          'Jeśli złożysz oświadczenie o odstąpieniu online za pomocą funkcji „Odstąp od umowy”, przetwarzamy imię i nazwisko, adres e-mail, numer zamówienia, towary, których dotyczy odstąpienie, Twoją opcjonalną wiadomość oraz datę i godzinę wpływu. Na tej podstawie zakładamy zgłoszenie w systemie wsparcia i wysyłamy Ci e-mailem potwierdzenie otrzymania. Podstawą prawną jest art. 6 ust. 1 lit. c RODO w związku z § 356a BGB oraz art. 6 ust. 1 lit. b RODO (rozliczenie umowy).',
          'Opinię może wystawić tylko osoba, która zamówiła produkt u nas. Przetwarzamy przy tym liczbę gwiazdek, tytuł, tekst, opcjonalnie zdjęcie oraz wybraną przez Ciebie nazwę wyświetlaną. Po weryfikacji publikujemy opinię, nazwę wyświetlaną i zdjęcie przy produkcie; adres e-mail i dane zamówienia nie są wyświetlane. Podstawą prawną jest art. 6 ust. 1 lit. f RODO (prezentowanie prawdziwych opinii klientów). W każdej chwili możesz zażądać usunięcia swojej opinii. [OPEN: ustalić okres przechowywania opinii] Po zakończeniu zamówienia wysyłamy jednorazowo e-mail z prośbą o opinię (art. 6 ust. 1 lit. f RODO w zw. z § 7 ust. 3 UWG). W każdej chwili możesz sprzeciwić się takiemu wykorzystaniu adresu e-mail, np. pisząc na {email}. [OPEN: dodać informację o prawie sprzeciwu w kasie i w każdej prośbie o opinię]',
        ],
      },
      {
        heading: '6. Przesyłanie modeli i oferty',
        paragraphs: [
          'Przy zapytaniu z przesłaniem pliku przetwarzamy imię i nazwisko, adres e-mail, opcjonalnie numer telefonu, opis, ilość, przesłane pliki STL lub 3MF oraz zaakceptowaną wersję warunków przesyłania, aby sprawdzić model, przygotować i przekazać ofertę oraz ewentualnie wykonać zawartą na jej podstawie umowę (art. 6 ust. 1 lit. b RODO). Pliki nie są udostępniane publicznie.',
        ],
      },
      {
        heading: '7. Google Analytics 4, Google Tag Manager i własny pomiar zasięgu',
        paragraphs: [
          'Google Analytics 4 ładuje się wyłącznie za Twoją zgodą na kategorię „Statystyka”. Przetwarza dane o korzystaniu, odwiedzanych stronach, urządzeniu i przeglądarce, przybliżonej lokalizacji oraz identyfikatory online w celu pomiaru zasięgu i ulepszania naszej oferty (§ 25 ust. 1 TDDDG, art. 6 ust. 1 lit. a RODO). Dostawca: Google Ireland Limited, Gordon House, Barrow Street, Dublin 4, Irlandia. Możliwe jest przetwarzanie przez Google LLC w USA; Google LLC posiada certyfikację w ramach EU-US Data Privacy Framework (decyzja Komisji Europejskiej stwierdzająca odpowiedni stopień ochrony z 10 lipca 2023 r.). Zgodę możesz w każdej chwili wycofać w ustawieniach plików cookie. Więcej informacji: https://policies.google.com/privacy',
          'Google Tag Manager tego samego dostawcy ładujemy tylko wtedy, gdy udzielisz zgody zarówno na „Statystykę”, jak i na „Marketing”. Służy on do zarządzania tagami strony i przetwarza przy tym w szczególności Twój adres IP oraz techniczne dane przeglądarki (§ 25 ust. 1 TDDDG, art. 6 ust. 1 lit. a RODO).',
          'Za zgodą na „Statystykę” rejestrujemy ponadto za pomocą własnego pomiaru zasięgu przechowywanego na naszym serwerze wyświetlenia stron, wyświetlenia produktów oraz zdarzenia koszyka i kasy. W tym celu zapisujemy losowy identyfikator odwiedzającego (ps_vid), identyfikator sesji, stronę wejścia, język, identyfikator przeglądarki (user agent) i wyprowadzony z niego typ urządzenia, domenę strony odsyłającej, parametry kampanii (UTM) oraz identyfikatory kliknięć z linków reklamowych (fbclid, ttclid, gclid), ale nie adres IP. Przy zamówieniu łączymy sesję z zamówieniem, aby oceniać skuteczność kampanii (§ 25 ust. 1 TDDDG, art. 6 ust. 1 lit. a RODO). Identyfikator przeglądarki, domenę odsyłającą i identyfikatory kliknięć usuwamy po 90 dniach, a same zdarzenia po 395 dniach.',
        ],
      },
      {
        heading: '8. Meta Pixel i TikTok Pixel',
        paragraphs: [
          'Meta Pixel i TikTok Pixel ładują się wyłącznie za Twoją zgodą na kategorię „Marketing”. Umożliwiają one firmom Meta i TikTok przypisywanie wizyt i działań na tej stronie do kampanii marketingowych, tworzenie grup odbiorców i mierzenie skuteczności reklam; przetwarzane są przy tym identyfikatory online, adres IP, dane przeglądarki i urządzenia oraz informacje o wyświetleniach stron i interakcjach (§ 25 ust. 1 TDDDG, art. 6 ust. 1 lit. a RODO).',
          'Za tą samą zgodą przesyłamy dodatkowo zdarzenia wyświetlenie strony, wyświetlenie produktu, koszyk, rozpoczęcie płatności i zakup bezpośrednio z naszego serwera do Meta (Conversions API) i TikTok (Events API). Przekazywane są przy tym adres IP, user-agent, pliki cookie pikseli (_fbp, _fbc, _ttp) lub identyfikatory kliknięć z linków reklamowych, wartość i produkt zdarzenia oraz przy zakupie Twój adres e-mail w postaci hasha SHA-256. Wyświetlenia stron, wyświetlenia produktów, koszyk i rozpoczęcie płatności przekazujemy bez zapisywania. W przypadku zakupu przechowujemy dane IP i plików cookie do czasu płatności (maksymalnie 30 dni), a utworzony na ich podstawie komunikat do skutecznego przesłania, maksymalnie 90 dni. Jeśli udzielisz zgody tylko na „Marketing”, a nie na „Statystykę”, nie zapisujemy własnego pomiaru zasięgu.',
          'Dostawca TikTok Pixel: TikTok Technology Limited, 10 Earlsfort Terrace, Dublin 2, D02 T380, Irlandia; nie można wykluczyć przetwarzania w państwach trzecich (m.in. USA, Singapur), które odbywa się na podstawie standardowych klauzul umownych UE. Dostawca Meta Pixel: Meta Platforms Ireland Limited, Merrion Road, Dublin 4, D04 X2K5, Irlandia. Za zbieranie i przekazywanie danych do Meta odpowiadamy wspólnie z Meta jako współadministratorzy (art. 26 RODO); za dalsze przetwarzanie odpowiada wyłącznie Meta. Możliwe jest przetwarzanie przez Meta Platforms, Inc. w USA; Meta Platforms, Inc. posiada certyfikację w ramach EU-US Data Privacy Framework. Zgodę możesz w każdej chwili wycofać w ustawieniach plików cookie. Więcej informacji: https://www.facebook.com/privacy/policy/ oraz https://www.tiktok.com/legal/privacy-policy-eea',
        ],
      },
      {
        heading: '9. Okres przechowywania',
        paragraphs: [
          'Usuwamy dane osobowe, gdy odpadnie cel ich przetwarzania, chyba że sprzeciwia się temu ustawowy obowiązek przechowywania lub blokada usunięcia. Faktury oraz powiązane dane zamówień i płatności przechowujemy przez dziesięć lat od końca roku kalendarzowego ich wystawienia. Dowody udzielenia zgody przechowujemy przez trzy lata od wycofania lub ostatniej zmiany, logi e-mail przez 90 dni. Niezlecone zapytania z przesłaniem plików i zapytania ofertowe usuwamy co do zasady po dwunastu miesiącach, pliki modeli w krótszych terminach, które ich dotyczą. Pełne terminy usuwania i procedurę określa nasza wewnętrzna koncepcja usuwania i przechowywania danych.',
        ],
      },
      {
        heading: '10. Twoje prawa',
        paragraphs: [
          'Na warunkach określonych w przepisach przysługuje Ci prawo dostępu do danych, ich sprostowania, usunięcia, ograniczenia przetwarzania oraz przenoszenia danych. Udzieloną zgodę możesz w każdej chwili wycofać ze skutkiem na przyszłość. W tym celu napisz na adres {email}.',
          'Prawo sprzeciwu: jeśli przetwarzamy dane na podstawie art. 6 ust. 1 lit. f RODO, możesz w każdej chwili wnieść sprzeciw z przyczyn związanych z Twoją szczególną sytuacją (art. 21 RODO).',
          'Podanie danych oznaczonych w formularzu zamówienia jako obowiązkowe jest niezbędne do zawarcia umowy; bez nich nie możemy zrealizować zamówienia. Pozostałe dane są dobrowolne. Nie dochodzi do zautomatyzowanego podejmowania decyzji, w tym profilowania, w rozumieniu art. 22 RODO.',
          'Masz także prawo wniesienia skargi do organu nadzorczego ds. ochrony danych. Właściwym organem jest dla nas co do zasady Landesbeauftragte für Datenschutz und Informationsfreiheit Nadrenii Północnej-Westfalii.',
        ],
      },
      {
        heading: '11. Aktualizacja niniejszej polityki',
        paragraphs: [
          'Dostosowujemy niniejszą politykę prywatności, gdy zmieniają się operacje przetwarzania danych lub wymogi prawne. Aktualna wersja jest zawsze dostępna na tej stronie.',
        ],
      },
    ],
  },
  terms: {
    updatedAt: 'Ostatnia aktualizacja: 31 października 2026 r.',
    sections: [
      {
        heading: '1. Zakres stosowania',
        paragraphs: [
          'Niniejsze Ogólne Warunki Handlowe (OWH) obowiązują w odniesieniu do wszystkich umów sprzedaży towarów zawieranych za pośrednictwem tego sklepu internetowego między sprzedawcą (dalej „my” lub „nas”) a konsumentami w rozumieniu § 13 BGB (niemieckiego kodeksu cywilnego). Sprzedawca: {name}, {street}, {zip} {city}, Niemcy.',
        ],
      },
      {
        heading: '2. Strona umowy, język umowy i przechowywanie treści umowy',
        paragraphs: [
          'Stroną umowy jest: {name}, {street}, {zip} {city}, Niemcy, e-mail: {email}. Językiem umowy jest niemiecki; tłumaczenia tej strony mają wyłącznie charakter informacyjny.',
          'Przechowujemy treść umowy. Wraz z potwierdzeniem zamówienia wysyłamy Ci e-mailem dane zamówienia, niniejsze OWH oraz pouczenie o prawie odstąpienia od umowy. Swoje zamówienie możesz dodatkowo wyświetlić za pomocą linku w potwierdzeniu zamówienia. Aktualne OWH możesz w każdej chwili wyświetlić i wydrukować na tej stronie.',
        ],
      },
      {
        heading: '3. Oferta, proces zamówienia i zawarcie umowy',
        paragraphs: [
          'Prezentacja produktów w sklepie internetowym nie stanowi prawnie wiążącej oferty, lecz niewiążące zaproszenie do składania zamówień.',
          'Proces zamówienia: konfigurujesz produkt i dodajesz go do koszyka. W kasie podajesz dane kontaktowe i adres dostawy oraz wybierasz metodę płatności. Przed wysłaniem widzisz podsumowanie zamówienia ze wszystkimi pozycjami, kosztami wysyłki i ceną całkowitą. Do tego momentu możesz w każdej chwili poprawić błędy we wprowadzonych danych w polach formularza lub w koszyku albo przerwać proces, zamykając okno przeglądarki. Klikając „Zamawiam i płacę”, składasz wiążącą ofertę zakupu towarów znajdujących się w koszyku.',
          'Umowa zostaje zawarta, gdy przyjmiemy Twoją ofertę, wysyłając potwierdzenie zamówienia e-mailem, lub gdy wyślemy towar.',
          'Na indywidualnie zamawiane wydruki 3D według przesłanych plików przygotowujemy po weryfikacji ofertę. Jest ona ważna przez 14 dni od jej otrzymania. Umowa zostaje zawarta z chwilą przyjęcia przez Ciebie oferty.',
        ],
      },
      {
        heading: '4. Produkty i wytwarzanie',
        paragraphs: [
          'Wszystkie produkty są wytwarzane metodą druku 3D dopiero po złożeniu zamówienia. Kaliber, rozmiar i kolory wybierasz spośród opcji oferowanych przy danym produkcie; opcjonalnie możesz za dopłatą zlecić personalizację pudełka imieniem lub nazwą. Ze względu na technologię widoczne są delikatne linie warstw i lekka struktura powierzchni. Zdjęcia produktów mają charakter poglądowy; kolory mogą się różnić w zależności od ekranu. Twoje ustawowe uprawnienia z tytułu wad pozostają nienaruszone.',
          'Pudełka służą do porządkowania i sortowania. Nie zastępują pojemnika ani szafy na broń, których do przechowywania amunicji wymaga § 36 niemieckiej ustawy o broni (Waffengesetz). Amunicja nie jest częścią oferty.',
        ],
      },
      {
        heading: '5. Ceny i koszty wysyłki',
        paragraphs: [
          'Wszystkie podane ceny są cenami końcowymi w euro. Jako mały przedsiębiorca w rozumieniu § 19 UStG nie wykazujemy podatku VAT.',
          'Do ceny doliczane są koszty wysyłki: na terenie Niemiec 6,99 € (darmowa wysyłka od wartości zamówienia 80,00 €), do wszystkich pozostałych krajów dostawy 15,00 € (darmowa wysyłka od 100,00 €). Przy zamówieniu o wartości od 100,00 € otrzymujesz dodatkowo bezpłatnie wybrane pudełko na 50 naboi.',
          'Przy dostawach do Szwajcarii przy imporcie mogą zostać naliczone cła, podatek VAT od importu oraz opłaty przewoźnika. Nie są one wliczone w cenę i ponosisz je Ty.',
        ],
      },
      {
        heading: '6. Płatność',
        paragraphs: [
          'Dostępne są: płatność kartą i innymi metodami płatności wyświetlanymi w kasie za pośrednictwem Stripe, przedpłata przelewem bankowym oraz Bitcoin. Przy przedpłacie udzielamy wyświetlanego w kasie rabatu od wartości towaru; dane bankowe i tytuł przelewu otrzymasz po złożeniu zamówienia, a kwota jest płatna natychmiast. Przy płatności w Bitcoinach kwotę wyświetloną przy zamówieniu należy przesłać na wskazany adres w podanym terminie płatności. Produkcja rozpoczyna się dopiero po otrzymaniu pełnej płatności.',
        ],
      },
      {
        heading: '7. Dostawa',
        paragraphs: [
          'Dostarczamy do Niemiec, Austrii, Szwajcarii, Holandii, Belgii, Luksemburga, Francji, Danii, Polski, Czech, Włoch i Hiszpanii. Czas dostawy wynosi na terenie Niemiec od 3 do 8 dni roboczych, a do pozostałych krajów dostawy od 7 do 14 dni roboczych, w każdym przypadku od otrzymania pełnej płatności. W przypadku indywidualnie zamawianych wydruków przewidywany czas dostawy podajemy w ofercie. Wysyłka odbywa się za pośrednictwem DHL lub Hermes.',
        ],
      },
      {
        heading: '8. Zastrzeżenie własności',
        paragraphs: ['Towar pozostaje naszą własnością do czasu pełnej zapłaty.'],
      },
      {
        heading: '9. Prawo odstąpienia od umowy',
        paragraphs: [
          'Konsumentom przysługuje ustawowe prawo odstąpienia od umowy. Szczegóły zawiera pouczenie o prawie odstąpienia od umowy. Odstąpienie możesz złożyć także online za pomocą przycisku „Odstąp od umowy” w stopce każdej strony lub pod adresem {withdrawUrl}.',
          'Zgodnie z § 312g ust. 2 pkt 1 BGB prawo odstąpienia nie przysługuje w odniesieniu do pudełek z osobistym napisem z imieniem lub nazwą (personalizacja) ani do wydruków 3D wykonanych według przesłanych przez Ciebie plików. W przypadku towarów, od których umowy odstępujesz, ponosisz bezpośrednie koszty ich zwrotu.',
        ],
      },
      {
        heading: '10. Rękojmia',
        paragraphs: [
          'Obowiązują ustawowe uprawnienia z tytułu wad. Wady możesz zgłosić nam za pomocą formularza reklamacyjnego w sklepie lub e-mailem na adres {email}.',
        ],
      },
      {
        heading: '11. Rozstrzyganie sporów',
        paragraphs: [
          'Nie jesteśmy gotowi ani zobowiązani do udziału w postępowaniu w sprawie rozstrzygania sporów przed podmiotem polubownego rozwiązywania sporów konsumenckich.',
        ],
      },
      {
        heading: '12. Prawo właściwe',
        paragraphs: [
          'Obowiązuje prawo niemieckie z wyłączeniem Konwencji Narodów Zjednoczonych o umowach międzynarodowej sprzedaży towarów. Wobec konsumentów ten wybór prawa obowiązuje tylko w takim zakresie, w jakim nie pozbawia ich ochrony przyznanej przez bezwzględnie obowiązujące przepisy prawa państwa, w którym mają miejsce zwykłego pobytu.',
        ],
      },
    ],
  },
  withdrawal: {
    updatedAt: 'Ostatnia aktualizacja: 31 października 2026 r.',
    sections: [
      {
        heading: 'Prawo odstąpienia od umowy',
        paragraphs: [
          'Masz prawo odstąpić od niniejszej umowy w terminie czternastu dni bez podania jakiejkolwiek przyczyny.',
          'Termin do odstąpienia od umowy wynosi czternaście dni od dnia, w którym Ty lub wskazana przez Ciebie osoba trzecia inna niż przewoźnik weszła w posiadanie towaru. Jeżeli w ramach jednego zamówienia zamówiono kilka towarów, które są dostarczane osobno, termin rozpoczyna się w dniu, w którym Ty lub wskazana przez Ciebie osoba trzecia inna niż przewoźnik weszła w posiadanie ostatniego towaru.',
          'Aby skorzystać z prawa odstąpienia od umowy, musisz poinformować nas ({name}, {street}, {zip} {city}, Niemcy, e-mail: {email}) o swojej decyzji o odstąpieniu od niniejszej umowy w drodze jednoznacznego oświadczenia (na przykład pismo wysłane pocztą lub e-mailem). Możesz skorzystać z poniższego wzoru formularza odstąpienia od umowy, jednak nie jest to obowiązkowe.',
          'Z prawa odstąpienia możesz skorzystać także online za pomocą przycisku „Odstąp od umowy” w stopce każdej strony naszego sklepu lub pod adresem {withdrawUrl}. Jeżeli skorzystasz z tej funkcji online, niezwłocznie prześlemy Ci na trwałym nośniku (np. e-mailem) potwierdzenie otrzymania zawierające treść oświadczenia o odstąpieniu oraz datę i godzinę jego otrzymania.',
          'Aby zachować termin do odstąpienia od umowy, wystarczy, że wyślesz informację dotyczącą wykonania przysługującego Ci prawa odstąpienia od umowy przed upływem terminu do odstąpienia od umowy.',
        ],
      },
      {
        heading: 'Skutki odstąpienia od umowy',
        paragraphs: [
          'W przypadku odstąpienia od niniejszej umowy zwracamy Ci wszystkie otrzymane od Ciebie płatności, w tym koszty dostarczenia (z wyjątkiem dodatkowych kosztów wynikających z wybranego przez Ciebie sposobu dostarczenia innego niż najtańszy zwykły sposób dostarczenia oferowany przez nas), niezwłocznie, a w każdym przypadku nie później niż czternaście dni od dnia, w którym zostaliśmy poinformowani o Twojej decyzji o wykonaniu prawa odstąpienia od niniejszej umowy. Zwrotu płatności dokonamy przy użyciu takich samych sposobów płatności, jakie zostały przez Ciebie użyte w pierwotnej transakcji, chyba że wyraźnie uzgodniono z Tobą inaczej; w żadnym przypadku nie poniesiesz opłat w związku z tym zwrotem. Możemy wstrzymać się ze zwrotem płatności do czasu otrzymania towaru z powrotem lub do czasu dostarczenia nam dowodu jego odesłania, w zależności od tego, które zdarzenie nastąpi wcześniej.',
          'Towar musisz odesłać lub przekazać na adres: {name}, {street}, {zip} {city}, Niemcy, niezwłocznie, a w każdym razie nie później niż czternaście dni od dnia, w którym poinformujesz nas o odstąpieniu od niniejszej umowy. Termin jest zachowany, jeżeli odeślesz towar przed upływem terminu czternastu dni. Ponosisz bezpośrednie koszty zwrotu towaru.',
          'Odpowiadasz tylko za zmniejszenie wartości towaru wynikające z korzystania z niego w sposób inny niż było to konieczne do stwierdzenia charakteru, cech i funkcjonowania towaru.',
        ],
      },
      {
        heading: 'Wyłączenie prawa odstąpienia od umowy',
        paragraphs: [
          'Prawo odstąpienia od umowy nie przysługuje w przypadku umów o dostarczenie towarów, które nie są prefabrykowane i do których wytworzenia decydujące znaczenie ma indywidualny wybór lub określenie dokonane przez konsumenta albo które są wyraźnie dostosowane do osobistych potrzeb konsumenta (§ 312g ust. 2 pkt 1 BGB).',
          'W naszym sklepie dotyczy to pudełek z osobistym napisem z imieniem lub nazwą (personalizacja) oraz wydruków 3D wykonanych według przesłanych przez Ciebie plików. Jeżeli zamówienie obejmuje także inne towary, prawo odstąpienia w odniesieniu do nich pozostaje zachowane.',
        ],
      },
      {
        heading: 'Wzór formularza odstąpienia od umowy',
        paragraphs: ['Jeżeli chcesz odstąpić od umowy, wypełnij ten formularz i odeślij go.'],
        form: [
          'Adresat: {name}\n{street}\n{zip} {city}\nNiemcy\nE-mail: {email}',
          'Niniejszym informuję/informujemy (*) o moim/naszym (*) odstąpieniu od umowy sprzedaży następujących towarów (*) / umowy o świadczenie następującej usługi (*):',
          'Data zamówienia (*) / data odbioru (*)\nImię i nazwisko konsumenta(-ów)\nAdres konsumenta(-ów)\nPodpis konsumenta(-ów) (tylko jeżeli formularz jest przesyłany w wersji papierowej)\nData',
          '(*) Niepotrzebne skreślić.',
        ],
      },
    ],
  },
}

const cs: Record<LegalDocumentKey, LegalDocumentTranslation> = {
  imprint: {
    updatedAt: 'Aktualizováno: 31. 10. 2026',
    sections: [
      {
        heading: 'Právní informace',
        paragraphs: ['{name}\n{street}\n{zip} {city}\nNěmecko\nE-mail: {email}'],
        contactForm: 'Kontaktní formulář',
      },
      {
        heading: 'Činnost a odpovědnost',
        paragraphs: [
          'Výroba a prodej individuálně vyráběných produktů z 3D tisku. Za obsah odpovídá {name} na výše uvedené adrese.',
        ],
      },
      {
        heading: 'Odpovědnost a autorské právo',
        paragraphs: [
          'Obsah připravujeme pečlivě, nemůžeme však zaručit jeho správnost, úplnost ani aktuálnost. Provozovatelé externích webů odpovídají za svůj obsah; odkazy na protiprávní obsah odstraníme, jakmile se o něm dozvíme. Obsah je chráněn německým autorským právem a užití nad zákonný rámec vyžaduje předchozí písemný souhlas držitele práv.',
        ],
      },
    ],
  },
  privacy: {
    updatedAt: 'Aktualizováno: 31. 10. 2026',
    sections: [
      {
        heading: '1. Správce',
        paragraphs: [
          'Správcem osobních údajů zpracovávaných na tomto webu je {name}, {street}, {zip} {city}, Německo; e-mail: {email}. Pověřenec pro ochranu osobních údajů nebyl jmenován.',
        ],
      },
      {
        heading: '2. Hosting a serverové logy',
        paragraphs: [
          'Web běží na virtuálním privátním serveru (VPS) společnosti Hostinger International Ltd., Larnaka, Kypr, která pro nás působí jako zpracovatel. Umístění serveru: [OPEN: doplnit umístění datového centra podle smlouvy s Hostingerem]. Pro zajištění provozu, stability a bezpečnosti webu server zpracovává zejména IP adresu, datum a čas přístupu, navštívenou stránku, objem přenesených dat, odkazující URL a údaje o prohlížeči a operačním systému (čl. 6 odst. 1 písm. f GDPR). Logy mažeme, jakmile pro tyto účely nejsou potřebné, nejpozději po [OPEN: doplnit dobu uchovávání logů].',
        ],
      },
      {
        heading: '3. Cookies a správa souhlasů',
        paragraphs: [
          'Používáme nezbytná úložiště pro košík, seznam přání, jazyk, zobrazení a správu tvé volby cookies. Jsou nutná pro provoz webu (§ 25 odst. 2 bod 2 TDDDG, čl. 6 odst. 1 písm. f GDPR).',
          'Pokud k nám přijdeš přes partnerský odkaz (např. od influencera, adresa začíná /r/), nastavíme cookie ps_ref na 30 dní. Obsahuje pouze kód odkazu a čas kliknutí a slouží výhradně k přiřazení objednávky partnerovi kvůli jeho provizi. Kliknutí počítáme bez IP adresy a bez údajů o zařízení či prohlížeči; cookie nepředáváme žádným třetím stranám (čl. 6 odst. 1 písm. f GDPR, vyúčtování s našimi obchodními partnery).',
          'Tvá volba se ukládá v prohlížeči. Abychom mohli souhlas prokázat, zaznamenáváme navíc náhodný identifikátor, zvolené kategorie, verzi, jazyk, čas a user-agent. Souhlas můžeš kdykoli s účinkem do budoucna změnit nebo odvolat přes „Nastavení“ v patičce.',
        ],
      },
      {
        heading: '4. Objednávka, platba a doprava',
        paragraphs: [
          'Při objednávce zpracováváme oslovení nebo jméno, fakturační a doručovací adresu, e-mailovou adresu, volitelně telefonní číslo a údaje o objednávce, produktu, platbě a dopravě, abychom mohli plnit smlouvu, přiřazovat platby, vystavovat faktury a odesílat zboží (čl. 6 odst. 1 písm. b GDPR). Pro zákonné obchodní a daňové povinnosti je právním základem čl. 6 odst. 1 písm. c GDPR.',
          'Pokud zvolíš platbu přes Stripe, po odeslání objednávky vložíme platební formulář Stripe (Stripe.js) přímo do stránky pokladny nebo stavu objednávky. Platební údaje, údaje o zařízení a transakci zadáváš přímo u Stripe; úplné údaje o kartě nedostáváme. Poskytovatelem je Stripe Payments Europe, Ltd., Dublin, Irsko, která jako poskytovatel platebních služeb jedná na vlastní odpovědnost. Zpracování společností Stripe, Inc. v USA je možné a zakládá se na EU-US Data Privacy Framework nebo na standardních smluvních doložkách EU. Více informací: https://stripe.com/privacy. U bankovního převodu zpracováváme platební údaje, které nám jsou sděleny s přijetím platby.',
          'U Bitcoinu odvozujeme platební adresu z naší vlastní peněženky a přijetí platby ověřujeme pomocí veřejných dat blockchainu [OPEN: uvést případně používanou službu pro dotazy do blockchainu]. Blockchainové transakce jsou veřejně viditelné a nelze je dodatečně smazat. Na webovém serveru nepoužíváme žádné soukromé klíče. Pro doručení předáváme jméno, doručovací adresu a údaje o objednávce a kontaktní údaje potřebné k odeslání přepravci DHL nebo Hermes.',
        ],
      },
      {
        heading: '5. E-mailová komunikace, zákaznická sekce a podpora',
        paragraphs: [
          'Transakční e-maily, jako jsou potvrzení objednávek, faktury, informace o nabídkách a odeslání a odpovědi na dotazy podpory, odesíláme přes Brevo (Sendinblue SAS, Paříž, Francie) jako zpracovatele; přes Brevo přijímáme i e-mailové odpovědi na požadavky podpory. Zpracovávají se přitom zejména e-mailová adresa, jméno, údaje o objednávce či požadavku a obsah zprávy (čl. 6 odst. 1 písm. b GDPR; pro technickou dokumentaci a ochranu před zneužitím čl. 6 odst. 1 písm. f GDPR).',
          'Do zákaznické sekce posíláme na zadanou e-mailovou adresu osobní, časově omezený přístupový odkaz; ukládáme jeho hash a události přístupu včetně IP adresy, abychom ti bezpečně zpřístupnili údaje o objednávkách, nabídkách a fakturách. Když nás kontaktuješ nebo podáš reklamaci, zpracováváme tebou předané kontaktní údaje, údaje o objednávce a obsah včetně volitelných příloh, abychom tvůj požadavek vyřídili.',
          'Pokud prohlásíš odstoupení online přes „Odstoupit od smlouvy“, zpracováváme jméno, e-mailovou adresu, číslo objednávky, dotčené zboží, tvou volitelnou zprávu a datum a čas přijetí. Vytvoříme z toho požadavek podpory a pošleme ti e-mailem potvrzení o přijetí. Právním základem je čl. 6 odst. 1 písm. c GDPR ve spojení s § 356a BGB a čl. 6 odst. 1 písm. b GDPR (vypořádání smlouvy).',
          'Hodnotit může jen ten, kdo si produkt u nás objednal. Zpracováváme přitom hvězdičky, nadpis, text, volitelně fotografii a tebou zvolené zobrazované jméno. Po naší kontrole zveřejníme hodnocení, zobrazované jméno a fotografii u produktu; e-mailová adresa a údaje o objednávce se nezobrazují. Právním základem je čl. 6 odst. 1 písm. f GDPR (zobrazení skutečných názorů zákazníků). Smazání svého hodnocení můžeš kdykoli požadovat. [OPEN: stanovit dobu uchovávání hodnocení] Po dokončení objednávky ti jednorázově pošleme e-mail s prosbou o hodnocení (čl. 6 odst. 1 písm. f GDPR ve spojení s § 7 odst. 3 UWG). Proti tomuto použití své e-mailové adresy můžeš kdykoli vznést námitku, např. e-mailem na {email}. [OPEN: doplnit upozornění na námitku v pokladně a v každé žádosti o hodnocení]',
        ],
      },
      {
        heading: '6. Nahrávání modelů a nabídky',
        paragraphs: [
          'U poptávky s nahráním souboru zpracováváme jméno, e-mailovou adresu, volitelně telefonní číslo, popis, množství, nahrané soubory STL nebo 3MF a přijatou verzi podmínek nahrávání, abychom model zkontrolovali, vypracovali a sdělili nabídku a případně splnili smlouvu, která z ní vznikne (čl. 6 odst. 1 písm. b GDPR). Soubory nejsou veřejně zpřístupněny.',
        ],
      },
      {
        heading: '7. Google Analytics 4, Google Tag Manager a vlastní měření návštěvnosti',
        paragraphs: [
          'Google Analytics 4 se načítá pouze s tvým souhlasem pro kategorii „Statistika“. Zpracovává údaje o užívání, navštívených stránkách, zařízení a prohlížeči, přibližné poloze a online identifikátory za účelem měření návštěvnosti a zlepšování naší nabídky (§ 25 odst. 1 TDDDG, čl. 6 odst. 1 písm. a GDPR). Poskytovatel: Google Ireland Limited, Gordon House, Barrow Street, Dublin 4, Irsko. Zpracování společností Google LLC v USA je možné; Google LLC je certifikována v rámci EU-US Data Privacy Framework (rozhodnutí Evropské komise o odpovídající ochraně ze dne 10. 7. 2023). Souhlas můžeš kdykoli odvolat v nastavení cookies. Více informací: https://policies.google.com/privacy',
          'Google Tag Manager stejného poskytovatele načítáme pouze tehdy, pokud udělíš souhlas jak pro „Statistiku“, tak pro „Marketing“. Slouží ke správě tagů webu a zpracovává přitom zejména tvou IP adresu a technické údaje prohlížeče (§ 25 odst. 1 TDDDG, čl. 6 odst. 1 písm. a GDPR).',
          'Se souhlasem pro „Statistiku“ navíc pomocí vlastního měření návštěvnosti ukládaného na našem serveru zaznamenáváme zobrazení stránek, zobrazení produktů a události košíku a pokladny. Ukládáme k tomu náhodný identifikátor návštěvníka (ps_vid), identifikátor relace, vstupní stránku, jazyk, identifikátor prohlížeče (user agent) a z něj odvozený typ zařízení, doménu odkazující stránky, parametry kampaně (UTM) a ID kliknutí z reklamních odkazů (fbclid, ttclid, gclid), ale žádnou IP adresu. Při objednávce propojíme relaci s objednávkou, abychom mohli vyhodnotit účinnost kampaní (§ 25 odst. 1 TDDDG, čl. 6 odst. 1 písm. a GDPR). Identifikátor prohlížeče, odkazující doménu a ID kliknutí mažeme po 90 dnech, samotné události po 395 dnech.',
        ],
      },
      {
        heading: '8. Meta Pixel a TikTok Pixel',
        paragraphs: [
          'Meta Pixel a TikTok Pixel se načítají pouze s tvým souhlasem pro kategorii „Marketing“. Umožňují společnostem Meta a TikTok přiřazovat návštěvy a akce na tomto webu k marketingovým kampaním, vytvářet cílové skupiny a měřit účinnost reklamy; zpracovávají se přitom online identifikátory, IP adresa, údaje o prohlížeči a zařízení a informace o zobrazeních stránek a interakcích (§ 25 odst. 1 TDDDG, čl. 6 odst. 1 písm. a GDPR).',
          'Se stejným souhlasem navíc odesíláme události zobrazení stránky, zobrazení produktu, košík, zahájení pokladny a nákup přímo z našeho serveru do Meta (Conversions API) a TikTok (Events API). Předávají se přitom IP adresa, user-agent, cookies pixelů (_fbp, _fbc, _ttp) nebo ID kliknutí z reklamních odkazů, hodnota a produkt události a při nákupu tvá e-mailová adresa jako hash SHA-256. Zobrazení stránek, zobrazení produktů, košík a zahájení pokladny předáváme bez ukládání. U nákupu uchováváme údaje o IP a cookies do zaplacení (nejvýše 30 dní) a z nich vytvořené hlášení do úspěšného předání, nejvýše 90 dní. Pokud udělíš souhlas jen pro „Marketing“, a ne pro „Statistiku“, vlastní měření návštěvnosti neukládáme.',
          'Poskytovatel TikTok Pixel: TikTok Technology Limited, 10 Earlsfort Terrace, Dublin 2, D02 T380, Irsko; zpracování ve třetích zemích (mimo jiné USA, Singapur) nelze vyloučit a zakládá se na standardních smluvních doložkách EU. Poskytovatel Meta Pixel: Meta Platforms Ireland Limited, Merrion Road, Dublin 4, D04 X2K5, Irsko. Za shromažďování a předávání údajů společnosti Meta odpovídáme společně s Meta jako společní správci (čl. 26 GDPR); za následné zpracování odpovídá výhradně Meta. Zpracování společností Meta Platforms, Inc. v USA je možné; Meta Platforms, Inc. je certifikována v rámci EU-US Data Privacy Framework. Souhlas můžeš kdykoli odvolat v nastavení cookies. Více informací: https://www.facebook.com/privacy/policy/ a https://www.tiktok.com/legal/privacy-policy-eea',
        ],
      },
      {
        heading: '9. Doba uchovávání',
        paragraphs: [
          'Osobní údaje mažeme, jakmile odpadne účel jejich zpracování a nebrání tomu zákonná povinnost uchovávání nebo blokace výmazu. Faktury a související údaje o objednávkách a platbách uchováváme deset let od konce kalendářního roku jejich vystavení. Doklady o souhlasu uchováváme tři roky od odvolání nebo poslední změny, e-mailové protokoly 90 dní. Nerealizované poptávky s nahráním souborů a žádosti o nabídku zpravidla mažeme po dvanácti měsících, soubory modelů v kratších lhůtách, které pro ně platí. Úplné lhůty pro výmaz a postup jsou interně stanoveny v naší koncepci mazání a uchovávání údajů.',
        ],
      },
      {
        heading: '10. Tvá práva',
        paragraphs: [
          'Za podmínek stanovených zákonem máš právo na přístup, opravu, výmaz, omezení zpracování a přenositelnost údajů. Udělený souhlas můžeš kdykoli odvolat s účinkem do budoucna. Obrať se na {email}.',
          'Právo vznést námitku: pokud zpracováváme údaje na základě čl. 6 odst. 1 písm. f GDPR, můžeš kdykoli vznést námitku z důvodů týkajících se tvé konkrétní situace (čl. 21 GDPR).',
          'Uvedení údajů označených v objednávkovém formuláři jako povinné je nutné pro uzavření smlouvy; bez nich nemůžeme objednávku vyřídit. Ostatní údaje jsou dobrovolné. K automatizovanému rozhodování včetně profilování ve smyslu čl. 22 GDPR nedochází.',
          'Máš také právo podat stížnost u dozorového úřadu pro ochranu osobních údajů. Příslušným úřadem je pro nás zpravidla Landesbeauftragte für Datenschutz und Informationsfreiheit Severního Porýní-Vestfálska.',
        ],
      },
      {
        heading: '11. Aktualizace tohoto prohlášení',
        paragraphs: [
          'Toto prohlášení o ochraně osobních údajů upravujeme, když se změní zpracování údajů nebo právní požadavky. Aktuální verzi najdeš vždy na této stránce.',
        ],
      },
    ],
  },
  terms: {
    updatedAt: 'Aktualizováno: 31. 10. 2026',
    sections: [
      {
        heading: '1. Rozsah platnosti',
        paragraphs: [
          'Tyto všeobecné obchodní podmínky (VOP) platí pro všechny smlouvy o prodeji zboží prostřednictvím tohoto internetového obchodu uzavřené mezi prodávajícím (dále jen „my“ nebo „nás“) a spotřebiteli ve smyslu § 13 BGB (německého občanského zákoníku). Prodávající: {name}, {street}, {zip} {city}, Německo.',
        ],
      },
      {
        heading: '2. Smluvní strana, jazyk smlouvy a uložení textu smlouvy',
        paragraphs: [
          'Tvou smluvní stranou je: {name}, {street}, {zip} {city}, Německo, e-mail: {email}. Jazykem smlouvy je němčina; překlady této stránky slouží pouze pro informaci.',
          'Text smlouvy ukládáme. S potvrzením objednávky ti e-mailem pošleme údaje o objednávce, tyto VOP a poučení o odstoupení od smlouvy. Svou objednávku si navíc můžeš zobrazit přes odkaz v potvrzení objednávky. Aktuální VOP si můžeš kdykoli zobrazit a vytisknout na této stránce.',
        ],
      },
      {
        heading: '3. Nabídka, průběh objednávky a uzavření smlouvy',
        paragraphs: [
          'Prezentace produktů v internetovém obchodě není právně závaznou nabídkou, ale nezávaznou výzvou k objednávce.',
          'Průběh objednávky: nakonfiguruješ produkt a vložíš ho do košíku. V pokladně zadáš kontaktní a doručovací údaje a zvolíš způsob platby. Před odesláním uvidíš přehled objednávky se všemi položkami, náklady na dopravu a celkovou cenou. Do té doby můžeš chyby v zadání kdykoli opravit v polích formuláře nebo v košíku, případně proces přerušit zavřením okna prohlížeče. Kliknutím na „Objednat s povinností platby“ činíš závaznou nabídku ke koupi zboží v košíku.',
          'Smlouva vzniká, jakmile tvou nabídku přijmeme potvrzením objednávky e-mailem nebo odesláním zboží.',
          'U individuálně poptaných 3D tisků podle nahraných souborů vypracujeme po kontrole nabídku. Ta platí 14 dní od doručení. Smlouva vzniká tvým přijetím nabídky.',
        ],
      },
      {
        heading: '4. Produkty a výroba',
        paragraphs: [
          'Všechny produkty vyrábíme 3D tiskem až po objednávce. Ráži, velikost a barvy si vybíráš z možností nabízených u daného produktu; volitelně si můžeš za příplatek nechat krabičku personalizovat jménem. Kvůli technologii výroby jsou viditelné jemné vrstvy a lehká struktura povrchu. Obrázky produktů jsou ilustrativní; barvy se mohou podle obrazovky lišit. Tvá zákonná práva z vadného plnění zůstávají nedotčena.',
          'Krabičky slouží k uspořádání a třídění. Nenahrazují schránku ani zbraňovou skříň, kterou pro uchovávání střeliva předepisuje § 36 německého zákona o zbraních (Waffengesetz). Střelivo není součástí nabídky.',
        ],
      },
      {
        heading: '5. Ceny a náklady na dopravu',
        paragraphs: [
          'Všechny uvedené ceny jsou konečné ceny v eurech. Jako malý podnikatel ve smyslu § 19 UStG neuvádíme DPH.',
          'Navíc se účtují náklady na dopravu: v rámci Německa 6,99 € (doprava zdarma od hodnoty objednávky 80,00 €), do všech ostatních zemí dodání 15,00 € (doprava zdarma od 100,00 €). Od hodnoty objednávky 100,00 € navíc dostaneš zdarma krabičku na 50 nábojů podle svého výběru.',
          'U dodávek do Švýcarska mohou při dovozu vzniknout cla, dovozní DPH a poplatky přepravce. Nejsou zahrnuty v ceně a hradíš je ty.',
        ],
      },
      {
        heading: '6. Platba',
        paragraphs: [
          'K dispozici je platba kartou a dalšími způsoby platby zobrazenými v pokladně přes Stripe, platba předem bankovním převodem a Bitcoin. Při platbě předem poskytujeme slevu z hodnoty zboží zobrazenou v pokladně; bankovní údaje a účel platby obdržíš po objednávce a částka je splatná ihned. Při platbě v Bitcoinu je třeba částku zobrazenou při objednávce převést na zobrazenou adresu ve stanovené lhůtě splatnosti. Výroba začíná až po přijetí celé platby.',
        ],
      },
      {
        heading: '7. Doručení',
        paragraphs: [
          'Doručujeme do Německa, Rakouska, Švýcarska, Nizozemska, Belgie, Lucemburska, Francie, Dánska, Polska, Česka, Itálie a Španělska. Dodací lhůta činí v rámci Německa 3 až 8 pracovních dnů a do ostatních zemí dodání 7 až 14 pracovních dnů, vždy od přijetí celé platby. U individuálně poptaných tiskových zakázek uvádíme předpokládanou dodací lhůtu v nabídce. Zboží zasíláme přes DHL nebo Hermes.',
        ],
      },
      {
        heading: '8. Výhrada vlastnictví',
        paragraphs: ['Zboží zůstává až do úplného zaplacení naším vlastnictvím.'],
      },
      {
        heading: '9. Právo na odstoupení od smlouvy',
        paragraphs: [
          'Spotřebitelé mají zákonné právo na odstoupení od smlouvy. Podrobnosti uvádí poučení o odstoupení od smlouvy. Odstoupení můžeš prohlásit i online přes „Odstoupit od smlouvy“ v patičce každé stránky nebo na adrese {withdrawUrl}.',
          'Podle § 312g odst. 2 bodu 1 BGB není právo na odstoupení u krabiček s osobním nápisem jména (personalizace) a u 3D tisků podle tebou nahraných souborů. U zboží, u kterého odstupuješ, neseš přímé náklady na jeho vrácení.',
        ],
      },
      {
        heading: '10. Odpovědnost za vady',
        paragraphs: [
          'Platí zákonná práva z vadného plnění. Vady nám můžeš nahlásit přes reklamační formulář v obchodě nebo e-mailem na {email}.',
        ],
      },
      {
        heading: '11. Řešení sporů',
        paragraphs: [
          'Nejsme ochotni ani povinni účastnit se řízení o řešení sporů před subjektem pro mimosoudní řešení spotřebitelských sporů.',
        ],
      },
      {
        heading: '12. Rozhodné právo',
        paragraphs: [
          'Platí německé právo s vyloučením Úmluvy OSN o smlouvách o mezinárodní koupi zboží. Vůči spotřebitelům platí tato volba práva jen v rozsahu, v jakém jim neodnímá ochranu poskytovanou kogentními ustanoveními práva státu, v němž mají obvyklé bydliště.',
        ],
      },
    ],
  },
  withdrawal: {
    updatedAt: 'Aktualizováno: 31. 10. 2026',
    sections: [
      {
        heading: 'Právo na odstoupení od smlouvy',
        paragraphs: [
          'Máš právo odstoupit od této smlouvy bez udání důvodu ve lhůtě čtrnácti dnů.',
          'Lhůta pro odstoupení od smlouvy činí čtrnáct dnů ode dne, kdy ty nebo tebou určená třetí osoba (jiná než dopravce) převezmete zboží. Pokud bylo v rámci jedné objednávky objednáno více kusů zboží, které jsou dodávány samostatně, začíná lhůta dnem, kdy ty nebo tebou určená třetí osoba (jiná než dopravce) převezmete poslední kus zboží.',
          'Pro uplatnění práva na odstoupení od smlouvy nás ({name}, {street}, {zip} {city}, Německo, e-mail: {email}) musíš informovat o svém odstoupení od této smlouvy formou jednoznačného prohlášení (např. dopisem zaslaným poštou nebo e-mailem). Můžeš použít níže uvedený vzorový formulář pro odstoupení od smlouvy, není to však povinné.',
          'Své právo na odstoupení můžeš uplatnit i online přes tlačítko „Odstoupit od smlouvy“ v patičce každé stránky našeho obchodu nebo na adrese {withdrawUrl}. Pokud tuto online funkci použiješ, zašleme ti bez zbytečného odkladu na trvalém nosiči dat (např. e-mailem) potvrzení o přijetí s obsahem tvého prohlášení o odstoupení a s datem a časem jeho přijetí.',
          'Pro dodržení lhůty pro odstoupení od smlouvy postačuje odeslat oznámení o uplatnění práva na odstoupení před uplynutím příslušné lhůty.',
        ],
      },
      {
        heading: 'Důsledky odstoupení od smlouvy',
        paragraphs: [
          'Pokud od této smlouvy odstoupíš, vrátíme ti bez zbytečného odkladu, nejpozději do čtrnácti dnů ode dne, kdy nám došlo tvé oznámení o odstoupení od této smlouvy, všechny platby, které jsme od tebe obdrželi, včetně nákladů na dodání (kromě dodatečných nákladů vzniklých v důsledku tebou zvoleného způsobu dodání, který je jiný než nejlevnější způsob standardního dodání, který nabízíme). Pro vrácení plateb použijeme stejný platební prostředek, který byl použit pro provedení počáteční transakce, pokud jsme se s tebou výslovně nedohodli jinak; v žádném případě ti tím nevzniknou další náklady. Platbu můžeme zadržet, dokud neobdržíme zboží zpět nebo dokud nám neprokážeš, že zboží bylo odesláno zpět, podle toho, co nastane dříve.',
          'Zboží musíš bez zbytečného odkladu, nejpozději do čtrnácti dnů ode dne, kdy nám oznámíš odstoupení od této smlouvy, zaslat zpět nebo předat na adresu: {name}, {street}, {zip} {city}, Německo. Lhůta je zachována, pokud zboží odešleš před uplynutím lhůty čtrnácti dnů. Přímé náklady spojené s vrácením zboží neseš ty.',
          'Odpovídáš pouze za snížení hodnoty zboží v důsledku nakládání s tímto zbožím jiným způsobem, než který je nutný k obeznámení se s povahou, vlastnostmi a funkčností zboží.',
        ],
      },
      {
        heading: 'Vyloučení práva na odstoupení od smlouvy',
        paragraphs: [
          'Právo na odstoupení od smlouvy se nevztahuje na smlouvy o dodání zboží, které není předem vyrobeno a k jehož výrobě je rozhodující individuální výběr nebo určení spotřebitelem, nebo které je jednoznačně přizpůsobeno osobním potřebám spotřebitele (§ 312g odst. 2 bod 1 BGB).',
          'V našem obchodě se to týká krabiček s osobním nápisem jména (personalizace) a 3D tisků podle tebou nahraných souborů. Obsahuje-li objednávka i jiné zboží, právo na odstoupení se na ně nadále vztahuje.',
        ],
      },
      {
        heading: 'Vzorový formulář pro odstoupení od smlouvy',
        paragraphs: [
          'Pokud chceš od smlouvy odstoupit, vyplň prosím tento formulář a odešli ho zpět.',
        ],
        form: [
          'Adresát: {name}\n{street}\n{zip} {city}\nNěmecko\nE-mail: {email}',
          'Oznamuji/oznamujeme (*), že tímto odstupuji/odstupujeme (*) od smlouvy o nákupu tohoto zboží (*) / o poskytnutí těchto služeb (*):',
          'Datum objednání (*) / datum obdržení (*)\nJméno a příjmení spotřebitele/spotřebitelů\nAdresa spotřebitele/spotřebitelů\nPodpis spotřebitele/spotřebitelů (pouze pokud je tento formulář zasílán v listinné podobě)\nDatum',
          '(*) Nehodící se škrtněte.',
        ],
      },
    ],
  },
}

const documents: Record<string, Partial<Record<LegalDocumentKey, LegalDocumentTranslation>>> = {
  de,
  en,
  fr,
  nl,
  pl,
  cs,
}

const fill = (text: string, company: LegalCompany) =>
  text.replace(
    /\{(name|street|zip|city|email|withdrawUrl)\}/g,
    (_, key: keyof LegalCompany) => company[key],
  )

/** Legal document for a locale with company data filled in; null if none (German imprint/privacy are Vue templates). */
export function getLegalDocument(
  locale: string,
  key: LegalDocumentKey,
  company: LegalCompany,
): LegalDocumentTranslation | null {
  const doc = documents[locale]?.[key]
  if (!doc) return null
  return {
    updatedAt: doc.updatedAt,
    sections: doc.sections.map((s) => ({
      ...s,
      heading: fill(s.heading, company),
      paragraphs: s.paragraphs.map((p) => fill(p, company)),
      form: s.form?.map((p) => fill(p, company)),
    })),
  }
}
