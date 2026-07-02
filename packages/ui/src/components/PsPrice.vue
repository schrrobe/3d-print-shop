<script setup lang="ts">
import type { Locale } from '@print-shop/types'
import { formatCents } from '@print-shop/utils'
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{ cents: number; locale?: Locale; size?: 'sm' | 'md' | 'lg' }>(),
  { locale: 'de', size: 'md' },
)

const formatted = computed(() => formatCents(props.cents, props.locale))
const sizeClass = computed(
  () => ({ sm: 'text-caption', md: 'text-label-medium', lg: 'text-subheading' })[props.size],
)
</script>

<template>
  <span :class="sizeClass" class="font-semibold tabular-nums" data-testid="price">
    {{ formatted }}
  </span>
</template>
