<script setup lang="ts">
import { PsSection } from '@print-shop/ui'
import { LEGAL_TEXTS_UPDATED_AT, WITHDRAWAL_FUNCTION_PATH } from '@print-shop/utils'

const { t, locale } = useI18n()
const localePath = useLocalePath()
const company = useRuntimeConfig().public.company

useSeo({
  title: () => t('seo.legal.privacy'),
  description: () => t('seo.legal.description'),
})
</script>

<template>
  <PsSection :title="t('legal.privacyTitle')" heading-level="h1">
    <div
      lang="de"
      class="max-w-[42rem] space-y-xl text-body-regular text-secondary [&_a]:underline [&_h2]:text-heading-small [&_h2]:text-primary [&_h3]:mt-md [&_h3]:font-semibold [&_h3]:text-primary [&_li]:mt-xs [&_p]:mt-sm [&_ul]:mt-sm [&_ul]:list-disc [&_ul]:pl-lg"
      data-testid="legal-privacy"
    >
      <p v-if="locale !== 'de'" lang="en" class="rounded-card border border-subtle p-md">
        {{ t('legal.germanOnly') }}
      </p>
      <p>Stand: {{ LEGAL_TEXTS_UPDATED_AT }}</p>

      <section>
        <h2>1. Verantwortlicher</h2>
        <p>
          {{ company.name }}<br />
          {{ company.street }}<br />
          {{ company.zip }} {{ company.city }}, Deutschland<br />
          E-Mail: <a :href="`mailto:${company.email}`">{{ company.email }}</a>
        </p>
        <p>Ein Datenschutzbeauftragter ist nicht bestellt (keine Pflicht nach § 38 BDSG).</p>
      </section>

      <section>
        <h2>2. Hosting und Server-Logfiles</h2>
        <p>
          Shop und Datenbank laufen auf einem virtuellen Server der Hostinger International Ltd., 61
          Lordou Vironos Street, 6023 Larnaka, Zypern, die als Auftragsverarbeiter (Art. 28 DSGVO)
          für uns tätig ist. Serverstandort:
          <strong>[ZU ERGÄNZEN: Rechenzentrumsstandort laut Hostinger-Vertrag]</strong>.
        </p>
        <p>
          Beim Aufruf der Website verarbeitet der Webserver technisch erforderliche Daten:
          IP-Adresse, Datum und Uhrzeit, aufgerufene Adresse, Statuscode, übertragene Datenmenge,
          Referrer sowie Browser- und Betriebssystemangaben. Zweck sind Bereitstellung, Stabilität
          und Sicherheit der Website (Art. 6 Abs. 1 lit. f DSGVO). Die Logdateien werden nach
          <strong>[ZU ERGÄNZEN: Anzahl]</strong> Tagen gelöscht.
        </p>
      </section>

      <section>
        <h2>3. Speicherung im Browser und Einwilligungsverwaltung</h2>
        <p>
          Ohne Einwilligung speichern wir in deinem Browser (Local Storage) nur, was für den Shop
          unbedingt erforderlich ist (§ 25 Abs. 2 Nr. 2 TDDDG; Art. 6 Abs. 1 lit. b und f DSGVO):
        </p>
        <ul>
          <li>Warenkorb, eingelöster Gutschein und Merkliste,</li>
          <li>Darstellung (heller/dunkler Modus),</li>
          <li>deine Cookie-Auswahl und eine zufällige Kennung zum Nachweis dieser Auswahl.</li>
        </ul>
        <p>
          Zum Nachweis deiner Einwilligung (Art. 7 Abs. 1 DSGVO) speichern wir auf unserem Server
          die zufällige Kennung, die gewählten Kategorien, die Version des Einwilligungstextes,
          Sprache, Zeitpunkt und den User-Agent deines Browsers, aber keine IP-Adresse (Art. 6 Abs.
          1 lit. c DSGVO).
        </p>
        <p>
          Für Statistik und Marketing nutzen wir Speichertechnologien nur mit deiner Einwilligung (§
          25 Abs. 1 TDDDG, Art. 6 Abs. 1 lit. a DSGVO), siehe Abschnitte 10 und 11. Du kannst deine
          Einwilligung jederzeit mit Wirkung für die Zukunft über „Einstellungen“ im Footer ändern
          oder widerrufen. Beim Widerruf löschen wir die betroffenen Einträge und Cookies in deinem
          Browser und laden die Seite neu, damit keine Dienste weiterlaufen.
        </p>
        <p>
          Für den Admin-Bereich setzen wir ein technisch notwendiges Sitzungs-Cookie. Kundinnen und
          Kunden erhalten von uns keine Cookies.
        </p>
      </section>

      <section>
        <h2>4. Bestellung, Zahlung und Versand</h2>
        <p>
          Bei einer Bestellung verarbeiten wir Vor- und Nachname, optional Firma, die Adresse (sie
          gilt als Liefer- und Rechnungsadresse), E-Mail-Adresse, optional Telefonnummer, deine
          Anmerkung, die bestellten Artikel mit Größe und Farben, Preise sowie Zahlungs- und
          Versanddaten. Das ist für Vertragsschluss und Vertragsdurchführung erforderlich (Art. 6
          Abs. 1 lit. b DSGVO). Ohne diese Angaben können wir keinen Vertrag mit dir schließen.
          Rechnungs- und Buchungsdaten bewahren wir wegen handels- und steuerrechtlicher Pflichten
          auf (Art. 6 Abs. 1 lit. c DSGVO).
        </p>
        <h3>Stripe</h3>
        <p>
          Bei Zahlung über Stripe leiten wir dich auf eine Bezahlseite der Stripe Payments Europe,
          Ltd., 1 Grand Canal Street Lower, Grand Canal Dock, Dublin, D02 H210, Irland, weiter. Wir
          übermitteln E-Mail-Adresse, Betrag und Bestellnummer. Zahlungsdaten (z. B. Kartendaten)
          gibst du direkt bei Stripe ein; sie erreichen uns nicht. Stripe verarbeitet Daten auch als
          eigener Verantwortlicher (u. a. Betrugsprävention, gesetzliche Pflichten) und kann sie an
          die Stripe, Inc. in den USA übermitteln; diese ist nach dem EU-US Data Privacy Framework
          zertifiziert (Angemessenheitsbeschluss, Art. 45 DSGVO).
          <a href="https://stripe.com/de/privacy" rel="noopener noreferrer" target="_blank"
            >Datenschutzerklärung von Stripe</a
          >.
        </p>
        <h3>Vorkasse und Bitcoin</h3>
        <p>
          Bei Überweisung verarbeiten wir die Angaben aus dem Zahlungseingang (Name des
          Kontoinhabers, Betrag, Verwendungszweck). Bei Zahlung per Bitcoin, sofern angeboten,
          erzeugen wir eine Zahlungsadresse und prüfen den Zahlungseingang. Bitcoin-Transaktionen
          sind in der Blockchain öffentlich einsehbar und können nicht gelöscht werden.
          <strong
            >[ZU ERGÄNZEN vor Aktivierung von Bitcoin: Dienst zur Abfrage der Blockchain und des
            Wechselkurses]</strong
          >
        </p>
        <h3>Versand</h3>
        <p>
          Für die Zustellung übermitteln wir Name, Lieferadresse und Paketdaten an den jeweils
          beauftragten Versanddienstleister DHL (Deutsche Post AG, Charles-de-Gaulle-Straße 20,
          53113 Bonn) oder Hermes (Hermes Germany GmbH, Essener Straße 89, 22419 Hamburg) (Art. 6
          Abs. 1 lit. b DSGVO).
        </p>
      </section>

      <section>
        <h2>5. E-Mails und Kundenbereich</h2>
        <p>
          Transaktionale E-Mails (Bestellbestätigung, Zahlungs- und Versandinformationen,
          Rechnungen, Angebote, Antworten auf Anfragen, Eingangsbestätigungen) versenden wir über
          den Dienst Resend der Resend, Inc., USA, als Auftragsverarbeiter. Verarbeitet werden
          E-Mail-Adresse, Name, Vorgangsdaten und der Inhalt der Nachricht. Antworten auf
          Support-E-Mails empfangen wir ebenfalls über Resend und ordnen sie deinem Ticket zu.
          Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO. Die Übermittlung in die USA erfolgt auf
          Grundlage
          <strong
            >[ZU ERGÄNZEN: DPF-Zertifizierung von Resend bzw. EU-Standardvertragsklauseln laut
            Auftragsverarbeitungsvertrag]</strong
          >. Newsletter oder Werbe-E-Mails versenden wir nicht.
        </p>
        <p>
          Für den Kundenbereich senden wir dir auf Anforderung einen persönlichen Zugangslink. Wir
          speichern davon nur einen Hashwert und die anfragende IP-Adresse sowie Zugriffe auf den
          Kundenbereich mit IP-Adresse, um Missbrauch zu erkennen (Art. 6 Abs. 1 lit. f DSGVO).
        </p>
      </section>

      <section>
        <h2>6. Support, Reklamationen und Widerruf</h2>
        <p>
          Wenn du das Supportformular nutzt, verarbeiten wir Name, E-Mail-Adresse, Betreff,
          Nachricht und optional deine Bestellnummer. Bei Reklamationen kommen Angaben zum Mangel
          und von dir hochgeladene Fotos hinzu. Zweck ist die Bearbeitung deines Anliegens bzw. die
          Erfüllung deiner Mängelrechte (Art. 6 Abs. 1 lit. b DSGVO).
        </p>
        <p>
          Erklärst du über
          <NuxtLink :to="localePath(WITHDRAWAL_FUNCTION_PATH)">„Vertrag widerrufen“</NuxtLink>
          einen Widerruf, verarbeiten wir Name, Bestellnummer, E-Mail-Adresse, die betroffenen
          Artikel und den Eingangszeitpunkt, um den Widerruf abzuwickeln und dir den Eingang zu
          bestätigen (Art. 6 Abs. 1 lit. b und c DSGVO i. V. m. § 356a BGB).
        </p>
      </section>

      <section>
        <h2>7. Individuelle Anfertigungen und Angebote</h2>
        <p>
          Für individuelle Anfragen verarbeiten wir Name, E-Mail-Adresse, optional Telefonnummer,
          Beschreibung, Menge und von dir übermittelte 3D-Dateien sowie die Fassung der von dir
          akzeptierten Upload-Bedingungen. Die Daten nutzen wir zur Prüfung, zur Angebotserstellung
          und zur Durchführung des Auftrags (Art. 6 Abs. 1 lit. b DSGVO). Die Dateien werden nicht
          öffentlich bereitgestellt.
        </p>
      </section>

      <section>
        <h2>8. Bewertungen</h2>
        <p>
          Nach dem Versand können wir dich per E-Mail um eine Bewertung bitten. Gibst du eine
          Bewertung ab, verarbeiten wir Sternebewertung, Titel, Text, den von dir gewählten
          Anzeigenamen und optional ein Foto. Nach Prüfung veröffentlichen wir Bewertung,
          Anzeigename und Foto auf der Produktseite; deinen Namen und deine E-Mail-Adresse
          veröffentlichen wir nicht. Rechtsgrundlage ist deine Einwilligung durch Abgabe der
          Bewertung (Art. 6 Abs. 1 lit. a DSGVO). Du kannst die Löschung jederzeit per E-Mail
          verlangen. Bitte lade keine Fotos hoch, auf denen andere Personen erkennbar sind.
        </p>
      </section>

      <section>
        <h2>9. Empfänger und Drittländer</h2>
        <p>
          Empfänger sind die in dieser Erklärung genannten Dienstleister. Übermittlungen in Länder
          außerhalb des EWR finden nur bei den jeweils genannten Diensten (Stripe, Resend, Google,
          Meta, TikTok) auf den dort genannten Grundlagen statt.
        </p>
      </section>

      <section>
        <h2>10. Statistik (nur mit Einwilligung)</h2>
        <p>
          Folgende Dienste laufen nur, wenn du der Kategorie „Statistik“ zugestimmt hast (§ 25 Abs.
          1 TDDDG, Art. 6 Abs. 1 lit. a DSGVO):
        </p>
        <h3>Eigene Reichweitenmessung</h3>
        <p>
          Wir messen auf unserem eigenen Server, wie der Shop genutzt wird: aufgerufene Seiten,
          angesehene Produkte, Warenkorbaktionen, Start des Checkouts, Kampagnenparameter (utm_*),
          die Domain der verweisenden Seite, Browser-Kennung (User-Agent) und Gerätetyp. Dazu
          speichern wir eine zufällige Besucherkennung (Local Storage, 365 Tage) und eine
          Sitzungskennung (Session Storage). Bestellst du, verknüpfen wir die Sitzung mit der
          Bestellung, um zu erkennen, über welchen Kanal Bestellungen zustande kommen. Ereignisse
          löschen wir nach 13 Monaten; User-Agent, Referrer und Klickkennungen anonymisieren wir
          nach 90 Tagen. Eine Weitergabe an Dritte findet nicht statt.
        </p>
        <h3>Google Analytics 4</h3>
        <p>
          Anbieter ist die Google Ireland Limited, Gordon House, Barrow Street, Dublin 4, Irland.
          Google Analytics setzt Cookies (_ga, _ga_&lt;ID&gt;, bis zu 2 Jahre) und verarbeitet
          Seitenaufrufe, IP-Adresse (in der EU gekürzt), Geräte- und Browserinformationen und einen
          ungefähren Standort. Google Signals und die Nutzung für personalisierte Werbung sind
          deaktiviert. Daten können an die Google LLC in den USA übermittelt werden; diese ist nach
          dem EU-US Data Privacy Framework zertifiziert (Art. 45 DSGVO).
          <a href="https://policies.google.com/privacy" rel="noopener noreferrer" target="_blank"
            >Datenschutzerklärung von Google</a
          >.
        </p>
      </section>

      <section>
        <h2>11. Marketing (nur mit Einwilligung)</h2>
        <p>
          Folgende Dienste laufen nur, wenn du der Kategorie „Marketing“ zugestimmt hast (§ 25 Abs.
          1 TDDDG, Art. 6 Abs. 1 lit. a DSGVO). Sie dienen dazu, den Erfolg unserer Werbung bei Meta
          (Facebook, Instagram) und TikTok zu messen und zu verbessern.
        </p>
        <h3>Werbe-Klickkennungen</h3>
        <p>
          Kommst du über eine Anzeige zu uns, enthält die Adresse eine Klickkennung des
          Werbenetzwerks (fbclid, ttclid, gclid). Diese speichern wir mit deiner Sitzung nur bei
          Einwilligung in „Marketing“, um eine Bestellung der Anzeige zuordnen zu können.
        </p>
        <h3>Meta Pixel und Meta Conversions API</h3>
        <p>
          Anbieter ist die Meta Platforms Ireland Limited, Merrion Road, Dublin 4, D04 X2K5, Irland.
          Das Meta Pixel setzt Cookies (z. B. _fbp, _fbc, bis zu 90 Tage) und übermittelt
          Seitenaufrufe, IP-Adresse sowie Browser- und Geräteinformationen an Meta. Wir nutzen weder
          den „erweiterten Abgleich“ noch die automatische Erkennung von Interaktionen; Namen,
          E-Mail-Adressen oder Anschriften übermitteln wir nicht.
        </p>
        <p>
          Hast du beim Absenden der Bestellung in „Marketing“ eingewilligt und bist du über eine
          Meta-Anzeige gekommen, melden wir den Kauf zusätzlich direkt von unserem Server an Meta
          (Conversions API): Ereignis „Purchase“, Bestellwert und Währung, eine technische
          Ereigniskennung, die Meta-Klickkennung, die Shop-Adresse und deinen User-Agent, aber keine
          IP-Adresse und keine Kontaktdaten.
        </p>
        <p>
          Für die Erhebung und Übermittlung dieser Daten sind wir mit Meta gemeinsam verantwortlich
          (Art. 26 DSGVO); die Vereinbarung findest du im
          <a
            href="https://www.facebook.com/legal/controller_addendum"
            rel="noopener noreferrer"
            target="_blank"
            >Controller Addendum von Meta</a
          >. Für die weitere Verarbeitung ist Meta allein verantwortlich. Daten können an die Meta
          Platforms, Inc. in den USA übermittelt werden; diese ist nach dem EU-US Data Privacy
          Framework zertifiziert.
          <a
            href="https://www.facebook.com/privacy/policy/"
            rel="noopener noreferrer"
            target="_blank"
            >Datenschutzrichtlinie von Meta</a
          >.
        </p>
        <h3>TikTok Events API</h3>
        <p>
          Hast du beim Absenden der Bestellung in „Marketing“ eingewilligt und bist du über eine
          TikTok-Anzeige gekommen, melden wir den Kauf von unserem Server an die TikTok Technology
          Limited, 10 Earlsfort Terrace, Dublin, D02 T380, Irland: Ereignis „CompletePayment“,
          Bestellwert und Währung, die TikTok-Klickkennung, die Shop-Adresse und deinen User-Agent,
          aber keine IP-Adresse und keine Kontaktdaten. Ein TikTok-Pixel im Browser setzen wir nicht
          ein. TikTok kann Daten in Drittländer übermitteln
          <strong>[ZU ERGÄNZEN: Garantien laut TikTok-Geschäftsbedingungen]</strong>.
          <a
            href="https://www.tiktok.com/legal/page/eea/privacy-policy/de"
            rel="noopener noreferrer"
            target="_blank"
            >Datenschutzrichtlinie von TikTok</a
          >.
        </p>
        <h3>Google Tag Manager</h3>
        <p>
          Sofern wir den Google Tag Manager einsetzen, wird er nur geladen, wenn du sowohl
          „Statistik“ als auch „Marketing“ zugestimmt hast. Er lädt die in ihm konfigurierten
          Dienste <strong>[ZU ERGÄNZEN: im Container konfigurierte Tags, falls genutzt]</strong>.
          Anbieter ist die Google Ireland Limited (siehe oben).
        </p>
      </section>

      <section>
        <h2>12. Speicherdauer</h2>
        <p>
          Wir löschen personenbezogene Daten, sobald der Zweck entfällt und keine gesetzliche
          Aufbewahrungspflicht besteht. Rechnungen, Buchungsbelege und zugehörige Bestelldaten
          bewahren wir für die Dauer der handels- und steuerrechtlichen Aufbewahrungsfristen auf
          (bis zu zehn Jahre, § 147 AO, § 14b UStG). Sonstige Bestell-, Support-, Reklamations- und
          Widerrufsdaten speichern wir bis zum Ablauf der regelmäßigen Verjährungsfrist von drei
          Jahren ab Ende des Jahres des Vorgangs. Nicht beauftragte Angebotsanfragen löschen wir
          nach zwölf Monaten, Einwilligungsnachweise drei Jahre nach Widerruf oder Änderung. Für
          Statistikdaten gelten die Fristen aus Abschnitt 10.
        </p>
      </section>

      <section>
        <h2>13. Deine Rechte</h2>
        <p>
          Du hast das Recht auf Auskunft (Art. 15 DSGVO), Berichtigung (Art. 16), Löschung (Art.
          17), Einschränkung der Verarbeitung (Art. 18), Datenübertragbarkeit (Art. 20) und auf
          Widerruf erteilter Einwilligungen mit Wirkung für die Zukunft (Art. 7 Abs. 3 DSGVO).
        </p>
        <p>
          <strong>Widerspruchsrecht:</strong> Verarbeiten wir Daten auf Grundlage von Art. 6 Abs. 1
          lit. f DSGVO, kannst du aus Gründen, die sich aus deiner besonderen Situation ergeben,
          jederzeit widersprechen (Art. 21 DSGVO).
        </p>
        <p>
          Wende dich dazu an <a :href="`mailto:${company.email}`">{{ company.email }}</a
          >. Du hast außerdem das Recht, dich bei einer Datenschutz-Aufsichtsbehörde zu beschweren,
          zum Beispiel bei der für uns zuständigen Landesbeauftragten für Datenschutz und
          Informationsfreiheit Nordrhein-Westfalen, Kavalleriestraße 2–4, 40213 Düsseldorf.
        </p>
        <p>Eine automatisierte Entscheidungsfindung einschließlich Profiling findet nicht statt.</p>
      </section>

      <section>
        <h2>14. Änderungen</h2>
        <p>
          Wir passen diese Erklärung an, wenn sich Funktionen des Shops oder die Rechtslage ändern.
          Es gilt die jeweils hier veröffentlichte Fassung.
        </p>
      </section>
    </div>
  </PsSection>
</template>
