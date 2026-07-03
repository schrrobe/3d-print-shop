<script setup lang="ts">
export interface PsTimelineEntry {
  id: string
  title: string
  timestampLabel?: string
  note?: string | null
  actor?: string | null
}

defineProps<{
  entries: PsTimelineEntry[]
}>()
</script>

<template>
  <div data-testid="timeline">
    <p v-if="entries.length === 0" class="text-caption text-secondary">Keine Einträge</p>
    <ol v-else class="flex flex-col">
      <li
        v-for="(entry, index) in entries"
        :key="entry.id"
        class="relative flex gap-md pb-md last:pb-0"
      >
        <div class="flex flex-col items-center">
          <span
            class="mt-1 size-2.5 shrink-0 rounded-full"
            :class="index === 0 ? 'bg-brand' : 'bg-surface-elevated border border-subtle'"
            aria-hidden="true"
          />
          <span
            v-if="index < entries.length - 1"
            class="w-px flex-1 bg-subtle"
            aria-hidden="true"
          />
        </div>
        <div class="flex min-w-0 flex-col gap-xs pb-xs">
          <div class="flex flex-wrap items-baseline gap-x-sm gap-y-xs">
            <span class="text-label-medium text-primary">{{ entry.title }}</span>
            <span v-if="entry.timestampLabel" class="text-caption text-secondary">
              {{ entry.timestampLabel }}
            </span>
          </div>
          <p v-if="entry.note" class="text-body-regular text-secondary">{{ entry.note }}</p>
          <span v-if="entry.actor" class="text-caption text-secondary">{{ entry.actor }}</span>
        </div>
      </li>
    </ol>
  </div>
</template>
