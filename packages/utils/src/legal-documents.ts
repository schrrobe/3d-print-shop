import { formatCents } from './money.js'
import { FREE_SHIPPING_THRESHOLD_CENTS, SHIPPING_FLAT_CENTS } from './shipping.js'

/**
 * Binding German contract texts (AGB, Widerrufsbelehrung). Single source for
 * the shop pages and the order confirmation email (durable medium, § 312f BGB),
 * so both can never drift apart. Imprint/privacy stay in their Vue pages.
 * Wording must be signed off legally — see docs/legal/audit-2026-10-14.md.
 */
export interface LegalCompany {
  name: string
  street: string
  zip: string
  city: string
  email: string
}

export interface LegalSection {
  heading: string
  paragraphs: string[]
  /** Rendered as a boxed, fill-in form (Muster-Widerrufsformular). */
  form?: string[]
}

export interface LegalDocument {
  title: string
  updatedAt: string
  sections: LegalSection[]
}

export const LEGAL_TEXTS_UPDATED_AT = '14.10.2026'

/** Path of the § 356a BGB withdrawal function ("Vertrag widerrufen"). */
export const WITHDRAWAL_FUNCTION_PATH = '/withdraw'

/** Delivery countries offered in checkout. CH is the only non-EU country. */
export const DELIVERY_COUNTRIES = [
  'DE',
  'AT',
  'CH',
  'NL',
  'BE',
  'LU',
  'FR',
  'DK',
  'PL',
  'CZ',
  'IT',
  'ES',
] as const

const COUNTRY_NAMES_DE: Record<(typeof DELIVERY_COUNTRIES)[number], string> = {
  DE: 'Deutschland',
  AT: 'Österreich',
  CH: 'Schweiz',
  NL: 'Niederlande',
  BE: 'Belgien',
  LU: 'Luxemburg',
  FR: 'Frankreich',
  DK: 'Dänemark',
  PL: 'Polen',
  CZ: 'Tschechien',
  IT: 'Italien',
  ES: 'Spanien',
}

export const DELIVERY_TIME_DE = '3 bis 8 Werktage'
export const DELIVERY_TIME_OTHER = '7 bis 14 Werktage'

function address(c: LegalCompany): string {
  return `${c.name}, ${c.street}, ${c.zip} ${c.city}, Deutschland`
}

export function termsDocument(c: LegalCompany, shopUrl: string): LegalDocument {
  const shipping = formatCents(SHIPPING_FLAT_CENTS, 'de')
  const freeFrom = formatCents(FREE_SHIPPING_THRESHOLD_CENTS, 'de')
  const countries = DELIVERY_COUNTRIES.map((code) => COUNTRY_NAMES_DE[code]).join(', ')
  return {
    title: 'Allgemeine Geschäftsbedingungen',
    updatedAt: `Stand: ${LEGAL_TEXTS_UPDATED_AT}`,
    sections: [
      {
        heading: '1. Geltungsbereich',
        paragraphs: [
          `Diese Allgemeinen Geschäftsbedingungen (AGB) gelten für alle Verträge zwischen ${address(c)} (nachfolgend „wir“ oder „uns“) und Verbrauchern im Sinne von § 13 BGB über den Verkauf von Waren über den Onlineshop ${shopUrl}. Verbraucher ist jede natürliche Person, die ein Rechtsgeschäft zu Zwecken abschließt, die überwiegend weder ihrer gewerblichen noch ihrer selbstständigen beruflichen Tätigkeit zugerechnet werden können.`,
        ],
      },
      {
        heading: '2. Vertragspartner, Vertragssprache, Vertragstext',
        paragraphs: [
          `Vertragspartner ist ${address(c)}, E-Mail: ${c.email}. Vertragssprache ist Deutsch.`,
          'Wir speichern den Vertragstext. Die Bestelldaten, diese AGB und die Widerrufsbelehrung erhältst du mit der Bestellbestätigung per E-Mail. Die jeweils aktuellen AGB kannst du jederzeit im Shop abrufen; deine Bestellungen kannst du über den Kundenbereich einsehen.',
        ],
      },
      {
        heading: '3. Bestellvorgang und Vertragsschluss',
        paragraphs: [
          'Die Darstellung der Produkte im Onlineshop ist kein rechtlich bindendes Angebot, sondern eine unverbindliche Aufforderung zur Bestellung.',
          'Du wählst Produkt, Größe und Farben aus und legst sie in den Warenkorb. Im Checkout gibst du Kontaktdaten und Lieferadresse an und wählst eine Zahlungsart. Vor dem Absenden siehst du eine Übersicht der Artikel, der Versandkosten und des Gesamtpreises. Eingabefehler kannst du bis dahin in den Formularfeldern bzw. im Warenkorb korrigieren. Mit dem Klick auf „Jetzt kostenpflichtig bestellen“ gibst du ein verbindliches Angebot zum Kauf ab.',
          'Der Vertrag kommt zustande, wenn wir dein Angebot mit der Bestellbestätigung per E-Mail annehmen. Diese senden wir dir unmittelbar nach Eingang der Bestellung.',
          'Für individuelle Anfertigungen erstellen wir auf Anfrage ein Angebot. Es ist bis zu dem im Angebot genannten Datum gültig. Der Vertrag kommt zustande, wenn du das Angebot über die Schaltfläche „Angebot zahlungspflichtig annehmen“ annimmst.',
        ],
      },
      {
        heading: '4. Produkte, Herstellung und Farbauswahl',
        paragraphs: [
          'Unsere Produkte werden erst nach der Bestellung im 3D-Druckverfahren hergestellt. Du kannst die im jeweiligen Produkt angebotenen Größen und Farben aus unserem Farbsortiment auswählen.',
          'Feine Schichtlinien und geringe Oberflächenunterschiede sind für das 3D-Druckverfahren typisch und gehören zur üblichen Beschaffenheit dieser Waren. Farben können auf Bildschirmen abweichend dargestellt werden. Deine gesetzlichen Mängelrechte bleiben unberührt.',
        ],
      },
      {
        heading: '5. Individuelle Anfertigungen und Kundenvorlagen',
        paragraphs: [
          'Stellst du uns für eine individuelle Anfertigung Dateien, Texte, Logos, Motive oder sonstige Vorlagen zur Verfügung, versicherst du, dass du zu deren Nutzung berechtigt bist und dass dadurch keine Rechte Dritter (insbesondere Urheber-, Marken-, Namens- oder Persönlichkeitsrechte) verletzt werden. Wir prüfen Vorlagen nicht auf Rechte Dritter.',
          'Wir nutzen deine Vorlagen ausschließlich zur Erstellung des Angebots und zur Ausführung des Auftrags. Vorlagen mit rechtswidrigen, insbesondere strafbaren, jugendgefährdenden oder diskriminierenden Inhalten sowie Kennzeichen verfassungswidriger Organisationen fertigen wir nicht. In diesem Fall können wir das Angebot ablehnen bzw. vom Vertrag zurücktreten; bereits geleistete Zahlungen erstatten wir.',
          'Werden wir von Dritten wegen einer Rechtsverletzung in Anspruch genommen, die auf deiner Vorlage beruht und die du zu vertreten hast, stellst du uns von diesen Ansprüchen einschließlich angemessener Kosten der Rechtsverteidigung frei.',
        ],
      },
      {
        heading: '6. Preise und Versandkosten',
        paragraphs: [
          'Alle Preise sind Endpreise in Euro. Als Kleinunternehmer im Sinne von § 19 UStG berechnen wir keine Umsatzsteuer und weisen sie daher nicht aus.',
          `Die Versandkosten betragen in alle Lieferländer pauschal ${shipping} je Bestellung. Ab einem Warenwert von ${freeFrom} (vor Abzug von Gutscheinen) liefern wir versandkostenfrei. Bei individuellen Anfertigungen sind die Versandkosten im Angebot angegeben.`,
          'Bei Lieferungen in die Schweiz können Einfuhrabgaben (z. B. Zoll, Einfuhrumsatzsteuer) und Gebühren des Zustellers anfallen. Diese sind nicht im Preis enthalten und von dir zu tragen.',
        ],
      },
      {
        heading: '7. Zahlung',
        paragraphs: [
          'Du kannst per Stripe (Kartenzahlung und die im Bezahlvorgang von Stripe angezeigten Zahlungsarten), per Vorkasse (Überweisung) und, sofern im Checkout angeboten, per Bitcoin bezahlen. Der Kaufpreis ist mit Vertragsschluss fällig.',
          'Bei Vorkasse erhältst du unsere Bankverbindung nach Abschluss der Bestellung auf der Bestellseite; diese ist über den Link in der Bestellbestätigung jederzeit abrufbar. Die Herstellung beginnt erst nach vollständigem Zahlungseingang.',
        ],
      },
      {
        heading: '8. Lieferung',
        paragraphs: [
          `Wir liefern an Lieferadressen in folgenden Ländern: ${countries}.`,
          `Die Lieferzeit (Herstellung und Versand) beträgt innerhalb Deutschlands ${DELIVERY_TIME_DE} und in die übrigen Lieferländer ${DELIVERY_TIME_OTHER}, jeweils ab vollständigem Zahlungseingang. Der Versand erfolgt mit DHL oder Hermes.`,
        ],
      },
      {
        heading: '9. Eigentumsvorbehalt',
        paragraphs: ['Die Ware bleibt bis zur vollständigen Bezahlung unser Eigentum.'],
      },
      {
        heading: '10. Widerrufsrecht',
        paragraphs: [
          'Verbrauchern steht ein gesetzliches Widerrufsrecht nach Maßgabe der Widerrufsbelehrung zu. Das gilt auch für Patronenboxen aus unserem Sortiment, deren Größe und Farben du aus unseren vorgegebenen Optionen gewählt hast.',
          'Kein Widerrufsrecht besteht nach § 312g Abs. 2 Nr. 1 BGB bei Waren, die nicht vorgefertigt sind und für deren Herstellung eine individuelle Auswahl oder Bestimmung durch dich maßgeblich ist oder die eindeutig auf deine persönlichen Bedürfnisse zugeschnitten sind. Das betrifft bei uns individuelle Anfertigungen nach Angebot auf Grundlage deiner Dateien oder Vorgaben (Ziffer 5). Darauf weisen wir im Angebot und vor der Annahme gesondert hin.',
          `Den Widerruf kannst du auch online über die Schaltfläche „Vertrag widerrufen“ erklären (${shopUrl}${WITHDRAWAL_FUNCTION_PATH}). Die unmittelbaren Kosten der Rücksendung trägst du.`,
          'Eine Rückgabe oder ein Umtausch über das gesetzliche Widerrufsrecht hinaus ist nicht vereinbart. Deine gesetzlichen Mängelrechte (Ziffer 11) bleiben davon in jedem Fall unberührt.',
        ],
      },
      {
        heading: '11. Mängelrechte',
        paragraphs: [
          'Es gelten die gesetzlichen Mängelrechte. Mängel kannst du über das Reklamationsformular im Kundenbereich oder per E-Mail melden.',
          'Bitte melde offensichtliche Transportschäden möglichst schnell beim Zusteller und bei uns. Das erleichtert uns die Abwicklung mit dem Versanddienstleister; deine gesetzlichen Rechte hängen davon nicht ab.',
        ],
      },
      {
        heading: '12. Haftung',
        paragraphs: [
          'Wir haften unbeschränkt bei Vorsatz und grober Fahrlässigkeit, bei Verletzung des Lebens, des Körpers oder der Gesundheit, nach dem Produkthaftungsgesetz, bei arglistig verschwiegenen Mängeln und soweit wir eine Garantie übernommen haben.',
          'Bei leicht fahrlässiger Verletzung wesentlicher Vertragspflichten (Pflichten, deren Erfüllung die ordnungsgemäße Durchführung des Vertrags überhaupt erst ermöglicht und auf deren Einhaltung du regelmäßig vertrauen darfst) ist unsere Haftung auf den bei Vertragsschluss vorhersehbaren, vertragstypischen Schaden begrenzt. Im Übrigen ist die Haftung für leichte Fahrlässigkeit ausgeschlossen.',
          'Die Haftungsbeschränkungen gelten auch zugunsten unserer Erfüllungsgehilfen. Deine gesetzlichen Mängelrechte bleiben unberührt.',
        ],
      },
      {
        heading: '13. Streitbeilegung',
        paragraphs: [
          'Wir sind nicht verpflichtet und nicht bereit, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.',
        ],
      },
      {
        heading: '14. Anwendbares Recht',
        paragraphs: [
          'Es gilt deutsches Recht unter Ausschluss des UN-Kaufrechts. Gegenüber Verbrauchern gilt diese Rechtswahl nur, soweit dadurch nicht der Schutz entzogen wird, der durch zwingende Bestimmungen des Rechts des Staates gewährt wird, in dem der Verbraucher seinen gewöhnlichen Aufenthalt hat.',
        ],
      },
    ],
  }
}

export function withdrawalDocument(c: LegalCompany, shopUrl: string): LegalDocument {
  const withdrawalUrl = `${shopUrl}${WITHDRAWAL_FUNCTION_PATH}`
  return {
    title: 'Widerrufsbelehrung',
    updatedAt: `Stand: ${LEGAL_TEXTS_UPDATED_AT}`,
    sections: [
      {
        heading: 'Widerrufsrecht',
        paragraphs: [
          'Du hast das Recht, binnen vierzehn Tagen ohne Angabe von Gründen diesen Vertrag zu widerrufen.',
          'Die Widerrufsfrist beträgt vierzehn Tage ab dem Tag, an dem du oder ein von dir benannter Dritter, der nicht der Beförderer ist, die Waren in Besitz genommen hast bzw. hat. Werden mehrere Waren im Rahmen einer einheitlichen Bestellung getrennt geliefert, beginnt die Frist an dem Tag, an dem du oder ein von dir benannter Dritter, der nicht der Beförderer ist, die letzte Ware in Besitz genommen hast bzw. hat.',
          `Um dein Widerrufsrecht auszuüben, musst du uns (${address(c)}, E-Mail: ${c.email}) mittels einer eindeutigen Erklärung (z. B. ein mit der Post versandter Brief oder E-Mail) über deinen Entschluss, diesen Vertrag zu widerrufen, informieren. Du kannst dafür das beigefügte Muster-Widerrufsformular verwenden, das jedoch nicht vorgeschrieben ist.`,
          `Du kannst dein Widerrufsrecht auch online über die Schaltfläche „Vertrag widerrufen“ unter ${withdrawalUrl} ausüben. Machst du von dieser Möglichkeit Gebrauch, so übermitteln wir dir unverzüglich (per E-Mail) eine Bestätigung über den Eingang des Widerrufs, aus der sich der Inhalt deiner Widerrufserklärung sowie Datum und Uhrzeit ihres Eingangs ergeben.`,
          'Zur Wahrung der Widerrufsfrist reicht es aus, dass du die Mitteilung über die Ausübung des Widerrufsrechts vor Ablauf der Widerrufsfrist absendest.',
        ],
      },
      {
        heading: 'Folgen des Widerrufs',
        paragraphs: [
          'Wenn du diesen Vertrag widerrufst, haben wir dir alle Zahlungen, die wir von dir erhalten haben, einschließlich der Lieferkosten (mit Ausnahme der zusätzlichen Kosten, die sich daraus ergeben, dass du eine andere Art der Lieferung als die von uns angebotene, günstigste Standardlieferung gewählt hast), unverzüglich und spätestens binnen vierzehn Tagen ab dem Tag zurückzuzahlen, an dem die Mitteilung über deinen Widerruf dieses Vertrags bei uns eingegangen ist. Für diese Rückzahlung verwenden wir dasselbe Zahlungsmittel, das du bei der ursprünglichen Transaktion eingesetzt hast, es sei denn, mit dir wurde ausdrücklich etwas anderes vereinbart; in keinem Fall werden dir wegen dieser Rückzahlung Entgelte berechnet.',
          'Wir können die Rückzahlung verweigern, bis wir die Waren wieder zurückerhalten haben oder bis du den Nachweis erbracht hast, dass du die Waren zurückgesandt hast, je nachdem, welches der frühere Zeitpunkt ist.',
          `Du hast die Waren unverzüglich und in jedem Fall spätestens binnen vierzehn Tagen ab dem Tag, an dem du uns über den Widerruf dieses Vertrags unterrichtest, an ${address(c)} zurückzusenden oder zu übergeben. Die Frist ist gewahrt, wenn du die Waren vor Ablauf der Frist von vierzehn Tagen absendest.`,
          'Du trägst die unmittelbaren Kosten der Rücksendung der Waren.',
          'Du musst für einen etwaigen Wertverlust der Waren nur aufkommen, wenn dieser Wertverlust auf einen zur Prüfung der Beschaffenheit, Eigenschaften und Funktionsweise der Waren nicht notwendigen Umgang mit ihnen zurückzuführen ist.',
        ],
      },
      {
        heading: 'Ende der Widerrufsbelehrung',
        paragraphs: [],
      },
      {
        heading: 'Ausschluss des Widerrufsrechts',
        paragraphs: [
          'Das Widerrufsrecht besteht nicht bei Verträgen zur Lieferung von Waren, die nicht vorgefertigt sind und für deren Herstellung eine individuelle Auswahl oder Bestimmung durch den Verbraucher maßgeblich ist oder die eindeutig auf die persönlichen Bedürfnisse des Verbrauchers zugeschnitten sind (§ 312g Abs. 2 Nr. 1 BGB).',
          'Bei uns betrifft das individuelle Anfertigungen, die wir auf Grundlage eines persönlichen Angebots nach deinen Dateien oder Vorgaben herstellen. Darauf weisen wir im Angebot und vor der Annahme gesondert hin.',
          'Für Patronenboxen aus unserem Sortiment besteht das Widerrufsrecht, auch wenn du Größe und Farben aus unseren vorgegebenen Optionen gewählt hast und die Box erst nach deiner Bestellung gedruckt wird.',
        ],
      },
      {
        heading: 'Gesetzliche Mängelrechte',
        paragraphs: [
          'Unabhängig vom Widerrufsrecht stehen dir bei mangelhafter Ware die gesetzlichen Mängelrechte zu, auch bei individuellen Anfertigungen.',
        ],
      },
      {
        heading: 'Muster-Widerrufsformular',
        paragraphs: [
          'Wenn du den Vertrag widerrufen willst, dann fülle bitte dieses Formular aus und sende es zurück.',
        ],
        form: [
          `An ${c.name}\n${c.street}\n${c.zip} ${c.city}\nDeutschland\nE-Mail: ${c.email}`,
          'Hiermit widerrufe(n) ich/wir (*) den von mir/uns (*) abgeschlossenen Vertrag über den Kauf der folgenden Waren (*) / die Erbringung der folgenden Dienstleistung (*)',
          'Bestellt am (*) / erhalten am (*)',
          'Name des/der Verbraucher(s)',
          'Anschrift des/der Verbraucher(s)',
          'Unterschrift des/der Verbraucher(s) (nur bei Mitteilung auf Papier)',
          'Datum',
          '(*) Unzutreffendes streichen.',
        ],
      },
    ],
  }
}

/** Plain-text rendering, e.g. for email bodies. */
export function legalDocumentText(doc: LegalDocument): string {
  const parts = [doc.title.toUpperCase(), doc.updatedAt]
  for (const s of doc.sections) {
    parts.push(`\n${s.heading}`)
    parts.push(...s.paragraphs)
    if (s.form) parts.push(...s.form.map((line) => `| ${line.replace(/\n/g, '\n| ')}`))
  }
  return parts.join('\n\n')
}
