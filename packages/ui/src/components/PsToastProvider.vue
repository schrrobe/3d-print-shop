<script setup lang="ts">
import { ToastDescription, ToastProvider, ToastRoot, ToastViewport } from 'radix-vue'
import { useToast, type ToastItem } from '../composables/useToast.js'

const { toasts, dismiss } = useToast()

function variantClass(toast: ToastItem): string {
  return {
    default: 'border-subtle',
    success: 'border-brand',
    error: 'border-red-500',
  }[toast.variant]
}

function onOpenChange(open: boolean, toast: ToastItem): void {
  if (!open) dismiss(toast.id)
}
</script>

<template>
  <ToastProvider>
    <slot />
    <ToastRoot
      v-for="toast in toasts"
      :key="toast.id"
      :duration="toast.durationMs"
      class="flex items-center justify-between gap-md rounded-card border bg-surface-elevated p-md text-body-regular text-primary shadow-card"
      :class="variantClass(toast)"
      data-testid="toast"
      :data-variant="toast.variant"
      @update:open="(open: boolean) => onOpenChange(open, toast)"
    >
      <ToastDescription>{{ toast.message }}</ToastDescription>
      <button
        type="button"
        class="cursor-pointer rounded-full-pill p-xs text-secondary hover:bg-surface hover:text-primary focus-visible:outline-2 focus-visible:outline-brand"
        aria-label="Schließen"
        @click="dismiss(toast.id)"
      >
        ✕
      </button>
    </ToastRoot>
    <ToastViewport
      class="fixed bottom-md right-md z-50 flex w-80 max-w-[calc(100vw-32px)] flex-col gap-sm outline-none"
    />
  </ToastProvider>
</template>
