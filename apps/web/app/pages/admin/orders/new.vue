<script setup lang="ts">
import { PsButton, PsCard, PsInput, PsPrice, PsSelect, PsTextarea } from '@print-shop/ui'
import { calcShippingCents, eurosToCents } from '@print-shop/utils'

definePageMeta({ layout: 'admin', middleware: 'admin-auth' })

const router = useRouter()
const auth = useAdminAuthStore()

interface AdminProduct {
  id: string
  slug: string
  priceCents: number
  translations: { locale: string; name: string }[]
}

interface Line {
  productId?: string
  name: string
  quantity: string
  /** Gross unit price in euros (converted to cents on submit). */
  priceEuros: string
}

const { data: productData } = await useFetch<{ products: AdminProduct[] }>('/api/admin/products', {
  credentials: 'include',
  server: false,
  immediate: auth.can('products:read'),
})

const form = reactive({
  firstName: '',
  lastName: '',
  company: '',
  street: '',
  zip: '',
  city: '',
  country: 'DE',
  email: '',
  phone: '',
  locale: 'de' as 'de' | 'en',
  paymentMethod: 'stripe_payment_link' as 'stripe_payment_link' | 'bank_transfer',
  note: '',
})
const lines = ref<Line[]>([{ name: '', quantity: '1', priceEuros: '' }])
const pickedProduct = ref('')

// radix-vue SelectItem rejects an empty value, so the prompt is the select's placeholder.
const productOptions = computed(() =>
  (productData.value?.products ?? []).map((p) => ({ value: p.id, label: productName(p) })),
)

function productName(p: AdminProduct): string {
  return (
    p.translations.find((t) => t.locale === form.locale)?.name ??
    p.translations.find((t) => t.locale === 'de')?.name ??
    p.slug
  )
}

watch(pickedProduct, (id) => {
  const product = productData.value?.products.find((p) => p.id === id)
  if (!product) return
  lines.value.push({
    productId: product.id,
    name: productName(product),
    quantity: '1',
    priceEuros: (product.priceCents / 100).toFixed(2),
  })
  pickedProduct.value = ''
})

const subtotalCents = computed(() =>
  lines.value.reduce(
    (sum, l) => sum + eurosToCents(Number(l.priceEuros) || 0) * (Number(l.quantity) || 0),
    0,
  ),
)

// Prefilled with the shop's shipping rule until the admin types their own value.
const shippingTouched = ref(false)
const shippingEuros = ref('')
watchEffect(() => {
  if (!shippingTouched.value) {
    shippingEuros.value = (calcShippingCents(subtotalCents.value, form.country) / 100).toFixed(2)
  }
})
const shippingCents = computed(() => eurosToCents(Number(shippingEuros.value) || 0))

const { run, pending } = useAdminAction()

async function create() {
  let created: { order: { id: string } } | undefined
  const ok = await run(
    async () => {
      created = await $fetch<{ order: { id: string }; emailSent: boolean }>('/api/admin/orders', {
        method: 'POST',
        credentials: 'include',
        body: {
          address: {
            firstName: form.firstName,
            lastName: form.lastName,
            company: form.company || undefined,
            street: form.street,
            zip: form.zip,
            city: form.city,
            country: form.country.toUpperCase(),
            email: form.email,
            phone: form.phone || undefined,
          },
          locale: form.locale,
          paymentMethod: form.paymentMethod,
          shippingCents: shippingCents.value,
          note: form.note || undefined,
          items: lines.value.map((l) => ({
            productId: l.productId,
            name: l.name,
            quantity: Number(l.quantity),
            unitPriceCents: eurosToCents(Number(l.priceEuros)),
          })),
        },
      })
    },
    { success: 'Paylink-Bestellung angelegt', error: 'Anlegen fehlgeschlagen' },
  )
  if (ok && created) await router.push(`/admin/orders/${created.order.id}`)
}
</script>

<template>
  <div class="max-w-[48rem]" data-testid="admin-order-new">
    <p v-if="!auth.can('orders:write')" class="text-body-regular text-secondary">
      Keine Berechtigung zum Anlegen von Bestellungen.
    </p>
    <form v-else class="flex flex-col gap-lg" data-testid="paylink-form" @submit.prevent="create">
      <PsCard>
        <h3 class="text-label-medium">Kunde</h3>
        <div class="mt-md grid gap-md sm:grid-cols-2">
          <PsInput v-model="form.firstName" label="Vorname" required />
          <PsInput v-model="form.lastName" label="Nachname" required />
          <PsInput v-model="form.company" label="Firma (optional)" class="sm:col-span-2" />
          <PsInput
            v-model="form.street"
            label="Straße und Hausnummer"
            required
            class="sm:col-span-2"
          />
          <PsInput v-model="form.zip" label="PLZ" required />
          <PsInput v-model="form.city" label="Ort" required />
          <PsInput v-model="form.country" label="Land (ISO, z. B. DE)" required />
          <PsInput v-model="form.phone" label="Telefon (optional)" />
          <PsInput
            v-model="form.email"
            label="E-Mail"
            type="email"
            required
            class="sm:col-span-2"
            data-testid="paylink-email"
          />
          <PsSelect
            v-model="form.locale"
            label="Sprache (E-Mails, Rechnung)"
            :options="[
              { value: 'de', label: 'Deutsch' },
              { value: 'en', label: 'Englisch' },
            ]"
          />
        </div>
      </PsCard>

      <PsCard>
        <h3 class="text-label-medium">Positionen (Bruttopreise)</h3>
        <div
          v-for="(line, i) in lines"
          :key="i"
          class="mt-md grid items-end gap-md sm:grid-cols-[1fr_5rem_8rem_auto]"
          data-testid="paylink-line"
        >
          <PsInput
            v-model="line.name"
            label="Bezeichnung (inkl. Farben/Personalisierung)"
            required
          />
          <PsInput v-model="line.quantity" label="Menge" type="number" min="1" required />
          <PsInput
            v-model="line.priceEuros"
            label="Stückpreis (€)"
            type="number"
            min="0"
            step="0.01"
            required
          />
          <PsButton
            variant="ghost"
            type="button"
            :disabled="lines.length === 1"
            @click="lines.splice(i, 1)"
          >
            Entfernen
          </PsButton>
        </div>
        <div class="mt-md flex flex-wrap items-end gap-md">
          <PsButton
            variant="secondary"
            type="button"
            data-testid="paylink-add-line"
            @click="lines.push({ name: '', quantity: '1', priceEuros: '' })"
          >
            Freie Position
          </PsButton>
          <PsSelect
            v-if="auth.can('products:read')"
            v-model="pickedProduct"
            label="Aus dem Shop"
            placeholder="Shop-Produkt hinzufügen …"
            :options="productOptions"
          />
        </div>
      </PsCard>

      <PsCard>
        <h3 class="text-label-medium">Zahlung</h3>
        <fieldset class="mt-md flex flex-wrap gap-lg" role="radiogroup" aria-label="Zahlungsart">
          <label class="flex cursor-pointer items-center gap-sm">
            <input
              v-model="form.paymentMethod"
              type="radio"
              value="stripe_payment_link"
              name="pm"
            />
            <span>Stripe-Zahlungslink</span>
          </label>
          <label class="flex cursor-pointer items-center gap-sm">
            <input v-model="form.paymentMethod" type="radio" value="bank_transfer" name="pm" />
            <span>Vorkasse (Rechnung sofort)</span>
          </label>
        </fieldset>
        <div class="mt-md grid gap-md sm:grid-cols-2">
          <PsInput
            v-model="shippingEuros"
            label="Versand (€)"
            type="number"
            min="0"
            step="0.01"
            required
            @input="shippingTouched = true"
          />
        </div>
        <div class="mt-md flex justify-between border-t border-subtle pt-md text-label-medium">
          <span>Gesamt</span>
          <PsPrice :cents="subtotalCents + shippingCents" data-testid="paylink-total" />
        </div>
        <PsTextarea v-model="form.note" class="mt-md" label="Interne Notiz" :rows="3" />
      </PsCard>

      <div class="flex gap-md">
        <PsButton type="submit" :disabled="pending" data-testid="paylink-submit">
          {{
            form.paymentMethod === 'bank_transfer'
              ? 'Anlegen & Rechnung senden'
              : 'Anlegen & Link senden'
          }}
        </PsButton>
        <NuxtLink to="/admin/orders"
          ><PsButton variant="ghost" type="button">Abbrechen</PsButton></NuxtLink
        >
      </div>
    </form>
  </div>
</template>
