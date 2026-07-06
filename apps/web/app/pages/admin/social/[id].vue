<script setup lang="ts">
import type { MediaOption, SocialEditorValue } from '@print-shop/ui'
import type { AdminSocialPost } from '~/composables/useAdminSocialPosts'
import { canEditSocialPost } from '@print-shop/utils'
import {
  PsButton,
  PsDialog,
  PsSocialPostEditor,
  PsSocialPostPreview,
  PsSocialPostStatusBadge,
  useToast,
} from '@print-shop/ui'

definePageMeta({ layout: 'admin', middleware: 'admin-auth' })

const toast = useToast()
const route = useRoute()
const router = useRouter()
const config = useRuntimeConfig()
const postId = String(route.params.id)

interface AdminProductRow {
  id: string
  slug: string
  priceCents: number
  translations: { locale: string; name: string; description: string }[]
  assets: { type: string; url: string; alt: string | null }[]
}

const [{ data: postData, refresh }, { data: productData }] = await Promise.all([
  useFetch<{ post: AdminSocialPost }>(`/api/admin/social-posts/${postId}`, {
    credentials: 'include',
    server: false,
  }),
  useFetch<{ products: AdminProductRow[] }>('/api/admin/products', {
    credentials: 'include',
    server: false,
  }),
])

const post = computed(() => postData.value?.post ?? null)
const products = computed(() => toEditorProducts(productData.value?.products ?? []))
const editable = computed(() => (post.value ? canEditSocialPost(post.value.status) : false))
const item = computed(() =>
  post.value ? toSocialPostItem(post.value, config.public.siteUrl) : null,
)

const extraMedia = ref<MediaOption[]>([])
// save() drives `busy` manually — it needs the caught error for the inline editor message.
const { run, pending: busy } = useAdminAction()
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

async function save(value: SocialEditorValue, schedule: boolean) {
  busy.value = true
  errorMessage.value = ''
  try {
    await $fetch(`/api/admin/social-posts/${postId}`, {
      method: 'PATCH',
      credentials: 'include',
      body: {
        caption: value.caption,
        mediaUrls: value.mediaUrls,
        productId: value.productId,
        scheduledAt: value.scheduledAt,
      },
    })
    if (schedule && value.scheduledAt) {
      await $fetch(`/api/admin/social-posts/${postId}/schedule`, {
        method: 'POST',
        credentials: 'include',
        body: { scheduledAt: value.scheduledAt },
      })
    }
    toast.show(schedule ? 'Post geplant' : 'Änderungen gespeichert', { variant: 'success' })
    await refresh()
    if (schedule) await router.push('/admin/social')
  } catch (err) {
    const message =
      (err as { data?: { message?: string } })?.data?.message ?? 'Speichern fehlgeschlagen'
    errorMessage.value = message
    toast.show(message, { variant: 'error' })
  } finally {
    busy.value = false
  }
}

async function retry() {
  const ok = await run(
    () =>
      $fetch(`/api/admin/social-posts/${postId}/retry`, {
        method: 'POST',
        credentials: 'include',
      }),
    { success: 'Post erneut geplant', error: 'Erneut planen fehlgeschlagen' },
  )
  if (ok) await router.push('/admin/social')
}

const deleteDialogOpen = ref(false)

async function deletePost() {
  const ok = await run(
    () =>
      $fetch(`/api/admin/social-posts/${postId}`, {
        method: 'DELETE',
        credentials: 'include',
      }),
    { success: 'Post gelöscht', error: 'Löschen fehlgeschlagen' },
  )
  deleteDialogOpen.value = false
  if (ok) await router.push('/admin/social')
}
</script>

<template>
  <div v-if="post && item" data-testid="admin-social-detail">
    <div class="mb-lg flex flex-wrap items-center gap-md">
      <NuxtLink to="/admin/social" class="text-caption text-brand hover:underline">
        ← Zurück zum Planner
      </NuxtLink>
      <PsSocialPostStatusBadge :status="post.status" />
      <span v-if="post.externalPostId" class="text-caption text-secondary">
        Externe Post-ID: {{ post.externalPostId }}
      </span>
      <span v-if="post.attempts > 0" class="text-caption text-secondary">
        Versuche: {{ post.attempts }}
      </span>
    </div>

    <p
      v-if="post.status === 'failed' && post.errorMessage"
      class="mb-md rounded-card border border-red-500/40 bg-red-500/10 p-md text-body-regular text-red-500"
      data-testid="social-error-message"
      role="alert"
    >
      {{ post.errorMessage }}
    </p>

    <template v-if="editable">
      <PsSocialPostEditor
        mode="edit"
        :products="products"
        :extra-media="extraMedia"
        :busy="busy"
        :site-url="config.public.siteUrl"
        :error="errorMessage"
        :initial="{
          platforms: [post.platform],
          caption: post.caption,
          mediaUrls: post.mediaUrls,
          productId: post.productId,
          scheduledAt: post.scheduledAt,
        }"
        @save-draft="save($event, false)"
        @schedule="save($event, true)"
        @cancel="router.push('/admin/social')"
        @upload="onUpload"
      />

      <div class="mt-lg flex flex-wrap gap-sm border-t border-subtle pt-lg">
        <PsButton
          v-if="post.status === 'failed'"
          variant="secondary"
          :disabled="busy"
          data-testid="social-detail-retry"
          @click="retry"
        >
          Sofort erneut planen
        </PsButton>
        <PsButton
          variant="danger"
          :disabled="busy"
          data-testid="social-detail-delete"
          @click="deleteDialogOpen = true"
        >
          Post löschen
        </PsButton>
      </div>
    </template>

    <template v-else>
      <p
        class="mb-md rounded-card border border-subtle bg-surface-elevated p-md text-body-regular text-secondary"
        data-testid="social-readonly-notice"
      >
        Dieser Post ist
        {{ post.status === 'published' ? 'veröffentlicht' : `im Status „${post.status}"` }}
        und kann nicht mehr bearbeitet oder gelöscht werden.
      </p>
      <PsSocialPostPreview
        :platforms="[post.platform]"
        :caption="post.caption"
        :media-urls="post.mediaUrls"
        :product-name="item.productName"
        :product-url="item.productUrl"
        :scheduled-at="post.scheduledAt"
        :status="post.status"
      />
    </template>

    <PsDialog
      v-model:open="deleteDialogOpen"
      title="Post löschen?"
      description="Der Post wird endgültig entfernt."
    >
      <div class="flex justify-end gap-sm">
        <PsButton variant="ghost" @click="deleteDialogOpen = false">Abbrechen</PsButton>
        <PsButton
          variant="danger"
          :disabled="busy"
          data-testid="social-detail-delete-confirm"
          @click="deletePost"
        >
          Löschen
        </PsButton>
      </div>
    </PsDialog>
  </div>
  <p v-else class="text-body-regular text-secondary">Lade Post …</p>
</template>
