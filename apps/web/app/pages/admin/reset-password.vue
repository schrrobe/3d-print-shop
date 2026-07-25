<script setup lang="ts">
import { PsCard, PsInput, PsPillButton } from '@print-shop/ui'

/**
 * Target of the password-reset mail (`${WEB_URL}/admin/reset-password?token=…`).
 * Exempt from the admin session guard — the whole point is that the user cannot
 * log in. The token is single-use and expires after an hour server-side.
 */
definePageMeta({ layout: false })

/** Mirrors passwordResetSchema in apps/api/src/routes/admin/auth.ts. */
const MIN_PASSWORD_LENGTH = 12

const route = useRoute()
const router = useRouter()

const token = String(route.query.token ?? '')
const password = ref('')
const confirmation = ref('')
const error = ref('')
const submitting = ref(false)
const done = ref(false)
// Guards against pre-hydration native form submits (e2e clicks fast)
const hydrated = ref(false)
onMounted(() => {
  hydrated.value = true
  // The token is a bearer credential; keep it out of the address bar and the
  // browser history once it has been read into memory.
  if (token) window.history.replaceState(window.history.state, '', '/admin/reset-password')
})

async function submit() {
  error.value = ''
  if (password.value.length < MIN_PASSWORD_LENGTH) {
    error.value = `Das Passwort muss mindestens ${MIN_PASSWORD_LENGTH} Zeichen lang sein.`
    return
  }
  if (password.value !== confirmation.value) {
    error.value = 'Die Passwörter stimmen nicht überein.'
    return
  }
  submitting.value = true
  try {
    await $fetch('/api/admin/auth/password-reset', {
      method: 'POST',
      body: { token, password: password.value },
    })
    done.value = true
  } catch (err) {
    // 401 is the only expected failure: token unknown, already used, or expired.
    error.value =
      (err as { status?: number })?.status === 401
        ? 'Dieser Link ist ungültig oder abgelaufen. Bitte fordere einen neuen an.'
        : 'Das Passwort konnte nicht gesetzt werden. Bitte versuche es erneut.'
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="flex min-h-screen items-center justify-center bg-surface p-md text-primary">
    <PsCard class="w-full max-w-[24rem]">
      <h1 class="text-heading-small">Neues Passwort setzen</h1>

      <p v-if="!token" class="mt-lg text-body-regular text-secondary" data-testid="reset-no-token">
        Dieser Link ist unvollständig. Bitte öffne den Link aus der E-Mail erneut oder fordere einen
        neuen an.
      </p>

      <div v-else-if="done" class="mt-lg flex flex-col gap-md" data-testid="reset-success">
        <p class="text-body-regular">
          Passwort gesetzt. Alle offenen Sitzungen und Reset-Links wurden ungültig.
        </p>
        <PsPillButton data-testid="reset-to-login" @click="router.push('/admin/login')">
          Zum Login
        </PsPillButton>
      </div>

      <form
        v-else
        class="mt-lg flex flex-col gap-md"
        data-testid="admin-reset-form"
        @submit.prevent="submit"
      >
        <PsInput
          v-model="password"
          label="Neues Passwort"
          type="password"
          name="password"
          required
          autocomplete="new-password"
        />
        <PsInput
          v-model="confirmation"
          label="Passwort bestätigen"
          type="password"
          name="confirmation"
          required
          autocomplete="new-password"
        />
        <p class="text-caption text-secondary">Mindestens {{ MIN_PASSWORD_LENGTH }} Zeichen.</p>
        <p v-if="error" class="text-caption text-red-500" role="alert" data-testid="reset-error">
          {{ error }}
        </p>
        <PsPillButton type="submit" :disabled="submitting || !hydrated" data-testid="reset-submit">
          Passwort setzen
        </PsPillButton>
      </form>
    </PsCard>
  </div>
</template>
