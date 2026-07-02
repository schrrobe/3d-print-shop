<script setup lang="ts">
import { TabsContent, TabsList, TabsRoot, TabsTrigger } from 'radix-vue'

defineProps<{
  tabs: { value: string; label: string }[]
}>()

const model = defineModel<string>()
</script>

<template>
  <TabsRoot v-model="model">
    <TabsList
      class="inline-flex items-center gap-xs rounded-full-pill border border-subtle bg-surface-elevated p-xs"
      aria-label="Tabs"
    >
      <TabsTrigger
        v-for="tab in tabs"
        :key="tab.value"
        :value="tab.value"
        class="cursor-pointer rounded-full-pill px-md py-sm text-caption text-primary transition-colors focus-visible:outline-2 focus-visible:outline-brand data-[state=active]:bg-brand data-[state=active]:text-on-brand data-[state=inactive]:hover:bg-surface"
      >
        {{ tab.label }}
      </TabsTrigger>
    </TabsList>
    <TabsContent
      v-for="tab in tabs"
      :key="tab.value"
      :value="tab.value"
      class="mt-md focus-visible:outline-2 focus-visible:outline-brand"
    >
      <slot :name="tab.value" />
    </TabsContent>
  </TabsRoot>
</template>
