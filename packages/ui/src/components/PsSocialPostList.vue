<script setup lang="ts">
import { canDeleteSocialPost, canEditSocialPost } from '@print-shop/utils'
import type { SocialPostItem } from '../social.js'
import { formatSocialDateTime } from '../social.js'
import PsAdminTable from './PsAdminTable.vue'
import PsButton from './PsButton.vue'
import PsSocialPlatformBadge from './PsSocialPlatformBadge.vue'
import PsSocialPostStatusBadge from './PsSocialPostStatusBadge.vue'

/** List view of the planner. Actions respect the status rules (edit/delete only before publish). */
withDefaults(defineProps<{ posts: SocialPostItem[]; busy?: boolean }>(), { busy: false })

const emit = defineEmits<{
  open: [post: SocialPostItem]
  retry: [post: SocialPostItem]
  remove: [post: SocialPostItem]
}>()

const columns = [
  { key: 'platform', label: 'Plattform' },
  { key: 'caption', label: 'Caption' },
  { key: 'scheduledAt', label: 'Geplant für' },
  { key: 'status', label: 'Status' },
  { key: 'actions', label: '' },
]
</script>

<template>
  <div data-testid="social-post-list">
    <PsAdminTable :columns="columns" :rows="posts" empty="Keine Posts gefunden.">
      <template #cell-platform="{ row }">
        <PsSocialPlatformBadge :platform="(row as unknown as SocialPostItem).platform" />
      </template>
      <template #cell-caption="{ row }">
        <div>
          <p class="max-w-96 truncate">{{ (row as unknown as SocialPostItem).caption }}</p>
          <p class="text-caption text-secondary">
            {{ (row as unknown as SocialPostItem).productName ?? '—' }}
            <template v-if="(row as unknown as SocialPostItem).status === 'failed' && (row as unknown as SocialPostItem).errorMessage">
              · <span class="text-red-500">{{ (row as unknown as SocialPostItem).errorMessage }}</span>
            </template>
          </p>
        </div>
      </template>
      <template #cell-scheduledAt="{ row }">
        <span class="whitespace-nowrap text-secondary">
          {{ formatSocialDateTime((row as unknown as SocialPostItem).scheduledAt) }}
        </span>
      </template>
      <template #cell-status="{ row }">
        <PsSocialPostStatusBadge :status="(row as unknown as SocialPostItem).status" />
      </template>
      <template #cell-actions="{ row }">
        <div class="flex items-center justify-end gap-xs">
          <PsButton
            variant="ghost"
            size="sm"
            data-testid="social-post-open"
            @click="emit('open', row as unknown as SocialPostItem)"
          >
            {{ canEditSocialPost((row as unknown as SocialPostItem).status) ? 'Bearbeiten' : 'Ansehen' }}
          </PsButton>
          <PsButton
            v-if="(row as unknown as SocialPostItem).status === 'failed'"
            variant="secondary"
            size="sm"
            :disabled="busy"
            data-testid="social-post-retry"
            @click="emit('retry', row as unknown as SocialPostItem)"
          >
            Erneut planen
          </PsButton>
          <PsButton
            v-if="canDeleteSocialPost((row as unknown as SocialPostItem).status)"
            variant="ghost"
            size="sm"
            :disabled="busy"
            data-testid="social-post-delete"
            @click="emit('remove', row as unknown as SocialPostItem)"
          >
            Löschen
          </PsButton>
        </div>
      </template>
    </PsAdminTable>
  </div>
</template>
