<script setup lang="ts">
import { PsCard, PsInput, PsPillButton } from '@print-shop/ui'

definePageMeta({ layout: false })

const auth = useAdminAuthStore()
const route = useRoute()
const router = useRouter()

const email = ref('')
const password = ref('')
const error = ref('')
const submitting = ref(false)
// Guards against pre-hydration native form submits (e2e clicks fast)
const hydrated = ref(false)
onMounted(() => {
  hydrated.value = true
})

async function submit() {
  submitting.value = true
  error.value = ''
  try {
    await auth.login(email.value, password.value)
    await router.push(String(route.query.redirect ?? '/admin'))
  } catch {
    error.value = 'Anmeldung fehlgeschlagen — bitte prüfe E-Mail und Passwort.'
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="flex min-h-screen items-center justify-center bg-surface p-md text-primary">
    <PsCard class="w-full max-w-[24rem]">
      <h1 class="text-heading-small">Admin-Login</h1>
      <form class="mt-lg flex flex-col gap-md" data-testid="admin-login-form" @submit.prevent="submit">
        <PsInput v-model="email" label="E-Mail" type="email" name="email" required autocomplete="username" />
        <PsInput
          v-model="password"
          label="Passwort"
          type="password"
          name="password"
          required
          autocomplete="current-password"
        />
        <p v-if="error" class="text-caption text-red-500" role="alert" data-testid="login-error">{{ error }}</p>
        <PsPillButton type="submit" :disabled="submitting || !hydrated" data-testid="login-submit">Anmelden</PsPillButton>
      </form>
    </PsCard>
  </div>
</template>
