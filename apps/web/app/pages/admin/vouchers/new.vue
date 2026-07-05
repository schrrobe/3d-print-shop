<script setup lang="ts">
import { PsButton, PsInput, PsTextarea, useToast } from '@print-shop/ui'
import { eurosToCents } from '@print-shop/utils'

definePageMeta({ layout: 'admin', middleware: 'admin-auth' })

const toast = useToast()
const router = useRouter()
const auth = useAdminAuthStore()

const form = reactive({
  code: '',
  type: 'percent' as 'percent' | 'fixed',
  /** percent: %, fixed: Euro (converted to cents on submit) */
  value: '10',
  minOrderEuros: '',
  validFrom: '',
  validUntil: '',
  maxRedemptions: '',
  note: '',
})
const submitting = ref(false)

async function create() {
  submitting.value = true
  try {
    await $fetch('/api/admin/vouchers', {
      method: 'POST',
      credentials: 'include',
      body: {
        code: form.code,
        type: form.type,
        value: form.type === 'fixed' ? eurosToCents(Number(form.value)) : Number(form.value),
        active: true,
        minOrderCents: eurosToCents(Number(form.minOrderEuros) || 0),
        // Both ends anchored to UTC so the window matches the picked calendar days
        // regardless of the admin's timezone (validFrom = start-of-day, validUntil = end-of-day).
        validFrom: form.validFrom ? `${form.validFrom}T00:00:00.000Z` : null,
        validUntil: form.validUntil ? `${form.validUntil}T23:59:59.999Z` : null,
        maxRedemptions: form.maxRedemptions === '' ? null : Number(form.maxRedemptions),
        note: form.note || null,
      },
    })
    toast.show('Gutschein angelegt', { variant: 'success' })
    await router.push('/admin/vouchers')
  } catch (err) {
    const message = (err as { data?: { message?: string } })?.data?.message
    toast.show(message ?? 'Anlegen fehlgeschlagen', { variant: 'error' })
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="max-w-[36rem]" data-testid="admin-voucher-new">
    <p v-if="!auth.can('vouchers:write')" class="text-body-regular text-secondary" data-testid="voucher-no-access">
      Keine Berechtigung zum Anlegen von Gutscheinen.
    </p>
    <form v-else class="flex flex-col gap-md" data-testid="voucher-form" @submit.prevent="create">
      <PsInput v-model="form.code" label="Code" required placeholder="SOMMER10" data-testid="voucher-code" />

      <fieldset class="flex gap-lg" role="radiogroup" aria-label="Typ">
        <label class="flex cursor-pointer items-center gap-sm">
          <input v-model="form.type" type="radio" value="percent" name="type" data-testid="type-percent" />
          <span>Prozent</span>
        </label>
        <label class="flex cursor-pointer items-center gap-sm">
          <input v-model="form.type" type="radio" value="fixed" name="type" data-testid="type-fixed" />
          <span>Festbetrag</span>
        </label>
      </fieldset>

      <PsInput
        v-model="form.value"
        :label="form.type === 'percent' ? 'Wert (%)' : 'Wert (€)'"
        type="number"
        min="0"
        :max="form.type === 'percent' ? 100 : undefined"
        required
        data-testid="voucher-value"
      />
      <PsInput
        v-model="form.minOrderEuros"
        label="Mindestbestellwert (€)"
        type="number"
        min="0"
        data-testid="voucher-min-order"
      />
      <div class="grid gap-md sm:grid-cols-2">
        <PsInput v-model="form.validFrom" label="Gültig von" type="date" />
        <PsInput v-model="form.validUntil" label="Gültig bis" type="date" />
      </div>
      <PsInput
        v-model="form.maxRedemptions"
        label="Max. Einlösungen (leer = unbegrenzt)"
        type="number"
        min="0"
        data-testid="voucher-max-redemptions"
      />
      <PsTextarea v-model="form.note" label="Interne Notiz" :rows="3" />

      <div class="flex gap-md">
        <PsButton type="submit" :disabled="submitting" data-testid="save-voucher">Anlegen</PsButton>
        <NuxtLink to="/admin/vouchers"><PsButton variant="ghost">Abbrechen</PsButton></NuxtLink>
      </div>
    </form>
  </div>
</template>
