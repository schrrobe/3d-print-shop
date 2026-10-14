<script setup lang="ts">
import { PsSection } from '@print-shop/ui'

const { t, locale } = useI18n()
const localePath = useLocalePath()
const company = useRuntimeConfig().public.company

useSeo({
  title: () => t('seo.legal.imprint'),
  description: () => t('seo.legal.description'),
})
</script>

<template>
  <PsSection :title="t('legal.imprintTitle')" heading-level="h1">
    <div
      lang="de"
      class="max-w-[42rem] space-y-xl text-body-regular text-secondary [&_a]:underline [&_h2]:text-heading-small [&_h2]:text-primary [&_p]:mt-sm"
      data-testid="legal-imprint"
    >
      <p v-if="locale !== 'de'" lang="en" class="rounded-card border border-subtle p-md">
        {{ t('legal.germanOnly') }}
      </p>

      <section>
        <h2>Angaben gemäß § 5 DDG</h2>
        <p>
          {{ company.name }}<br />
          {{ company.street }}<br />
          {{ company.zip }} {{ company.city }}<br />
          Deutschland
        </p>
      </section>

      <section>
        <h2>Kontakt</h2>
        <p>
          E-Mail: <a :href="`mailto:${company.email}`">{{ company.email }}</a
          ><br />
          Kontaktformular: <NuxtLink :to="localePath('/support')">Support</NuxtLink>
        </p>
      </section>

      <section>
        <h2>Umsatzsteuer</h2>
        <p>
          Kleinunternehmer gemäß § 19 UStG.
          <strong
            >[ZU ERGÄNZEN, falls vorhanden: Umsatzsteuer-Identifikationsnummer nach § 27a UStG bzw.
            Wirtschafts-Identifikationsnummer nach § 139c AO]</strong
          >
        </p>
      </section>

      <section>
        <h2>Verantwortlich für den Inhalt gemäß § 18 Abs. 2 MStV</h2>
        <p>
          {{ company.name }}<br />
          {{ company.street }}<br />
          {{ company.zip }} {{ company.city }}
        </p>
      </section>

      <section>
        <h2>Verbraucherstreitbeilegung</h2>
        <p>
          Wir sind nicht verpflichtet und nicht bereit, an Streitbeilegungsverfahren vor einer
          Verbraucherschlichtungsstelle teilzunehmen.
        </p>
      </section>

      <section>
        <h2>Haftung für Inhalte</h2>
        <p>
          Wir erstellen die Inhalte dieser Website mit Sorgfalt und halten sie aktuell. Für eigene
          Inhalte sind wir nach den allgemeinen Gesetzen verantwortlich (§ 7 Abs. 1 DDG). Für fremde
          Informationen, die wir lediglich übermitteln oder speichern (z. B. Kundenbewertungen),
          sind wir nach §§ 8 bis 10 DDG erst ab Kenntnis einer konkreten Rechtsverletzung
          verantwortlich; entsprechende Inhalte entfernen wir dann umgehend. Produktinformationen
          sind Teil unseres Angebots; insoweit gelten unsere AGB und die gesetzlichen Vorschriften.
        </p>
      </section>

      <section>
        <h2>Haftung für Links</h2>
        <p>
          Diese Website enthält Links zu Websites Dritter, auf deren Inhalte wir keinen Einfluss
          haben. Für diese Inhalte ist der jeweilige Anbieter verantwortlich. Bei der Verlinkung
          waren keine Rechtsverstöße erkennbar. Werden uns Rechtsverletzungen bekannt, entfernen wir
          den betreffenden Link umgehend.
        </p>
      </section>

      <section>
        <h2>Urheberrecht</h2>
        <p>
          Texte, Fotos, Grafiken und 3D-Modelle auf dieser Website unterliegen dem deutschen
          Urheberrecht. Vervielfältigung, Bearbeitung und Verbreitung außerhalb der gesetzlichen
          Schranken bedürfen der vorherigen Zustimmung von {{ company.name }} bzw. der jeweiligen
          Rechteinhaber.
        </p>
      </section>
    </div>
  </PsSection>
</template>
