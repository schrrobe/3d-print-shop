<script setup lang="ts">
import { PsAdminTable, PsBadge, PsButton, PsInput, PsTextarea, useToast } from '@print-shop/ui'
import { eurosToCents, formatCents } from '@print-shop/utils'

definePageMeta({ layout: 'admin', middleware: 'admin-auth' })

interface VoucherOrder {
  id: string
  orderNumber: string
  status: string
  discountCents: number
  totalCents: number
  createdAt: string
}

interface AdminVoucherDetail {
  id: string
  code: string
  type: 'percent' | 'fixed'
  value: number
  active: boolean
  validFrom: string | null
  validUntil: string | null
  maxRedemptions: number | null
  redemptionCount: number
  minOrderCents: number
  note: string | null
  orders: VoucherOrder[]
  _count: { orders: number }
}

const route = useRoute()
const toast = useToast()
const auth = useAdminAuthStore()
const voucherId = String(route.params.id)

const { data, refresh } = await useFetch<{ voucher: AdminVoucherDetail }>(
  `/api/admin/vouchers/${voucherId}`,
  { credentials: 'include', server: false },
)

const form = reactive({
  type: 'percent' as 'percent' | 'fixed',
  value: '0',
  minOrderEuros: '0',
  validFrom: '',
  validUntil: '',
  maxRedemptions: '',
  note: '',
})

watch(
  () => data.value?.voucher,
  (voucher) => {
    if (!voucher) return
    form.type = voucher.type
    form.value = String(voucher.type === 'fixed' ? voucher.value / 100 : voucher.value)
    form.minOrderEuros = String(voucher.minOrderCents / 100)
    form.validFrom = voucher.validFrom ? voucher.validFrom.slice(0, 10) : ''
    form.validUntil = voucher.validUntil ? voucher.validUntil.slice(0, 10) : ''
    form.maxRedemptions = voucher.maxRedemptions != null ? String(voucher.maxRedemptions) : ''
    form.note = voucher.note ?? ''
  },
  { immediate: true },
)

const submitting = ref(false)

async function save() {
  submitting.value = true
  try {
    await $fetch(`/api/admin/vouchers/${voucherId}`, {
      method: 'PATCH',
      credentials: 'include',
      body: {
        type: form.type,
        value: form.type === 'fixed' ? eurosToCents(Number(form.value)) : Number(form.value),
        minOrderCents: eurosToCents(Number(form.minOrderEuros) || 0),
        validFrom: form.validFrom ? new Date(form.validFrom).toISOString() : null,
        validUntil: form.validUntil ? new Date(`${form.validUntil}T23:59:59`).toISOString() : null,
        maxRedemptions: form.maxRedemptions === '' ? null : Number(form.maxRedemptions),
        note: form.note || null,
      },
    })
    toast.show('Gutschein gespeichert', { variant: 'success' })
    await refresh()
  } catch (err) {
    const message = (err as { data?: { message?: string } })?.data?.message
    toast.show(message ?? 'Speichern fehlgeschlagen', { variant: 'error' })
  } finally {
    submitting.value = false
  }
}

async function toggleActive() {
  if (!data.value) return
  await $fetch(`/api/admin/vouchers/${voucherId}`, {
    method: 'PATCH',
    credentials: 'include',
    body: { active: !data.value.voucher.active },
  })
  await refresh()
}

const orderColumns = [
  { key: 'orderNumber', label: 'Bestellung' },
  { key: 'status', label: 'Status' },
  { key: 'discountCents', label: 'Rabatt', align: 'right' as const },
  { key: 'totalCents', label: 'Gesamt', align: 'right' as const },
  { key: 'createdAt', label: 'Datum' },
]
</script>

<template>
  <div v-if="data?.voucher" class="flex flex-col gap-2xl" data-testid="admin-voucher-detail">
    <div class="flex flex-wrap items-center gap-md">
      <h2 class="font-mono text-heading-small">{{ data.voucher.code }}</h2>
      <PsBadge :variant="data.voucher.active ? 'brand' : 'default'">
        {{ data.voucher.active ? 'aktiv' : 'inaktiv' }}
      </PsBadge>
      <span class="text-body-regular text-secondary">
        Eingelöst: {{ data.voucher.redemptionCount }} / {{ data.voucher.maxRedemptions ?? '∞' }}
      </span>
      <PsButton
        v-if="auth.can('vouchers:write')"
        variant="ghost"
        size="sm"
        data-testid="toggle-voucher"
        @click="toggleActive"
      >
        {{ data.voucher.active ? 'Deaktivieren' : 'Aktivieren' }}
      </PsButton>
    </div>

    <form
      v-if="auth.can('vouchers:write')"
      class="flex max-w-[36rem] flex-col gap-md"
      data-testid="voucher-form"
      @submit.prevent="save"
    >
      <fieldset class="flex gap-lg" role="radiogroup" aria-label="Typ">
        <label class="flex cursor-pointer items-center gap-sm">
          <input v-model="form.type" type="radio" value="percent" name="type" />
          <span>Prozent</span>
        </label>
        <label class="flex cursor-pointer items-center gap-sm">
          <input v-model="form.type" type="radio" value="fixed" name="type" />
          <span>Festbetrag</span>
        </label>
      </fieldset>

      <PsInput
        v-model="form.value"
        :label="form.type === 'percent' ? 'Wert (%)' : 'Wert (€)'"
        type="number"
        required
        data-testid="voucher-value"
      />
      <PsInput v-model="form.minOrderEuros" label="Mindestbestellwert (€)" type="number" />
      <div class="grid gap-md sm:grid-cols-2">
        <PsInput v-model="form.validFrom" label="Gültig von" type="date" />
        <PsInput v-model="form.validUntil" label="Gültig bis" type="date" />
      </div>
      <PsInput
        v-model="form.maxRedemptions"
        label="Max. Einlösungen (leer = unbegrenzt)"
        type="number"
      />
      <PsTextarea v-model="form.note" label="Interne Notiz" :rows="3" />

      <div class="flex gap-md">
        <PsButton type="submit" :disabled="submitting" data-testid="save-voucher">Speichern</PsButton>
        <NuxtLink to="/admin/vouchers"><PsButton variant="ghost">Zurück</PsButton></NuxtLink>
      </div>
    </form>

    <section>
      <h3 class="mb-md text-label-medium">Letzte Bestellungen ({{ data.voucher._count.orders }})</h3>
      <PsAdminTable :columns="orderColumns" :rows="data.voucher.orders" empty="Noch keine Einlösungen">
        <template #cell-orderNumber="{ row }">
          <NuxtLink
            :to="`/admin/orders/${(row as unknown as VoucherOrder).id}`"
            class="font-mono text-brand hover:underline"
          >
            {{ (row as unknown as VoucherOrder).orderNumber }}
          </NuxtLink>
        </template>
        <template #cell-discountCents="{ value }">−{{ formatCents(Number(value)) }}</template>
        <template #cell-totalCents="{ value }">{{ formatCents(Number(value)) }}</template>
        <template #cell-createdAt="{ value }">
          {{ new Date(String(value)).toLocaleDateString('de-DE') }}
        </template>
      </PsAdminTable>
    </section>
  </div>
</template>
