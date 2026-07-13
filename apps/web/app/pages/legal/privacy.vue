<script setup lang="ts">
import { PsSection } from '@print-shop/ui'

const { t } = useI18n()

useSeo({
  title: () => t('seo.legal.privacy'),
  description: () => t('seo.legal.description'),
})
</script>

<template>
  <PsSection :title="t('legal.privacyTitle')" heading-level="h1">
    <div
      class="max-w-[42rem] space-y-xl text-body-regular text-secondary"
      data-testid="legal-privacy"
    >
      <p>Stand: 13.07.2026</p>

      <section>
        <h2 class="text-heading-small text-primary">1. Verantwortlicher</h2>
        <p class="mt-sm">
          Verantwortlicher für die Verarbeitung personenbezogener Daten auf dieser Website ist:<br />
          Robert Schreiner<br />
          Kapitelwiese 14<br />
          44263 Dortmund<br />
          E-Mail:
          <a class="underline" href="mailto:info@prestige-webdesign.de"
            >info@prestige-webdesign.de</a
          >
        </p>
        <p class="mt-sm">Ein Datenschutzbeauftragter ist nicht bestellt.</p>
      </section>

      <section>
        <h2 class="text-heading-small text-primary">2. Hosting und Server-Logfiles</h2>
        <p class="mt-sm">
          Die Website wird auf einem VPS in Deutschland betrieben. Beim Aufruf der Website
          verarbeitet der Server technisch erforderliche Daten, insbesondere IP-Adresse, Datum und
          Uhrzeit des Abrufs, aufgerufene Seite, übertragene Datenmenge, Referrer-URL sowie Angaben
          zu Browser und Betriebssystem. Die Verarbeitung erfolgt zur Bereitstellung, Stabilität und
          Sicherheit der Website auf Grundlage von Art. 6 Abs. 1 lit. f DSGVO. Logdaten werden
          gelöscht, sobald sie für diese Zwecke nicht mehr erforderlich sind.
        </p>
      </section>

      <section>
        <h2 class="text-heading-small text-primary">3. Cookies und Einwilligungsverwaltung</h2>
        <p class="mt-sm">
          Wir verwenden technisch notwendige Speichermechanismen für Warenkorb, Spracheinstellung,
          Darstellung und die Verwaltung deiner Cookie-Auswahl. Diese sind für den Betrieb der
          Website erforderlich. Die Verarbeitung erfolgt auf Grundlage von § 25 Abs. 2 Nr. 2 TDDDG
          sowie Art. 6 Abs. 1 lit. f DSGVO.
        </p>
        <p class="mt-sm">
          Deine Auswahl wird im Browser gespeichert. Zusätzlich dokumentieren wir die Einwilligung
          mit einer zufällig erzeugten Kennung, der gewählten Kategorien, Versionsnummer, Sprache,
          Zeitpunkt und dem übermittelten User-Agent, um sie nachweisen zu können. Du kannst eine
          Einwilligung jederzeit mit Wirkung für die Zukunft über „Einstellungen“ im Footer
          widerrufen oder ändern.
        </p>
      </section>

      <section>
        <h2 class="text-heading-small text-primary">4. Bestellung, Zahlung und Versand</h2>
        <p class="mt-sm">
          Bei einer Bestellung verarbeiten wir Anrede bzw. Namen, Rechnungs- und Lieferadresse,
          E-Mail-Adresse, optional Telefonnummer, Bestell-, Produkt-, Zahlungs- und Versanddaten.
          Dies ist erforderlich, um den Vertrag anzubahnen und zu erfüllen, Zahlungen zuzuordnen,
          Rechnungen auszustellen und die Ware zu versenden (Art. 6 Abs. 1 lit. b DSGVO). Soweit
          handels- oder steuerrechtliche Pflichten bestehen, erfolgt die Verarbeitung auch auf
          Grundlage von Art. 6 Abs. 1 lit. c DSGVO.
        </p>
        <p class="mt-sm">
          Für Kartenzahlungen leiten wir dich zu Stripe weiter. Dabei verarbeitet Stripe Zahlungs-
          und Transaktionsdaten eigenverantwortlich bzw. als Zahlungsdienstleister. Weitere
          Informationen findest du in der
          <a
            class="underline"
            href="https://stripe.com/de/privacy"
            rel="noopener noreferrer"
            target="_blank"
            >Datenschutzerklärung von Stripe</a
          >. Bei Banküberweisung verarbeiten wir die Zahlungsdaten, die uns über den Zahlungseingang
          mitgeteilt werden.
        </p>
        <p class="mt-sm">
          Bei Auswahl von Bitcoin erzeugt unser eigener Node eine Zahlungsadresse und verarbeitet
          die für die Zuordnung erforderlichen Zahlungs- und Transaktionsdaten.
          Blockchain-Transaktionen sind öffentlich einsehbar und können nicht nachträglich gelöscht
          werden. Wir verwenden keine privaten Schlüssel auf dem Webserver.
        </p>
        <p class="mt-sm">
          Für die Zustellung übermitteln wir Name und Lieferadresse sowie die zur Versandabwicklung
          erforderlichen Bestell- und Kontaktdaten an den von dir bzw. für die Bestellung
          ausgewählten Versanddienstleister DHL oder Hermes.
        </p>
      </section>

      <section>
        <h2 class="text-heading-small text-primary">
          5. E-Mail-Kommunikation, Kundenbereich und Support
        </h2>
        <p class="mt-sm">
          Wir versenden transaktionale E-Mails, etwa Bestellbestätigungen, Rechnungen, Angebots- und
          Versandinformationen sowie Antworten auf Supportanfragen, über Resend. Dabei werden
          insbesondere E-Mail-Adresse, Name, Bestell- bzw. Vorgangsdaten und der Inhalt der
          Nachricht verarbeitet. Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO; für die technische
          Dokumentation und Missbrauchsabwehr Art. 6 Abs. 1 lit. f DSGVO.
        </p>
        <p class="mt-sm">
          Für den Kundenbereich senden wir einen persönlichen Zugangslink an die angegebene
          E-Mail-Adresse. Der Link ist zeitlich begrenzt; gespeichert werden dessen Hash sowie
          Zugriffsereignisse einschließlich IP-Adresse. Dies dient der sicheren Bereitstellung
          deiner Bestell-, Angebots- und Rechnungsdaten.
        </p>
        <p class="mt-sm">
          Wenn du uns kontaktierst oder eine Reklamation einreichst, verarbeiten wir die von dir
          übermittelten Kontakt-, Bestell- und Inhaltsdaten einschließlich optionaler Anhänge, um
          dein Anliegen zu bearbeiten.
        </p>
      </section>

      <section>
        <h2 class="text-heading-small text-primary">6. Modell-Uploads und Angebote</h2>
        <p class="mt-sm">
          Bei einer Upload-Anfrage verarbeiten wir Name, E-Mail-Adresse, optionale Telefonnummer,
          Beschreibung, Menge sowie die hochgeladenen STL- oder 3MF-Dateien. Wir speichern außerdem,
          dass und welche Fassung der Upload-Bedingungen akzeptiert wurde. Die Daten werden zur
          Prüfung des Modells, zur Erstellung und Kommunikation eines Angebots und gegebenenfalls
          zur Durchführung eines daraus entstehenden Vertrags verarbeitet (Art. 6 Abs. 1 lit. b
          DSGVO). Die Dateien werden nicht öffentlich bereitgestellt.
        </p>
      </section>

      <section>
        <h2 class="text-heading-small text-primary">7. Google Analytics 4</h2>
        <p class="mt-sm">
          Google Analytics 4 wird nur geladen, wenn du in die Kategorie „Statistik“ eingewilligt
          hast. Dabei können insbesondere Nutzungsdaten, aufgerufene Seiten, technische Geräte- und
          Browserinformationen, ungefähre Standortdaten und Online-Kennungen verarbeitet werden.
          Zweck ist die Reichweitenmessung und Verbesserung unseres Angebots. Rechtsgrundlage sind
          deine Einwilligung nach § 25 Abs. 1 TDDDG und Art. 6 Abs. 1 lit. a DSGVO.
        </p>
        <p class="mt-sm">
          Anbieter ist Google Ireland Limited, Gordon House, Barrow Street, Dublin 4, Irland. Eine
          Verarbeitung kann auch durch Google LLC in den USA erfolgen. Die Einwilligung kann
          jederzeit über die Cookie-Einstellungen widerrufen werden. Weitere Informationen findest
          du in der
          <a
            class="underline"
            href="https://policies.google.com/privacy"
            rel="noopener noreferrer"
            target="_blank"
            >Datenschutzerklärung von Google</a
          >.
        </p>
      </section>

      <section>
        <h2 class="text-heading-small text-primary">8. Meta Pixel</h2>
        <p class="mt-sm">
          Das Meta Pixel wird nur geladen, wenn du in die Kategorie „Marketing“ eingewilligt hast.
          Es ermöglicht Meta, Besuche und Aktionen auf dieser Website Marketingkampagnen zuzuordnen,
          Zielgruppen zu bilden und die Wirksamkeit von Werbung zu messen. Dabei können insbesondere
          Online-Kennungen, IP-Adresse, Browser- und Geräteinformationen sowie Informationen über
          Seitenaufrufe und Interaktionen verarbeitet werden. Rechtsgrundlage sind deine
          Einwilligung nach § 25 Abs. 1 TDDDG und Art. 6 Abs. 1 lit. a DSGVO.
        </p>
        <p class="mt-sm">
          Anbieter ist Meta Platforms Ireland Limited, Merrion Road, Dublin 4, D04 X2K5, Irland.
          Eine Verarbeitung durch Meta Platforms, Inc. in den USA kann nicht ausgeschlossen werden.
          Deine Einwilligung kannst du jederzeit über die Cookie-Einstellungen widerrufen. Weitere
          Informationen enthält die
          <a
            class="underline"
            href="https://www.facebook.com/privacy/policy/"
            rel="noopener noreferrer"
            target="_blank"
            >Datenschutzrichtlinie von Meta</a
          >.
        </p>
      </section>

      <section>
        <h2 class="text-heading-small text-primary">9. Speicherdauer</h2>
        <p class="mt-sm">
          Wir löschen personenbezogene Daten, sobald der jeweilige Zweck entfällt und keine
          gesetzliche Aufbewahrungspflicht oder Löschsperre entgegensteht. Rechnungen, zugehörige
          Bestell- und Zahlungsdaten bewahren wir zehn Jahre ab Ende des Kalenderjahres der
          Ausstellung auf. Nicht beauftragte Upload- und Angebotsanfragen werden grundsätzlich nach
          zwölf Monaten, Modell-Dateien nach den dafür geltenden kürzeren Fristen gelöscht. Die
          vollständigen Löschfristen und das Verfahren sind intern in unserem Lösch- und
          Aufbewahrungskonzept festgelegt.
        </p>
      </section>

      <section>
        <h2 class="text-heading-small text-primary">10. Deine Rechte</h2>
        <p class="mt-sm">
          Du hast nach Maßgabe der gesetzlichen Voraussetzungen das Recht auf Auskunft,
          Berichtigung, Löschung, Einschränkung der Verarbeitung, Datenübertragbarkeit sowie
          Widerspruch gegen Verarbeitungen, die auf Art. 6 Abs. 1 lit. e oder f DSGVO beruhen. Eine
          erteilte Einwilligung kannst du jederzeit mit Wirkung für die Zukunft widerrufen. Wende
          dich dafür an
          <a class="underline" href="mailto:info@prestige-webdesign.de"
            >info@prestige-webdesign.de</a
          >.
        </p>
        <p class="mt-sm">
          Außerdem hast du das Recht, dich bei einer Datenschutzaufsichtsbehörde zu beschweren. Für
          uns ist grundsätzlich die Landesbeauftragte für Datenschutz und Informationsfreiheit
          Nordrhein- Westfalen zuständig.
        </p>
      </section>

      <section>
        <h2 class="text-heading-small text-primary">11. Aktualisierung dieser Erklärung</h2>
        <p class="mt-sm">
          Wir passen diese Datenschutzerklärung an, wenn sich Datenverarbeitungen oder rechtliche
          Anforderungen ändern. Die jeweils aktuelle Fassung findest du auf dieser Seite.
        </p>
      </section>
    </div>
  </PsSection>
</template>
