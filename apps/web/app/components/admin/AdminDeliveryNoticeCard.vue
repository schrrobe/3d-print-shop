<script setup lang="ts">
import { PsButton, PsCard } from '@print-shop/ui'

const auth = useAdminAuthStore()
const canWrite = computed(() => auth.can('settings:write'))

const { data, refresh } = await useFetch<{ enabled: boolean }>(
  '/api/admin/settings/delivery-notice',
  { credentials: 'include', server: false },
)
const { run, pending: saving } = useAdminAction({ refresh })

const enabled = ref(false)
watch(
  () => data.value,
  (s) => {
    if (s) enabled.value = s.enabled
  },
  { immediate: true },
)

function save() {
  if (!data.value) return
  return run(
    () =>
      $fetch('/api/admin/settings/delivery-notice', {
        method: 'PUT',
        credentials: 'include',
        body: { enabled: enabled.value },
      }),
    { success: 'Lieferzeit-Hinweis gespeichert', error: 'Speichern fehlgeschlagen' },
  )
}
</script>

<template>
  <PsCard data-testid="delivery-notice-settings">
    <h2 class="text-subheading">Lieferzeit-Hinweis</h2>
    <p class="mb-lg mt-xs text-body-regular text-secondary">
      Zeigt im Checkout rot „Die Lieferzeit beträgt aktuell ca. 4 Wochen." anstelle der normalen
      Lieferzeit-Angabe. Änderungen sind nach spätestens einer Minute im Shop sichtbar.
    </p>

    <form class="space-y-lg" @submit.prevent="save">
      <label class="flex items-center gap-sm text-body-regular">
        <input
          v-model="enabled"
          type="checkbox"
          role="switch"
          :disabled="!canWrite"
          data-testid="delivery-notice-enabled"
        />
        Hinweis im Checkout anzeigen
      </label>

      <PsButton
        v-if="canWrite"
        type="submit"
        :loading="saving"
        :disabled="!data"
        data-testid="delivery-notice-save"
      >
        Speichern
      </PsButton>
    </form>
  </PsCard>
</template>
