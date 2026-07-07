<script setup lang="ts">
import { PsButton, PsInput, useToast } from '@print-shop/ui'
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

const toast = useToast()
const auth = useAdminAuthStore()

const { data, refresh } = await useFetch<{ settings: TrackingSettingsDto }>(
  '/api/admin/settings/tracking',
  { credentials: 'include', server: false },
)

const form = reactive({ metaPixelId: '', ga4MeasurementId: '', gtmContainerId: '' })
const saving = ref(false)

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

async function save() {
  if (hasErrors.value || saving.value) return
  saving.value = true
  try {
    await $fetch('/api/admin/settings/tracking', {
      method: 'PUT',
      credentials: 'include',
      body: {
        metaPixelId: form.metaPixelId,
        ga4MeasurementId: form.ga4MeasurementId,
        gtmContainerId: form.gtmContainerId,
      },
    })
    toast.show('Tracking-Einstellungen gespeichert', { variant: 'success' })
    await refresh()
  } catch {
    toast.show('Speichern fehlgeschlagen — Eingaben prüfen', { variant: 'error' })
  } finally {
    saving.value = false
  }
}

function clearField(key: (typeof fields)[number]['key']) {
  form[key] = ''
}
</script>

<template>
  <div data-testid="admin-settings" class="max-w-2xl">
    <h1 class="mb-sm text-xl font-semibold">Einstellungen</h1>

    <section class="rounded-lg border border-default bg-surface-raised p-lg">
      <h2 class="text-lg font-medium">Tracking &amp; Analytics</h2>
      <p class="mb-lg mt-xs text-sm text-secondary">
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
          <p class="text-xs text-secondary">{{ field.hint }}</p>
        </div>

        <div
          v-if="doubleTrackingRisk"
          data-testid="double-tracking-warning"
          class="rounded-md border border-amber-300 bg-amber-50 p-md text-sm text-amber-900"
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
    </section>
  </div>
</template>
