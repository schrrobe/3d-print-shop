<script setup lang="ts">
import { PsSection } from '@print-shop/ui'

const { t } = useI18n()

useSeo({
  title: () => t('seo.legal.imprint'),
  description: () => t('seo.legal.description'),
})
</script>

<template>
  <PsSection :title="t('legal.imprintTitle')" heading-level="h1">
    <div
      class="max-w-[42rem] space-y-xl text-body-regular text-secondary"
      data-testid="legal-imprint"
    >
      <section>
        <h2 class="text-heading-small text-primary">Angaben gemäß § 5 DDG</h2>
        <p class="mt-sm">
          Robert Schreiner<br />
          Kapitelwiese 14<br />
          44263 Dortmund<br />
          Deutschland
        </p>
      </section>

      <section>
        <h2 class="text-heading-small text-primary">Kontakt</h2>
        <p class="mt-sm">
          E-Mail:
          <a class="underline" href="mailto:info@prestige-webdesign.de"
            >info@prestige-webdesign.de</a
          >
        </p>
      </section>

      <section>
        <h2 class="text-heading-small text-primary">Geschäftsbereich</h2>
        <p class="mt-sm">Herstellung und Verkauf individuell gefertigter 3D-Druckprodukte.</p>
      </section>

      <section>
        <h2 class="text-heading-small text-primary">
          Verantwortlich für den Inhalt gemäß § 18 Abs. 2 MStV
        </h2>
        <p class="mt-sm">
          Robert Schreiner<br />
          Kapitelwiese 14<br />
          44263 Dortmund
        </p>
      </section>

      <section>
        <h2 class="text-heading-small text-primary">Verbraucherstreitbeilegung</h2>
        <p class="mt-sm">
          Wir sind nicht bereit und nicht verpflichtet, an Streitbeilegungsverfahren vor einer
          Verbraucherschlichtungsstelle teilzunehmen.
        </p>
      </section>

      <section>
        <h2 class="text-heading-small text-primary">Haftung für Inhalte und Links</h2>
        <p class="mt-sm">
          Die Inhalte dieser Website werden mit Sorgfalt erstellt. Für Richtigkeit, Vollständigkeit
          und Aktualität kann jedoch keine Gewähr übernommen werden. Für Inhalte externer Websites,
          auf die diese Website verlinkt, sind ausschließlich deren Betreiber verantwortlich. Bei
          Hinweisen auf rechtswidrige Inhalte werden betroffene Links unverzüglich entfernt.
        </p>
      </section>

      <section>
        <h2 class="text-heading-small text-primary">Urheberrecht</h2>
        <p class="mt-sm">
          Die auf dieser Website veröffentlichten Inhalte und Werke unterliegen dem deutschen
          Urheberrecht. Jede Nutzung außerhalb der Grenzen des Urheberrechts bedarf der vorherigen
          schriftlichen Zustimmung von Robert Schreiner oder der jeweiligen Rechteinhaber.
        </p>
      </section>
    </div>
  </PsSection>
</template>
