<script setup lang="ts">
import { PsSection } from '@print-shop/ui'
import { getLegalTranslation } from '../../content/legal-translations'

const { t, locale } = useI18n()
const translatedDocument = computed(() => getLegalTranslation(locale.value, 'withdrawal'))

useSeo({
  title: () => t('legal.withdrawalTitle'),
  description: () => t('seo.legal.description'),
})
</script>

<template>
  <LegalLocalizedDocument
    v-if="translatedDocument"
    :title="t('legal.withdrawalTitle')"
    :document="translatedDocument"
  />
  <PsSection v-else :title="t('legal.withdrawalTitle')" heading-level="h1">
    <div
      class="max-w-[42rem] space-y-xl text-body-regular text-secondary"
      data-testid="legal-withdrawal"
    >
      <p>Stand: 13.07.2026</p>

      <section>
        <h2 class="text-heading-small text-primary">Widerrufsrecht</h2>
        <p class="mt-sm">
          Du hast das Recht, binnen vierzehn Tagen ohne Angabe von Gründen diesen Vertrag zu
          widerrufen.
        </p>
        <p class="mt-sm">
          Die Widerrufsfrist beträgt vierzehn Tage ab dem Tag, an dem du oder ein von dir benannter
          Dritter, der nicht Beförderer ist, die Waren in Besitz genommen hat. Werden mehrere Waren
          im Rahmen einer einheitlichen Bestellung getrennt geliefert, beginnt die Frist an dem Tag,
          an dem du oder ein von dir benannter Dritter die letzte Ware in Besitz genommen hat.
        </p>
        <p class="mt-sm">
          Um dein Widerrufsrecht auszuüben, musst du uns (Robert Schreiner, Kapitelwiese 14, 44263
          Dortmund, Deutschland, E-Mail:
          <a class="underline" href="mailto:info@prestige-webdesign.de"
            >info@prestige-webdesign.de</a
          >) mittels einer eindeutigen Erklärung (z. B. per Brief oder E-Mail) über deinen
          Entschluss, diesen Vertrag zu widerrufen, informieren. Du kannst dafür das unten stehende
          Muster- Widerrufsformular verwenden, das jedoch nicht vorgeschrieben ist.
        </p>
        <p class="mt-sm">
          Zur Wahrung der Widerrufsfrist reicht es aus, dass du die Mitteilung über die Ausübung des
          Widerrufsrechts vor Ablauf der Widerrufsfrist absendest.
        </p>
      </section>

      <section>
        <h2 class="text-heading-small text-primary">Folgen des Widerrufs</h2>
        <p class="mt-sm">
          Wenn du diesen Vertrag widerrufst, erstatten wir dir alle Zahlungen, die wir von dir
          erhalten haben, einschließlich der Lieferkosten (mit Ausnahme der zusätzlichen Kosten, die
          sich daraus ergeben, dass du eine andere Art der Lieferung als die von uns angebotene,
          günstigste Standardlieferung gewählt hast), unverzüglich und spätestens binnen vierzehn
          Tagen ab dem Tag, an dem die Mitteilung über deinen Widerruf dieses Vertrags bei uns
          eingegangen ist.
        </p>
        <p class="mt-sm">
          Für diese Rückzahlung verwenden wir dasselbe Zahlungsmittel, das du bei der ursprünglichen
          Transaktion eingesetzt hast, es sei denn, mit dir wurde ausdrücklich etwas anderes
          vereinbart. In keinem Fall werden dir wegen dieser Rückzahlung Entgelte berechnet. Wir
          können die Rückzahlung verweigern, bis wir die Waren zurückerhalten haben oder bis du den
          Nachweis erbracht hast, dass du die Waren zurückgesandt hast, je nachdem, welches der
          frühere Zeitpunkt ist.
        </p>
        <p class="mt-sm">
          Du hast die Waren unverzüglich und in jedem Fall spätestens binnen vierzehn Tagen ab dem
          Tag, an dem du uns über den Widerruf dieses Vertrags unterrichtest, an Robert Schreiner,
          Kapitelwiese 14, 44263 Dortmund, Deutschland zurückzusenden oder zu übergeben. Die Frist
          ist gewahrt, wenn du die Waren vor Ablauf der Frist von vierzehn Tagen absendest. Du
          trägst die unmittelbaren Kosten der Rücksendung der Waren.
        </p>
        <p class="mt-sm">
          Du musst für einen etwaigen Wertverlust der Waren nur aufkommen, wenn dieser Wertverlust
          auf einen zur Prüfung der Beschaffenheit, Eigenschaften und Funktionsweise der Waren nicht
          notwendigen Umgang mit ihnen zurückzuführen ist.
        </p>
      </section>

      <section>
        <h2 class="text-heading-small text-primary">Ausschluss des Widerrufsrechts</h2>
        <p class="mt-sm">
          Das Widerrufsrecht besteht nicht bei Verträgen zur Lieferung von Waren, die nicht
          vorgefertigt sind und für deren Herstellung eine individuelle Auswahl oder Bestimmung
          durch dich maßgeblich ist oder die eindeutig auf deine persönlichen Bedürfnisse
          zugeschnitten sind (§ 312g Abs. 2 Nr. 1 BGB). Dieser Ausschluss gilt nur, soweit die
          jeweilige Ware diese gesetzlichen Voraussetzungen tatsächlich erfüllt.
        </p>
      </section>

      <section>
        <h2 class="text-heading-small text-primary">Muster-Widerrufsformular</h2>
        <p class="mt-sm">
          Wenn du den Vertrag widerrufen willst, fülle bitte dieses Formular aus und sende es
          zurück.
        </p>
        <div class="mt-md rounded-card border border-subtle bg-surface-elevated p-lg text-primary">
          <p>
            An Robert Schreiner<br />
            Kapitelwiese 14<br />
            44263 Dortmund<br />
            Deutschland<br />
            E-Mail: info@prestige-webdesign.de
          </p>
          <p class="mt-lg">
            Hiermit widerrufe(n) ich/wir (*) den von mir/uns (*) abgeschlossenen Vertrag über den
            Kauf der folgenden Waren (*) / die Erbringung der folgenden Dienstleistung (*):
          </p>
          <p class="mt-lg">Bestellt am (*) / erhalten am (*):</p>
          <p class="mt-lg">Name des/der Verbraucher(s):</p>
          <p class="mt-lg">Anschrift des/der Verbraucher(s):</p>
          <p class="mt-lg">Datum:</p>
          <p class="mt-lg">Unterschrift des/der Verbraucher(s) (nur bei Mitteilung auf Papier):</p>
          <p class="mt-lg text-caption text-secondary">(*) Unzutreffendes streichen.</p>
        </div>
      </section>
    </div>
  </PsSection>
</template>
