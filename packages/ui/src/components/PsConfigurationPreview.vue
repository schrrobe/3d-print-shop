<script lang="ts">
export interface ConfigurationZone {
  slot: string
  label: string
  colorName: string
  hex: string
  unavailable?: boolean
}
</script>

<script setup lang="ts">
withDefaults(
  defineProps<{
    zones: ConfigurationZone[]
    compact?: boolean
    /** Accessible label for unavailable colors (i18n via prop). */
    unavailableLabel?: string
  }>(),
  { unavailableLabel: 'nicht verfügbar' },
)
</script>

<template>
  <div
    class="flex flex-wrap items-center"
    :class="compact ? 'gap-xs' : 'gap-lg'"
    data-testid="configuration-preview"
  >
    <div
      v-for="zone in zones"
      :key="zone.slot"
      class="flex items-center gap-sm"
      :data-slot="zone.slot"
    >
      <span
        class="relative inline-flex shrink-0 overflow-hidden rounded-full-pill border-2 border-subtle"
        :class="[compact ? 'size-6' : 'size-9', zone.unavailable ? 'opacity-40' : '']"
        :style="{ backgroundColor: zone.hex }"
        :title="compact ? `${zone.label}: ${zone.colorName}` : undefined"
      >
        <span
          v-if="zone.unavailable"
          class="absolute left-1/2 top-1/2 h-0.5 w-[140%] -translate-x-1/2 -translate-y-1/2 rotate-45 bg-red-500"
          aria-hidden="true"
        />
      </span>
      <template v-if="!compact">
        <span class="flex flex-col">
          <span class="text-caption text-secondary">{{ zone.label }}</span>
          <span class="text-label-medium text-primary">{{ zone.colorName }}</span>
        </span>
        <svg
          v-if="zone.unavailable"
          role="img"
          :aria-label="unavailableLabel"
          viewBox="0 0 24 24"
          class="size-5 shrink-0 text-amber-500"
          fill="currentColor"
        >
          <path d="M12 2 1 21h22L12 2zm1 14h-2v2h2v-2zm0-7h-2v5h2V9z" />
        </svg>
      </template>
      <span v-else-if="zone.unavailable" class="sr-only">{{ unavailableLabel }}</span>
    </div>
  </div>
</template>
