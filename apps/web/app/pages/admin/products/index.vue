<script setup lang="ts">
import { PsAdminTable, PsBadge, PsButton, PsDialog, PsInput, PsPrice, PsTextarea, useToast } from '@print-shop/ui'

definePageMeta({ layout: 'admin', middleware: 'admin-auth' })

interface AdminProduct {
  id: string
  slug: string
  priceCents: number
  active: boolean
  translations: { locale: string; name: string; description: string }[]
}

const toast = useToast()
const auth = useAdminAuthStore()
const { data, refresh } = await useFetch<{ products: AdminProduct[] }>('/api/admin/products', {
  credentials: 'include',
  server: false,
})

const dialogOpen = ref(false)
const form = reactive({ slug: '', name: '', description: '', priceEuros: '' })

async function createProduct() {
  const priceCents = Math.round(Number(form.priceEuros.replace(',', '.')) * 100)
  try {
    await $fetch('/api/admin/products', {
      method: 'POST',
      credentials: 'include',
      body: {
        slug: form.slug,
        priceCents,
        active: true,
        translations: [
          { locale: 'de', name: form.name, description: form.description },
          { locale: 'en', name: form.name, description: form.description },
        ],
        colorSlots: [{ slot: 'zone_1_main', label: 'Hauptfarbe' }],
      },
    })
    toast.show('Produkt angelegt', { variant: 'success' })
    dialogOpen.value = false
    Object.assign(form, { slug: '', name: '', description: '', priceEuros: '' })
    await refresh()
  } catch {
    toast.show('Anlegen fehlgeschlagen (Slug bereits vergeben?)', { variant: 'error' })
  }
}

async function toggleActive(product: AdminProduct) {
  await $fetch(`/api/admin/products/${product.id}`, {
    method: 'PATCH',
    credentials: 'include',
    body: { active: !product.active },
  })
  await refresh()
}

const columns = [
  { key: 'name', label: 'Produkt' },
  { key: 'slug', label: 'Slug' },
  { key: 'priceCents', label: 'Preis', align: 'right' as const },
  { key: 'active', label: 'Sichtbar' },
  { key: 'actions', label: '' },
]

const rows = computed(() =>
  (data.value?.products ?? []).map((p) => ({
    ...p,
    name: p.translations.find((t) => t.locale === 'de')?.name ?? p.slug,
  })),
)
</script>

<template>
  <div data-testid="admin-products">
    <div v-if="auth.can('products:write')" class="mb-lg">
      <PsButton data-testid="new-product" @click="dialogOpen = true">Neues Produkt</PsButton>
    </div>

    <PsAdminTable :columns="columns" :rows="rows" empty="Keine Produkte">
      <template #cell-priceCents="{ value }">
        <PsPrice :cents="Number(value)" size="sm" />
      </template>
      <template #cell-active="{ value }">
        <PsBadge :variant="value ? 'brand' : 'default'">{{ value ? 'aktiv' : 'inaktiv' }}</PsBadge>
      </template>
      <template #cell-actions="{ row }">
        <PsButton
          v-if="auth.can('products:write')"
          variant="ghost"
          size="sm"
          data-testid="toggle-product"
          @click="toggleActive(row as unknown as AdminProduct)"
        >
          {{ (row as unknown as AdminProduct).active ? 'Deaktivieren' : 'Aktivieren' }}
        </PsButton>
      </template>
    </PsAdminTable>

    <PsDialog v-model:open="dialogOpen" title="Neues Produkt">
      <form class="flex flex-col gap-md" data-testid="product-form" @submit.prevent="createProduct">
        <PsInput v-model="form.name" label="Name (de/en)" required />
        <PsInput v-model="form.slug" label="Slug (kebab-case)" required placeholder="mein-produkt" />
        <PsInput v-model="form.priceEuros" label="Preis (EUR)" required placeholder="24,99" />
        <PsTextarea v-model="form.description" label="Beschreibung" required :rows="3" />
        <PsButton type="submit" data-testid="save-product">Anlegen</PsButton>
      </form>
    </PsDialog>
  </div>
</template>
