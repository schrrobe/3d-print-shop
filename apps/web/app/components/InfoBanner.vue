<script setup lang="ts">
// Notice strip above the header, managed in admin (Einstellungen → Info-Banner).
// The API returns null when it is switched off. Fetched during SSR so it never pops in late.
const { locale } = useI18n()
const { data, refresh } = await useFetch<{ text: Record<string, string> | null }>('/api/info-banner', {
  key: 'info-banner',
})

// Keep open sessions within the one-minute update promise in the admin card.
let timer: ReturnType<typeof setInterval> | undefined
onMounted(() => {
  timer = setInterval(refresh, 60_000)
})
onBeforeUnmount(() => clearInterval(timer))

const message = computed(() => {
  const text = data.value?.text
  return text ? text[locale.value] || text.de || '' : ''
})
</script>

<template>
  <div
    v-if="message"
    role="status"
    class="bg-hit px-4 py-2 text-center text-sm text-on-hit"
    data-testid="info-banner"
  >
    {{ message }}
  </div>
</template>
