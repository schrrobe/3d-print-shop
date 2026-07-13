<script setup lang="ts">
import { PsSection } from '@print-shop/ui'
import { getLegalTranslation } from '../../content/legal-translations'

const { t, locale } = useI18n()
const translatedDocument = computed(() => getLegalTranslation(locale.value, 'terms'))

useSeo({
  title: () => t('seo.legal.terms'),
  description: () => t('seo.legal.description'),
})
</script>

<template>
  <LegalLocalizedDocument
    v-if="translatedDocument"
    :title="t('legal.termsTitle')"
    :document="translatedDocument"
  />
  <PsSection v-else :title="t('legal.termsTitle')" heading-level="h1">
    <div
      class="max-w-[42rem] space-y-xl text-body-regular text-secondary"
      data-testid="legal-terms"
    >
      <p>Stand: 13.07.2026</p>

      <section>
        <h2 class="text-heading-small text-primary">1. Geltungsbereich</h2>
        <p class="mt-sm">
          Diese Allgemeinen Geschäftsbedingungen (AGB) gelten für alle Verträge zwischen Robert
          Schreiner, Kapitelwiese 14, 44263 Dortmund, Deutschland (nachfolgend „wir“ oder „uns“) und
          Verbrauchern im Sinne von § 13 BGB über den Verkauf von Waren über diesen Onlineshop.
          Verbraucher ist jede natürliche Person, die ein Rechtsgeschäft zu Zwecken abschließt, die
          überwiegend weder ihrer gewerblichen noch ihrer selbstständigen beruflichen Tätigkeit
          zugerechnet werden können.
        </p>
      </section>

      <section>
        <h2 class="text-heading-small text-primary">2. Vertragspartner und Vertragssprache</h2>
        <p class="mt-sm">
          Vertragspartner ist Robert Schreiner, Kapitelwiese 14, 44263 Dortmund, Deutschland. Du
          erreichst uns unter
          <a class="underline" href="mailto:info@prestige-webdesign.de"
            >info@prestige-webdesign.de</a
          >. Vertragssprache ist Deutsch.
        </p>
      </section>

      <section>
        <h2 class="text-heading-small text-primary">3. Angebot und Vertragsschluss</h2>
        <p class="mt-sm">
          Die Darstellung der Produkte im Onlineshop stellt kein rechtlich bindendes Angebot,
          sondern eine unverbindliche Aufforderung zur Bestellung dar. Mit dem Absenden der
          Bestellung gibst du ein verbindliches Angebot zum Kauf der im Warenkorb enthaltenen Waren
          ab. Der Vertrag kommt zustande, wenn wir dein Angebot durch die Bestellbestätigung per
          E-Mail annehmen oder die Ware versenden.
        </p>
        <p class="mt-sm">
          Für individuell angefragte 3D-Drucke erstellen wir nach Prüfung der hochgeladenen Dateien
          ein Angebot. Dieses ist 14 Tage ab Zugang gültig. Der Vertrag über einen solchen Auftrag
          kommt mit deiner Annahme des Angebots zustande.
        </p>
      </section>

      <section>
        <h2 class="text-heading-small text-primary">4. Produkte und Herstellung</h2>
        <p class="mt-sm">
          Alle Produkte werden erst nach Bestellung im 3D-Druckverfahren hergestellt. Du kannst die
          im jeweiligen Produkt angebotenen Farben auswählen. Geringfügige, für das
          3D-Druckverfahren typische Abweichungen, insbesondere feine Schichtlinien oder minimale
          Oberflächenabweichungen, stellen keinen Mangel dar, sofern Funktion, Stabilität und
          Haltbarkeit der Ware nicht beeinträchtigt sind. Produktabbildungen dienen der
          Veranschaulichung; Farbabweichungen durch Bildschirmdarstellung sind möglich.
        </p>
      </section>

      <section>
        <h2 class="text-heading-small text-primary">5. Preise und Versandkosten</h2>
        <p class="mt-sm">
          Alle angegebenen Preise sind Endpreise in Euro. Als Kleinunternehmer im Sinne von § 19
          UStG weisen wir keine Umsatzsteuer aus. Zusätzlich zu den Produktpreisen fallen
          Versandkosten an: innerhalb Deutschlands 6,99 € und in andere Länder der Europäischen
          Union 15,00 €. Ab einem Bestellwert von 150,00 € liefern wir innerhalb Deutschlands und in
          die Europäische Union versandkostenfrei.
        </p>
      </section>

      <section>
        <h2 class="text-heading-small text-primary">6. Zahlung</h2>
        <p class="mt-sm">
          Zur Verfügung stehen Zahlung per Karte über Stripe, Banküberweisung und Bitcoin. Bei
          Zahlung per Karte erfolgt die Zahlungsabwicklung über Stripe. Bei Banküberweisung erhältst
          du die Bankdaten und den Verwendungszweck mit der Bestellbestätigung; der Betrag ist
          unmittelbar nach Vertragsschluss fällig. Bei Zahlung mit Bitcoin ist der bei Bestellung
          angezeigte Betrag innerhalb der angegebenen Zahlungsfrist an die angezeigte Adresse zu
          übermitteln. Die Produktion beginnt erst nach vollständigem Zahlungseingang.
        </p>
      </section>

      <section>
        <h2 class="text-heading-small text-primary">7. Lieferung</h2>
        <p class="mt-sm">
          Wir liefern an Verbraucher in Deutschland und in andere Länder der Europäischen Union. Die
          Lieferzeit beträgt innerhalb Deutschlands 3 bis 8 Werktage und in andere EU-Länder 7 bis
          14 Werktage, jeweils ab vollständigem Zahlungseingang. Die Lieferzeit kann sich bei
          individuell angefragten Druckaufträgen verlängern; in diesem Fall teilen wir dir die
          voraussichtliche Lieferzeit im Angebot mit. Der Versand erfolgt mit DHL oder Hermes.
        </p>
      </section>

      <section>
        <h2 class="text-heading-small text-primary">8. Eigentumsvorbehalt</h2>
        <p class="mt-sm">Die Ware bleibt bis zur vollständigen Bezahlung unser Eigentum.</p>
      </section>

      <section>
        <h2 class="text-heading-small text-primary">9. Widerrufsrecht</h2>
        <p class="mt-sm">
          Verbrauchern steht grundsätzlich ein gesetzliches Widerrufsrecht zu. Die Einzelheiten
          ergeben sich aus der gesonderten Widerrufsbelehrung. Bei Waren, die nicht vorgefertigt
          sind und für deren Herstellung eine individuelle Auswahl oder Bestimmung durch dich
          maßgeblich ist oder die eindeutig auf deine persönlichen Bedürfnisse zugeschnitten sind,
          besteht kein Widerrufsrecht (§ 312g Abs. 2 Nr. 1 BGB). Das gilt nur, soweit die jeweilige
          Ware diese gesetzlichen Voraussetzungen tatsächlich erfüllt. Für widerrufsfähige Waren
          trägst du die unmittelbaren Kosten der Rücksendung.
        </p>
      </section>

      <section>
        <h2 class="text-heading-small text-primary">10. Mängelhaftung</h2>
        <p class="mt-sm">
          Es gilt die gesetzliche Mängelhaftung. Die Regelung in Ziffer 4 zu produktionsbedingten,
          funktionsneutralen Abweichungen bleibt unberührt.
        </p>
      </section>

      <section>
        <h2 class="text-heading-small text-primary">11. Anwendbares Recht</h2>
        <p class="mt-sm">
          Es gilt deutsches Recht unter Ausschluss des UN-Kaufrechts. Gegenüber Verbrauchern gilt
          diese Rechtswahl nur, soweit dadurch nicht der Schutz entzogen wird, der durch zwingende
          Bestimmungen des Rechts des Staates gewährt wird, in dem der Verbraucher seinen
          gewöhnlichen Aufenthalt hat.
        </p>
      </section>
    </div>
  </PsSection>
</template>
