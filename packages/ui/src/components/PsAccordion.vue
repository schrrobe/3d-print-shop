<script setup lang="ts">
import {
  AccordionContent,
  AccordionHeader,
  AccordionItem,
  AccordionRoot,
  AccordionTrigger,
} from 'radix-vue'

defineProps<{
  items: { value: string; title: string; content: string }[]
  defaultValue?: string
}>()

const model = defineModel<string | undefined>()
</script>

<template>
  <AccordionRoot
    v-model="model"
    type="single"
    collapsible
    class="w-full"
    :default-value="defaultValue"
  >
    <AccordionItem
      v-for="item in items"
      :key="item.value"
      :value="item.value"
      class="border-b border-subtle"
    >
      <AccordionHeader class="flex">
        <AccordionTrigger
          class="group flex min-h-14 flex-1 cursor-pointer items-center justify-between gap-md rounded-card px-md py-lg text-left text-heading-small text-primary transition-colors hover:bg-surface-elevated hover:text-brand focus-visible:outline-2 focus-visible:outline-brand"
        >
          {{ item.title }}
          <div
            class="grid size-8 place-items-center rounded-full border border-subtle bg-surface-elevated text-secondary transition-transform duration-200 group-data-[state=open]:rotate-180"
            aria-hidden="true"
          >
            <svg
              class="size-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
          </div>
        </AccordionTrigger>
      </AccordionHeader>
      <AccordionContent class="overflow-hidden pb-md text-body-regular text-secondary">
        <slot :name="item.value">{{ item.content }}</slot>
      </AccordionContent>
    </AccordionItem>
  </AccordionRoot>
</template>
