<script setup lang="ts">
import {
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuRoot,
  DropdownMenuTrigger,
} from 'radix-vue'

defineProps<{
  items: { key: string; label: string; danger?: boolean; disabled?: boolean }[]
}>()

const emit = defineEmits<{ select: [key: string] }>()
</script>

<template>
  <DropdownMenuRoot>
    <DropdownMenuTrigger as-child>
      <slot name="trigger" />
    </DropdownMenuTrigger>
    <DropdownMenuPortal>
      <DropdownMenuContent
        class="z-50 min-w-40 rounded-card border border-subtle bg-surface-elevated p-xs shadow-card"
        :side-offset="4"
        align="start"
      >
        <DropdownMenuItem
          v-for="item in items"
          :key="item.key"
          :disabled="item.disabled"
          class="flex cursor-pointer items-center rounded-card px-md py-sm text-body-regular outline-none data-[disabled]:cursor-not-allowed data-[disabled]:opacity-40"
          :class="
            item.danger
              ? 'text-red-500 data-[highlighted]:bg-red-500/15'
              : 'text-primary data-[highlighted]:bg-brand data-[highlighted]:text-on-brand'
          "
          @select="emit('select', item.key)"
        >
          {{ item.label }}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenuPortal>
  </DropdownMenuRoot>
</template>
