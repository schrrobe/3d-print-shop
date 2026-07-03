<script setup lang="ts">
import PsCard from './PsCard.vue'
import PsConfigurationPreview, { type ConfigurationZone } from './PsConfigurationPreview.vue'

defineProps<{
  productName: string
  zones: ConfigurationZone[]
  dateLabel?: string
  shareUrl?: string | null
}>()
</script>

<template>
  <PsCard data-testid="saved-configuration-card">
    <div class="flex flex-col gap-md">
      <header class="flex flex-wrap items-baseline justify-between gap-sm">
        <h3 class="text-label-medium font-semibold text-primary">{{ productName }}</h3>
        <span v-if="dateLabel" class="text-caption text-secondary">{{ dateLabel }}</span>
      </header>
      <PsConfigurationPreview :zones="zones" />
      <a
        v-if="shareUrl"
        :href="shareUrl"
        class="break-all text-caption text-brand underline-offset-2 hover:underline"
        data-testid="saved-configuration-share-link"
      >
        {{ shareUrl }}
      </a>
      <footer v-if="$slots.actions" class="flex flex-wrap items-center gap-sm">
        <slot name="actions" />
      </footer>
    </div>
  </PsCard>
</template>
