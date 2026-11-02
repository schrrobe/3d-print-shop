<script setup lang="ts">
import { LOCALES, type Locale } from '@print-shop/types'
import { PsButton, PsCard, PsTextarea } from '@print-shop/ui'

interface InfoBannerDto {
  enabled: boolean
  text: Partial<Record<Locale, string>>
}

// Prefilled while nothing is stored, so switching it on is one click.
const SUGGESTION: Record<Locale, string> = {
  de: 'Gerade erreichen uns sehr viele Bestellungen. Neue Bestellungen verschicken wir deshalb erst ab dem 14. November.',
  en: "We're receiving a lot of orders right now, so new orders won't ship until 14 November.",
  pl: 'Otrzymujemy teraz bardzo dużo zamówień, dlatego nowe zamówienia wyślemy dopiero od 14 listopada.',
  fr: "Nous recevons actuellement beaucoup de commandes. Les nouvelles commandes ne seront donc expédiées qu'à partir du 14 novembre.",
  nl: 'We ontvangen op dit moment erg veel bestellingen. Nieuwe bestellingen versturen we daarom pas vanaf 14 november.',
  cs: 'Právě dostáváme velké množství objednávek. Nové objednávky proto odešleme až od 14. listopadu.',
  it: 'In questo periodo riceviamo moltissimi ordini. I nuovi ordini verranno quindi spediti solo dal 14 novembre.',
}

const auth = useAdminAuthStore()
const canWrite = computed(() => auth.can('settings:write'))

const { data, refresh } = await useFetch<InfoBannerDto>('/api/admin/settings/info-banner', {
  credentials: 'include',
  server: false,
})
const { run, pending: saving } = useAdminAction({ refresh })

const enabled = ref(false)
const text = reactive(Object.fromEntries(LOCALES.map((l) => [l, ''])) as Record<Locale, string>)
const activeLocale = ref<Locale>('de')

watch(
  () => data.value,
  (s) => {
    if (!s) return
    enabled.value = s.enabled
    for (const l of LOCALES) text[l] = s.text[l] ?? ''
    if (!Object.values(s.text).some(Boolean)) Object.assign(text, SUGGESTION)
  },
  { immediate: true },
)

const deMissing = computed(() => enabled.value && !text.de.trim())

function save() {
  // Before the GET lands the form is blank — saving would wipe the stored text.
  if (!data.value || deMissing.value) return
  return run(
    () =>
      $fetch('/api/admin/settings/info-banner', {
        method: 'PUT',
        credentials: 'include',
        body: { enabled: enabled.value, text },
      }),
    { success: 'Info-Banner gespeichert', error: 'Speichern fehlgeschlagen — Eingaben prüfen' },
  )
}
</script>

<template>
  <PsCard data-testid="info-banner-settings">
    <h2 class="text-subheading">Info-Banner</h2>
    <p class="mb-lg mt-xs text-body-regular text-secondary">
      Schmale Leiste ganz oben auf jeder Shop-Seite, z. B. für Hinweise zum Versand. Änderungen sind
      nach spätestens einer Minute im Shop sichtbar.
    </p>

    <form class="space-y-lg" @submit.prevent="save">
      <label class="flex items-center gap-sm text-body-regular">
        <input
          v-model="enabled"
          type="checkbox"
          role="switch"
          :disabled="!canWrite"
          data-testid="info-enabled"
        />
        Banner im Shop anzeigen
      </label>

      <div class="space-y-md">
        <div class="flex flex-wrap gap-xs" role="tablist" aria-label="Sprache">
          <PsButton
            v-for="l in LOCALES"
            :key="l"
            type="button"
            size="sm"
            role="tab"
            :aria-selected="activeLocale === l"
            :variant="activeLocale === l ? 'primary' : 'ghost'"
            :data-testid="`info-locale-${l}`"
            @click="activeLocale = l"
          >
            {{ l.toUpperCase() }}{{ l === 'de' ? ' *' : '' }}
          </PsButton>
        </div>
        <p v-if="activeLocale !== 'de'" class="text-caption text-secondary">
          Leer lassen zeigt den deutschen Text.
        </p>
        <PsTextarea
          v-model="text[activeLocale]"
          label="Text"
          :placeholder="activeLocale === 'de' ? '' : text.de"
          :rows="2"
          :disabled="!canWrite"
          name="info-text"
          data-testid="info-text"
        />
        <p v-if="deMissing" class="text-caption text-danger" data-testid="info-de-missing">
          Deutscher Text fehlt.
        </p>
      </div>

      <PsButton
        v-if="canWrite"
        type="submit"
        :loading="saving"
        :disabled="!data || deMissing"
        data-testid="info-save"
      >
        Speichern
      </PsButton>
    </form>
  </PsCard>
</template>
