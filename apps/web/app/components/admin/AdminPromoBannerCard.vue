<script setup lang="ts">
import { LOCALES, type Locale, type VoucherRejection } from '@print-shop/types'
import { PsButton, PsCard, PsInput, PsTextarea } from '@print-shop/ui'
import type { PromoBannerContent } from '@print-shop/validators'

interface PromoBannerDto {
  settings: {
    enabled: boolean
    code: string | null
    content: Partial<Record<Locale, PromoBannerContent>>
  }
  voucherProblem: VoucherRejection | null
}

const VOUCHER_PROBLEMS: Record<VoucherRejection, string> = {
  not_found: 'Diesen Gutschein gibt es nicht',
  inactive: 'Der Gutschein ist deaktiviert',
  not_yet_valid: 'Der Gutschein gilt noch nicht',
  expired: 'Der Gutschein ist abgelaufen',
  exhausted: 'Der Gutschein ist aufgebraucht (max. Einlösungen erreicht)',
  min_order_not_met: 'Mindestbestellwert nicht erreicht',
}

const auth = useAdminAuthStore()
const canWrite = computed(() => auth.can('settings:write'))

const { data, refresh } = await useFetch<PromoBannerDto>('/api/admin/settings/promo-banner', {
  credentials: 'include',
  server: false,
})
const { run, pending: saving } = useAdminAction({ refresh })

const enabled = ref(false)
const code = ref('')
const content = reactive(
  Object.fromEntries(LOCALES.map((l) => [l, { title: '', text: '', cta: '' }])) as Record<
    Locale,
    PromoBannerContent
  >,
)
const activeLocale = ref<Locale>('de')

watch(
  () => data.value?.settings,
  (s) => {
    if (!s) return
    enabled.value = s.enabled
    code.value = s.code ?? ''
    for (const l of LOCALES)
      Object.assign(content[l], { title: '', text: '', cta: '', ...s.content[l] })
  },
  { immediate: true },
)

const fields = [
  { key: 'title' as const, label: 'Überschrift' },
  { key: 'text' as const, label: 'Text', multiline: true },
  { key: 'cta' as const, label: 'Button-Text' },
]

const deMissing = computed(() => fields.filter((f) => !content.de[f.key].trim()))

function save() {
  // Before the GET lands the form is blank — saving would wipe the stored content.
  if (!data.value || deMissing.value.length) return
  return run(
    () =>
      $fetch('/api/admin/settings/promo-banner', {
        method: 'PUT',
        credentials: 'include',
        body: { enabled: enabled.value, code: code.value, content },
      }),
    { success: 'Promo-Banner gespeichert', error: 'Speichern fehlgeschlagen — Eingaben prüfen' },
  )
}
</script>

<template>
  <PsCard data-testid="promo-banner-settings">
    <h2 class="text-subheading">Promo-Banner</h2>
    <p class="mb-lg mt-xs text-body-regular text-secondary">
      Öffnet sich im Shop beim ersten Aufruf einer Produktseite, einmal pro Besucher. Ändern sich
      Code oder deutsche Überschrift, sehen ihn auch Besucher erneut, die ihn schon kannten.
    </p>

    <form class="space-y-lg" @submit.prevent="save">
      <label class="flex items-center gap-sm text-body-regular">
        <input
          v-model="enabled"
          type="checkbox"
          :disabled="!canWrite"
          data-testid="promo-enabled"
        />
        Banner im Shop anzeigen
      </label>

      <div class="space-y-xs">
        <PsInput
          v-model="code"
          label="Gutscheincode (optional)"
          placeholder="z. B. OPEN10"
          :disabled="!canWrite"
          name="promo-code"
          data-testid="promo-code"
        />
        <p class="text-caption text-secondary">
          Muss unter Gutscheine existieren. Ohne Code ist es ein reiner Hinweis-Banner.
        </p>
        <div
          v-if="data?.voucherProblem && data.settings.code === code.trim().toUpperCase()"
          data-testid="promo-voucher-warning"
          class="rounded-card border border-amber-500/40 bg-amber-500/10 p-md text-body-regular text-primary"
        >
          <strong>Wird im Shop nicht angezeigt:</strong>
          {{ VOUCHER_PROBLEMS[data.voucherProblem] }}.
        </div>
      </div>

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
            :data-testid="`promo-locale-${l}`"
            @click="activeLocale = l"
          >
            {{ l.toUpperCase() }}{{ l === 'de' ? ' *' : '' }}
          </PsButton>
        </div>
        <p v-if="activeLocale !== 'de'" class="text-caption text-secondary">
          Leere Felder zeigen den deutschen Text.
        </p>
        <template v-for="f in fields" :key="f.key">
          <PsTextarea
            v-if="f.multiline"
            v-model="content[activeLocale][f.key]"
            :label="f.label"
            :placeholder="activeLocale === 'de' ? '' : content.de[f.key]"
            :rows="3"
            :disabled="!canWrite"
            :name="`promo-${f.key}`"
            :data-testid="`promo-${f.key}`"
          />
          <PsInput
            v-else
            v-model="content[activeLocale][f.key]"
            :label="f.label"
            :placeholder="activeLocale === 'de' ? '' : content.de[f.key]"
            :disabled="!canWrite"
            :name="`promo-${f.key}`"
            :data-testid="`promo-${f.key}`"
          />
        </template>
        <p v-if="deMissing.length" class="text-caption text-danger" data-testid="promo-de-missing">
          Deutsch ist Pflicht: {{ deMissing.map((f) => f.label).join(', ') }} fehlt.
        </p>
      </div>

      <PsButton
        v-if="canWrite"
        type="submit"
        :loading="saving"
        :disabled="!data || deMissing.length > 0"
        data-testid="promo-save"
      >
        Speichern
      </PsButton>
    </form>
  </PsCard>
</template>
