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
}>()
</script>

<template>
  <AccordionRoot type="single" collapsible class="w-full">
    <AccordionItem
      v-for="item in items"
      :key="item.value"
      :value="item.value"
      class="border-b border-subtle"
    >
      <AccordionHeader class="flex">
        <AccordionTrigger
          class="group flex flex-1 cursor-pointer items-center justify-between gap-md py-md text-left text-label-medium text-primary transition-colors hover:text-brand focus-visible:outline-2 focus-visible:outline-brand"
        >
          {{ item.title }}
          <span
            class="text-secondary transition-transform duration-200 group-data-[state=open]:rotate-180"
            aria-hidden="true"
            >▾</span
          >
        </AccordionTrigger>
      </AccordionHeader>
      <AccordionContent class="overflow-hidden pb-md text-body-regular text-secondary">
        <slot :name="item.value">{{ item.content }}</slot>
      </AccordionContent>
    </AccordionItem>
  </AccordionRoot>
</template>
