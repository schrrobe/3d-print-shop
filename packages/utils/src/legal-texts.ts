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

const fill = (text: string, company: LegalCompany) =>
  text.replace(
    /\{(name|street|zip|city|email|withdrawUrl)\}/g,
    (_, key: keyof LegalCompany) => company[key],
  )

/**
 * Legal document with company data filled in. German for `de`, English for
 * every other locale; null for German imprint/privacy (Vue templates).
 */
export function getLegalDocument(
  locale: string,
  key: LegalDocumentKey,
  company: LegalCompany,
): LegalDocumentTranslation | null {
  const doc = (locale === 'de' ? de : en)[key]
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
