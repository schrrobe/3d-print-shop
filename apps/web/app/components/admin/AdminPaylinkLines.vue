<script setup lang="ts">
import { PsButton, PsCombobox, PsInput } from '@print-shop/ui'

export interface PaylinkLine {
  productId?: string
  name: string
  quantity: string
  /** Gross unit price in euros (converted to cents on submit). */
  priceEuros: string
}

interface AdminProduct {
  id: string
  slug: string
  priceCents: number
  translations: { locale: string; name: string }[]
}

const props = defineProps<{ locale: string }>()
const lines = defineModel<PaylinkLine[]>({ required: true })
const auth = useAdminAuthStore()

const { data: productData } = await useFetch<{ products: AdminProduct[] }>('/api/admin/products', {
  credentials: 'include',
  server: false,
  immediate: auth.can('products:read'),
})
const pickedProduct = ref('')

function productName(p: AdminProduct): string {
  return (
    p.translations.find((t) => t.locale === props.locale)?.name ??
    p.translations.find((t) => t.locale === 'de')?.name ??
    p.slug
  )
}

const productOptions = computed(() =>
  (productData.value?.products ?? []).map((p) => ({ value: p.id, label: productName(p) })),
)

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
</script>

<template>
  <div>
    <div
      v-for="(line, i) in lines"
      :key="i"
      class="mt-md grid items-end gap-md sm:grid-cols-[1fr_5rem_8rem_auto]"
      data-testid="paylink-line"
    >
      <PsInput v-model="line.name" label="Bezeichnung (inkl. Farben/Personalisierung)" required />
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
      <PsCombobox
        v-if="auth.can('products:read')"
        v-model="pickedProduct"
        label="Aus dem Shop"
        placeholder="Shop-Produkt suchen …"
        :options="productOptions"
      />
    </div>
  </div>
</template>
