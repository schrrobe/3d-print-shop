<script setup lang="ts">
import {
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogOverlay,
  DialogPortal,
  DialogRoot,
  DialogTitle,
  DialogTrigger,
} from 'radix-vue'

defineProps<{ title: string; description?: string }>()
const open = defineModel<boolean>('open', { default: false })
</script>

<template>
  <DialogRoot v-model:open="open">
    <DialogTrigger v-if="$slots.trigger" as-child>
      <slot name="trigger" />
    </DialogTrigger>
    <DialogPortal>
      <DialogOverlay class="fixed inset-0 z-40 bg-overlay data-[state=open]:animate-[fade-in_150ms]" />
      <DialogContent
        class="fixed left-1/2 top-1/2 z-50 max-h-[85vh] w-[90vw] max-w-[32rem] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-card border border-subtle bg-surface-elevated p-lg shadow-card focus:outline-none"
      >
        <DialogTitle class="text-subheading text-primary">{{ title }}</DialogTitle>
        <DialogDescription v-if="description" class="mt-sm text-body-regular text-secondary">
          {{ description }}
        </DialogDescription>
        <div class="mt-md">
          <slot />
        </div>
        <DialogClose
          class="absolute right-md top-md cursor-pointer rounded-full-pill p-xs text-secondary hover:bg-surface hover:text-primary"
          aria-label="Close"
        >
          ✕
        </DialogClose>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>
