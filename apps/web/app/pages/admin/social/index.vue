<script setup lang="ts">
import type { SocialPostItem } from '@print-shop/ui'
import { SOCIAL_PLATFORMS, SOCIAL_POST_STATUSES } from '@print-shop/types'
import {
  PsButton,
  PsDialog,
  PsSocialPostCalendar,
  PsSocialPostList,
  SOCIAL_PLATFORM_LABELS,
  SOCIAL_POST_STATUS_LABELS,
  useToast,
} from '@print-shop/ui'

definePageMeta({ layout: 'admin', middleware: 'admin-auth' })

const toast = useToast()
const auth = useAdminAuthStore()
const config = useRuntimeConfig()
const siteUrl = config.public.siteUrl

const viewMode = ref<'list' | 'calendar'>('list')
const platformFilter = ref('')
const statusFilter = ref('')
const search = ref('')

const { data, refresh } = await useFetch<{ posts: AdminSocialPost[] }>('/api/admin/social-posts', {
  credentials: 'include',
  server: false,
  query: computed(() => ({
    ...(platformFilter.value ? { platform: platformFilter.value } : {}),
    ...(statusFilter.value ? { status: statusFilter.value } : {}),
    ...(search.value.trim() ? { q: search.value.trim() } : {}),
  })),
})
watch([platformFilter, statusFilter], () => refresh())

let searchTimer: ReturnType<typeof setTimeout> | undefined
watch(search, () => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => refresh(), 300)
})

const items = computed<SocialPostItem[]>(() =>
  (data.value?.posts ?? []).map((post) => toSocialPostItem(post, siteUrl)),
)

const { run, pending: busy } = useAdminAction({ refresh })

function openPost(post: SocialPostItem) {
  navigateTo(`/admin/social/${post.id}`)
}

function retryPost(post: SocialPostItem) {
  return run(
    () =>
      $fetch(`/api/admin/social-posts/${post.id}/retry`, {
        method: 'POST',
        credentials: 'include',
      }),
    { success: 'Post erneut geplant', error: 'Erneut planen fehlgeschlagen' },
  )
}

const deleteTarget = ref<SocialPostItem | null>(null)
const deleteDialogOpen = ref(false)

function confirmDelete(post: SocialPostItem) {
  deleteTarget.value = post
  deleteDialogOpen.value = true
}

async function deletePost() {
  const target = deleteTarget.value
  if (!target) return
  const ok = await run(
    () =>
      $fetch(`/api/admin/social-posts/${target.id}`, {
        method: 'DELETE',
        credentials: 'include',
      }),
    { success: 'Post gelöscht', error: 'Löschen fehlgeschlagen' },
  )
  if (ok) {
    deleteDialogOpen.value = false
    deleteTarget.value = null
  }
}

/** Dev-freundlicher manueller Scheduler-Lauf (fällige Posts sofort veröffentlichen). */
function runScheduler() {
  return run(
    async () => {
      const data = await $fetch<{ result: { published: number; failed: number } }>(
        '/api/admin/social-posts/run-scheduler',
        { method: 'POST', credentials: 'include' },
      )
      toast.show(
        `Scheduler-Lauf: ${data.result.published} veröffentlicht, ${data.result.failed} fehlgeschlagen`,
        { variant: data.result.failed > 0 ? 'error' : 'success' },
      )
    },
    { error: 'Scheduler-Lauf fehlgeschlagen' },
  )
}
</script>

<template>
  <div data-testid="admin-social">
    <div class="mb-lg flex flex-wrap items-center gap-md">
      <PsButton
        v-if="auth.can('social-posts:write')"
        data-testid="social-new-post"
        @click="navigateTo('/admin/social/new')"
      >
        Neuen Post erstellen
      </PsButton>

      <div class="flex rounded-card border border-subtle" role="tablist" aria-label="Ansicht">
        <button
          type="button"
          role="tab"
          :aria-selected="viewMode === 'list'"
          class="cursor-pointer rounded-l-card px-md py-sm text-caption transition-colors"
          :class="viewMode === 'list' ? 'bg-brand text-on-brand' : 'text-secondary hover:text-primary'"
          data-testid="social-view-list"
          @click="viewMode = 'list'"
        >
          Liste
        </button>
        <button
          type="button"
          role="tab"
          :aria-selected="viewMode === 'calendar'"
          class="cursor-pointer rounded-r-card px-md py-sm text-caption transition-colors"
          :class="viewMode === 'calendar' ? 'bg-brand text-on-brand' : 'text-secondary hover:text-primary'"
          data-testid="social-view-calendar"
          @click="viewMode = 'calendar'"
        >
          Kalender
        </button>
      </div>

      <select
        v-model="platformFilter"
        class="rounded-card border border-subtle bg-surface-elevated px-md py-sm text-body-regular"
        data-testid="social-platform-filter"
        aria-label="Nach Plattform filtern"
      >
        <option value="">Alle Plattformen</option>
        <option v-for="p in SOCIAL_PLATFORMS" :key="p" :value="p">
          {{ SOCIAL_PLATFORM_LABELS[p] }}
        </option>
      </select>

      <select
        v-model="statusFilter"
        class="rounded-card border border-subtle bg-surface-elevated px-md py-sm text-body-regular"
        data-testid="social-status-filter"
        aria-label="Nach Status filtern"
      >
        <option value="">Alle Status</option>
        <option v-for="s in SOCIAL_POST_STATUSES" :key="s" :value="s">
          {{ SOCIAL_POST_STATUS_LABELS[s] }}
        </option>
      </select>

      <input
        v-model="search"
        type="search"
        placeholder="Suche: Caption, Produkt, ID"
        class="min-w-56 rounded-card border border-subtle bg-surface-elevated px-md py-sm text-body-regular placeholder:text-secondary"
        data-testid="social-search"
        aria-label="Posts durchsuchen"
      />

      <PsButton
        v-if="auth.can('social-posts:write')"
        variant="ghost"
        size="sm"
        :disabled="busy"
        data-testid="social-run-scheduler"
        @click="runScheduler"
      >
        Fällige Posts jetzt veröffentlichen
      </PsButton>
    </div>

    <PsSocialPostList
      v-if="viewMode === 'list'"
      :posts="items"
      :busy="busy"
      @open="openPost"
      @retry="retryPost"
      @remove="confirmDelete"
    />
    <PsSocialPostCalendar v-else :posts="items" @open="openPost" />

    <PsDialog
      v-model:open="deleteDialogOpen"
      title="Post löschen?"
      description="Der Post wird endgültig entfernt. Veröffentlichte Posts können nicht gelöscht werden."
    >
      <div class="flex justify-end gap-sm">
        <PsButton variant="ghost" data-testid="social-delete-cancel" @click="deleteDialogOpen = false">
          Abbrechen
        </PsButton>
        <PsButton variant="danger" :disabled="busy" data-testid="social-delete-confirm" @click="deletePost">
          Löschen
        </PsButton>
      </div>
    </PsDialog>
  </div>
</template>
