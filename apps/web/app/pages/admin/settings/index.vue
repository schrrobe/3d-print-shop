<script setup lang="ts">
import { PsButton, PsCard, PsInput } from '@print-shop/ui'
import {
  GA4_MEASUREMENT_ID_REGEX,
  GTM_CONTAINER_ID_REGEX,
  META_PIXEL_ID_REGEX,
} from '@print-shop/validators'

definePageMeta({
  layout: 'admin',
  middleware: [
    'admin-auth',
    () => {
      if (import.meta.server) return
      const auth = useAdminAuthStore()
      if (!auth.can('settings:read')) return navigateTo('/admin')
    },
  ],
})

interface TrackingSettingsDto {
  metaPixelId: string | null
  ga4MeasurementId: string | null
  gtmContainerId: string | null
}

const auth = useAdminAuthStore()

const { data, refresh } = await useFetch<{ settings: TrackingSettingsDto }>(
  '/api/admin/settings/tracking',
  { credentials: 'include', server: false },
)

const form = reactive({ metaPixelId: '', ga4MeasurementId: '', gtmContainerId: '' })
const { run, pending: saving } = useAdminAction({ refresh })

watch(
  () => data.value?.settings,
  (settings) => {
    if (!settings) return
    form.metaPixelId = settings.metaPixelId ?? ''
    form.ga4MeasurementId = settings.ga4MeasurementId ?? ''
    form.gtmContainerId = settings.gtmContainerId ?? ''
  },
  { immediate: true },
)

const fields = [
  {
    key: 'metaPixelId' as const,
    label: 'Meta Pixel ID',
    placeholder: '123456789012345',
    regex: META_PIXEL_ID_REGEX,
    error: 'Ungültiges Format — numerische ID erwartet, z. B. 123456789012345',
    hint: 'Wird nur nach Marketing-Consent geladen.',
  },
  {
    key: 'ga4MeasurementId' as const,
    label: 'Google Analytics ID (GA4)',
    placeholder: 'G-XXXXXXXXXX',
    regex: GA4_MEASUREMENT_ID_REGEX,
    error: 'Ungültiges Format — GA4 Measurement ID erwartet, z. B. G-AB12CD34EF',
    hint: 'Wird nur nach Statistik-Consent geladen.',
  },
  {
    key: 'gtmContainerId' as const,
    label: 'Google Tag Manager ID',
    placeholder: 'GTM-XXXXXXX',
    regex: GTM_CONTAINER_ID_REGEX,
    error: 'Ungültiges Format — Container-ID erwartet, z. B. GTM-AB12CD3',
    hint: 'Wird nur geladen, wenn Statistik- UND Marketing-Consent erteilt sind.',
  },
]

const fieldError = (key: (typeof fields)[number]['key']): string | undefined => {
  const value = form[key].trim()
  if (value === '') return undefined
  const field = fields.find((f) => f.key === key)!
  return field.regex.test(value) ? undefined : field.error
}

const hasErrors = computed(() => fields.some((f) => fieldError(f.key) !== undefined))

const doubleTrackingRisk = computed(
  () =>
    GA4_MEASUREMENT_ID_REGEX.test(form.ga4MeasurementId.trim()) &&
    GTM_CONTAINER_ID_REGEX.test(form.gtmContainerId.trim()),
)

function save() {
  if (hasErrors.value) return
  return run(
    () =>
      $fetch('/api/admin/settings/tracking', {
        method: 'PUT',
        credentials: 'include',
        body: {
          metaPixelId: form.metaPixelId,
          ga4MeasurementId: form.ga4MeasurementId,
          gtmContainerId: form.gtmContainerId,
        },
      }),
    {
      success: 'Tracking-Einstellungen gespeichert',
      error: 'Speichern fehlgeschlagen — Eingaben prüfen',
    },
  )
}

function clearField(key: (typeof fields)[number]['key']) {
  form[key] = ''
}

// ---------- Firma & Bankverbindung ----------

type CompanyField =
  | 'name'
  | 'owner'
  | 'street'
  | 'zip'
  | 'city'
  | 'email'
  | 'phone'
  | 'website'
  | 'taxNumber'
  | 'accountHolder'
  | 'iban'
  | 'bic'
  | 'invoiceBcc'

interface CompanySettingsDto {
  settings: Record<CompanyField, string | null> & { vatExempt: boolean | null }
  effective: Record<CompanyField, string> & { vatExempt: boolean }
  missing: CompanyField[]
}

const companyFields: { key: CompanyField; label: string; type?: string; hint?: string }[] = [
  { key: 'name', label: 'Firmenname' },
  { key: 'owner', label: 'Inhaber' },
  { key: 'street', label: 'Straße & Hausnummer' },
  { key: 'zip', label: 'PLZ' },
  { key: 'city', label: 'Ort' },
  { key: 'email', label: 'E-Mail', type: 'email' },
  { key: 'phone', label: 'Telefon (optional)', type: 'tel' },
  { key: 'website', label: 'Website (optional)' },
  { key: 'taxNumber', label: 'Steuernummer (bei § 19 UStG optional)' },
  { key: 'accountHolder', label: 'Kontoinhaber' },
  { key: 'iban', label: 'IBAN' },
  { key: 'bic', label: 'BIC' },
  {
    key: 'invoiceBcc',
    label: 'Rechnungen in Blindkopie (BCC) an',
    type: 'email',
    hint: 'Optional. Jede Rechnungs-E-Mail geht zusätzlich unsichtbar an diese Adresse, z. B. Buchhaltung.',
  },
]

const { data: companyData, refresh: refreshCompany } = await useFetch<CompanySettingsDto>(
  '/api/admin/settings/company',
  { credentials: 'include', server: false },
)

const companyForm = reactive(
  Object.fromEntries(companyFields.map((f) => [f.key, ''])) as Record<CompanyField, string>,
)
const vatExempt = ref(true)
const { run: runCompany, pending: savingCompany } = useAdminAction({ refresh: refreshCompany })

watch(
  () => companyData.value,
  (data) => {
    if (!data) return
    for (const f of companyFields) companyForm[f.key] = data.settings[f.key] ?? ''
    vatExempt.value = data.effective.vatExempt
  },
  { immediate: true },
)

const missingLabels = computed(() =>
  (companyData.value?.missing ?? []).map((k) => companyFields.find((f) => f.key === k)?.label ?? k),
)

function saveCompany() {
  // Before the GET lands the form is all blanks — saving would wipe every stored value.
  if (!companyData.value) return
  return runCompany(
    () =>
      $fetch('/api/admin/settings/company', {
        method: 'PUT',
        credentials: 'include',
        body: { ...companyForm, vatExempt: vatExempt.value },
      }),
    { success: 'Firmendaten gespeichert', error: 'Speichern fehlgeschlagen — Eingaben prüfen' },
  )
}
</script>

<template>
  <div data-testid="admin-settings" class="flex max-w-[42rem] flex-col gap-lg">
    <h1 class="text-heading-small">Einstellungen</h1>

    <PsCard>
      <h2 class="text-subheading">Tracking &amp; Analytics</h2>
      <p class="mb-lg mt-xs text-body-regular text-secondary">
        IDs werden im Shop erst nach aktiver Zustimmung über die Consent-Box geladen. Leeres Feld
        speichern entfernt die ID.
      </p>

      <form class="space-y-lg" @submit.prevent="save">
        <div v-for="field in fields" :key="field.key" class="space-y-xs">
          <div class="flex items-end gap-sm">
            <div class="flex-1">
              <PsInput
                v-model="form[field.key]"
                :label="field.label"
                :placeholder="field.placeholder"
                :error="fieldError(field.key)"
                :disabled="!auth.can('settings:write')"
                :name="field.key"
                :data-testid="`tracking-${field.key}`"
              />
            </div>
            <PsButton
              v-if="auth.can('settings:write') && form[field.key] !== ''"
              type="button"
              variant="ghost"
              size="sm"
              :data-testid="`tracking-${field.key}-clear`"
              @click="clearField(field.key)"
            >
              Leeren
            </PsButton>
          </div>
          <p class="text-caption text-secondary">{{ field.hint }}</p>
        </div>

        <div
          v-if="doubleTrackingRisk"
          data-testid="double-tracking-warning"
          class="rounded-card border border-amber-500/40 bg-amber-500/10 p-md text-body-regular text-primary"
        >
          <strong>Hinweis:</strong> Google Analytics und Google Tag Manager sind beide konfiguriert.
          Falls GA4 zusätzlich innerhalb des GTM-Containers eingerichtet ist, werden Pageviews und
          Events doppelt erfasst. Container-Inhalt prüfen.
        </div>

        <PsButton
          v-if="auth.can('settings:write')"
          type="submit"
          :disabled="hasErrors"
          :loading="saving"
          data-testid="tracking-save"
        >
          Speichern
        </PsButton>
      </form>
    </PsCard>
    <PsCard>
      <h2 class="text-subheading">Firma &amp; Bankverbindung</h2>
      <p class="mb-lg mt-xs text-body-regular text-secondary">
        Erscheint auf Rechnungen, Lieferscheinen und in den Überweisungsdaten. Leere Felder nutzen
        den Wert aus der Server-Konfiguration (als Platzhalter angezeigt).
      </p>

      <div
        v-if="missingLabels.length"
        data-testid="company-missing-warning"
        class="mb-lg rounded-card border border-amber-500/40 bg-amber-500/10 p-md text-body-regular text-primary"
      >
        <strong>Unvollständig:</strong> {{ missingLabels.join(', ') }}. Im Live-Betrieb nimmt der
        Shop keine Bestellungen an, bis diese Angaben gesetzt sind.
      </div>

      <form class="grid gap-md sm:grid-cols-2" @submit.prevent="saveCompany">
        <div
          v-for="field in companyFields"
          :key="field.key"
          :class="['space-y-xs', field.hint && 'sm:col-span-2']"
        >
          <PsInput
            v-model="companyForm[field.key]"
            :label="field.label"
            :type="field.type ?? 'text'"
            :placeholder="companyData?.effective[field.key] ?? ''"
            :disabled="!auth.can('settings:write')"
            :name="`company-${field.key}`"
            :data-testid="`company-${field.key}`"
          />
          <p v-if="field.hint" class="text-caption text-secondary">{{ field.hint }}</p>
        </div>
        <div class="space-y-xs sm:col-span-2">
          <label class="flex items-center gap-sm text-body-regular">
            <input
              v-model="vatExempt"
              type="checkbox"
              :disabled="!auth.can('settings:write')"
              data-testid="company-vatExempt"
            />
            Kleinunternehmer nach § 19 UStG
          </label>
          <p class="text-caption text-secondary">
            Rechnungen weisen keine Umsatzsteuer aus und tragen den § 19-Hinweis. Die Steuernummer
            ist dann optional.
          </p>
        </div>
        <div v-if="auth.can('settings:write')" class="sm:col-span-2">
          <PsButton
            type="submit"
            :loading="savingCompany"
            :disabled="!companyData"
            data-testid="company-save"
          >
            Speichern
          </PsButton>
        </div>
      </form>
    </PsCard>
  </div>
</template>
