<script setup lang="ts">
import type { MediaOption, SocialEditorValue } from '@print-shop/ui'
import { PsSocialPostEditor, useToast } from '@print-shop/ui'

definePageMeta({ layout: 'admin', middleware: 'admin-auth' })

const toast = useToast()
const config = useRuntimeConfig()
const router = useRouter()

interface AdminProductRow {
  id: string
  slug: string
  priceCents: number
  translations: { locale: string; name: string; description: string }[]
  assets: { type: string; url: string; alt: string | null }[]
}

const { data } = await useFetch<{ products: AdminProductRow[] }>('/api/admin/products', {
  credentials: 'include',
  server: false,
})
const products = computed(() => toEditorProducts(data.value?.products ?? []))

const extraMedia = ref<MediaOption[]>([])
const busy = ref(false)
const errorMessage = ref('')

async function onUpload(file: File) {
  try {
    const url = await uploadSocialMedia(file)
    extraMedia.value = [...extraMedia.value, { url, alt: file.name }]
    toast.show('Bild hochgeladen', { variant: 'success' })
  } catch {
    toast.show('Upload fehlgeschlagen — nur JPG/PNG/WebP bis 50 MB', { variant: 'error' })
  }
}

async function submit(value: SocialEditorValue, schedule: boolean) {
  busy.value = true
  errorMessage.value = ''
  try {
    await $fetch('/api/admin/social-posts', {
      method: 'POST',
      credentials: 'include',
      body: {
        platforms: value.platforms,
        caption: value.caption,
        mediaUrls: value.mediaUrls,
        productId: value.productId,
        scheduledAt: value.scheduledAt,
        schedule,
      },
    })
    toast.show(schedule ? 'Post geplant' : 'Entwurf gespeichert', { variant: 'success' })
    await router.push('/admin/social')
  } catch (err) {
    const message =
      (err as { data?: { message?: string } })?.data?.message ?? 'Speichern fehlgeschlagen'
    errorMessage.value = message
    toast.show(message, { variant: 'error' })
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div data-testid="admin-social-new">
    <PsSocialPostEditor
      :products="products"
      :extra-media="extraMedia"
      :busy="busy"
      :site-url="config.public.siteUrl"
      :error="errorMessage"
      @save-draft="submit($event, false)"
      @schedule="submit($event, true)"
      @cancel="router.push('/admin/social')"
      @upload="onUpload"
    />
  </div>
</template>
