<script setup lang="ts">
// Notice strip above the header, managed in admin (Einstellungen → Info-Banner).
// The API returns null when it is switched off. Fetched during SSR so it never pops in late.
const { locale } = useI18n()
const { data } = await useFetch<{ text: Record<string, string> | null }>('/api/info-banner', {
  key: 'info-banner',
})

const message = computed(() => {
  const text = data.value?.text
  return text ? text[locale.value] || text.de || '' : ''
})
</script>

<template>
  <div
    v-if="message"
    role="status"
    class="bg-mirror px-4 py-2 text-center text-sm text-on-mirror"
    data-testid="info-banner"
  >
    {{ message }}
  </div>
</template>
