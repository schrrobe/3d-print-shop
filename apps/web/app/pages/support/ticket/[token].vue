<script setup lang="ts">
import type { TicketDto, TicketStatus } from '@print-shop/types'
import { PsBadge, PsPillButton, PsSection, PsTextarea } from '@print-shop/ui'

/** Public ticket thread — the customer reads staff replies and answers via token. */
const { t, locale } = useI18n()
const route = useRoute()
// Private token URL — must never end up in a search index
useHead({ meta: [{ name: 'robots', content: 'noindex, nofollow' }] })

const token = String(route.params.token)

const { data, error, refresh } = await useFetch<{ ticket: TicketDto }>(`/api/tickets/${token}`)
if (error.value) {
  throw createError({ statusCode: 404, statusMessage: 'Ticket not found' })
}

const ticket = computed(() => data.value!.ticket)

const statusVariant: Record<TicketStatus, 'default' | 'brand' | 'warning' | 'info'> = {
  open: 'warning',
  in_progress: 'info',
  waiting_customer: 'warning',
  resolved: 'brand',
  closed: 'default',
}

const reply = ref('')
const submitting = ref(false)
const hydrated = ref(false)
onMounted(() => {
  hydrated.value = true
})
const errorMessage = ref('')

async function sendReply() {
  submitting.value = true
  errorMessage.value = ''
  try {
    await $fetch(`/api/tickets/${token}/messages`, {
      method: 'POST',
      body: { body: reply.value },
    })
    reply.value = ''
    await refresh()
  } catch (err) {
    errorMessage.value = t('common.error')
    console.error(err)
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <PsSection :title="t('support.ticket.title')">
    <div class="mx-auto max-w-[42rem]" data-testid="ticket-page">
      <div class="flex flex-wrap items-center justify-between gap-md">
        <div>
          <h2 class="text-heading-small">{{ ticket.subject }}</h2>
          <p class="mt-xs text-caption text-secondary">
            {{ ticket.ticketNumber }}
            <template v-if="ticket.orderNumber"> · {{ ticket.orderNumber }}</template>
            · {{ new Date(ticket.createdAt).toLocaleDateString(locale) }}
          </p>
        </div>
        <PsBadge :variant="statusVariant[ticket.status]" data-testid="ticket-status">
          {{ t(`support.ticket.status.${ticket.status}`) }}
        </PsBadge>
      </div>

      <div class="mt-xl flex flex-col gap-md">
        <div
          v-for="message in ticket.messages"
          :key="message.id"
          class="rounded-card border border-subtle p-lg"
          :class="message.authorType === 'staff' ? 'bg-surface-elevated' : 'bg-surface'"
          data-testid="ticket-message"
        >
          <p class="text-caption text-secondary">
            {{
              message.authorType === 'staff'
                ? `${t('support.ticket.team')}${message.authorName ? ` · ${message.authorName}` : ''}`
                : t('support.ticket.you')
            }}
            · {{ new Date(message.createdAt).toLocaleString(locale) }}
          </p>
          <p class="mt-sm text-body-regular whitespace-pre-line">{{ message.body }}</p>
        </div>
      </div>

      <p
        v-if="ticket.status === 'closed'"
        class="mt-xl rounded-card border border-subtle bg-surface-elevated p-lg text-body-regular text-secondary"
        data-testid="ticket-closed-note"
      >
        {{ t('support.ticket.closedNote') }}
      </p>

      <form v-else class="mt-xl flex flex-col gap-md" @submit.prevent="sendReply">
        <PsTextarea
          v-model="reply"
          :label="t('support.ticket.reply')"
          name="reply"
          required
          :rows="4"
          data-testid="ticket-reply-input"
        />
        <p v-if="errorMessage" class="text-caption text-red-500" role="alert">{{ errorMessage }}</p>
        <PsPillButton
          type="submit"
          :disabled="submitting || !hydrated || reply.trim().length === 0"
          data-testid="ticket-reply-submit"
        >
          {{ t('support.ticket.send') }}
        </PsPillButton>
      </form>
    </div>
  </PsSection>
</template>
