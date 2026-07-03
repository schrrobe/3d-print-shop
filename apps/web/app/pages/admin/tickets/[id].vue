<script setup lang="ts">
import type { TicketCategory, TicketPriority, TicketStatus } from '@print-shop/types'
import { TICKET_CATEGORIES, TICKET_PRIORITIES } from '@print-shop/types'
import { TICKET_STATUS_TRANSITIONS } from '@print-shop/utils'
import { PsBadge, PsButton, PsCard, PsSelect, PsTextarea, useToast } from '@print-shop/ui'

definePageMeta({ layout: 'admin', middleware: 'admin-auth' })

const route = useRoute()
const toast = useToast()
const auth = useAdminAuthStore()
const ticketId = String(route.params.id)

interface AdminTicketDetail {
  id: string
  ticketNumber: string
  subject: string
  name: string
  email: string
  locale: string
  status: TicketStatus
  priority: TicketPriority
  category: TicketCategory
  createdAt: string
  order: { id: string; orderNumber: string; status: string } | null
  assignedTo: { id: string; name: string } | null
  messages: {
    id: string
    authorType: 'customer' | 'staff'
    body: string
    createdAt: string
    user: { name: string } | null
  }[]
}

const { data, refresh } = await useFetch<{ ticket: AdminTicketDetail }>(
  `/api/admin/tickets/${ticketId}`,
  { credentials: 'include', server: false },
)
const { data: assigneeData } = await useFetch<{ users: { id: string; name: string }[] }>(
  '/api/admin/tickets/assignees',
  { credentials: 'include', server: false },
)

const ticket = computed(() => data.value?.ticket)
const nextStatuses = computed(() =>
  ticket.value ? TICKET_STATUS_TRANSITIONS[ticket.value.status] : [],
)
const assigneeOptions = computed(() => [
  { value: '', label: '— Niemand —' },
  ...(assigneeData.value?.users ?? []).map((u) => ({ value: u.id, label: u.name })),
])

const statusVariant: Record<TicketStatus, 'default' | 'brand' | 'warning' | 'info'> = {
  open: 'warning',
  in_progress: 'info',
  waiting_customer: 'warning',
  resolved: 'brand',
  closed: 'default',
}

const reply = ref('')
const submitting = ref(false)

async function sendReply() {
  submitting.value = true
  try {
    await $fetch(`/api/admin/tickets/${ticketId}/messages`, {
      method: 'POST',
      body: { body: reply.value },
      credentials: 'include',
    })
    reply.value = ''
    toast.show('Antwort gesendet', { variant: 'success' })
    await refresh()
  } catch {
    toast.show('Antwort fehlgeschlagen', { variant: 'error' })
  } finally {
    submitting.value = false
  }
}

async function setStatus(status: TicketStatus) {
  try {
    await $fetch(`/api/admin/tickets/${ticketId}/status`, {
      method: 'POST',
      body: { status },
      credentials: 'include',
    })
    toast.show(`Status → ${status}`, { variant: 'success' })
    await refresh()
  } catch {
    toast.show('Statuswechsel fehlgeschlagen', { variant: 'error' })
  }
}

async function update(patch: { priority?: string; category?: string; assignedToId?: string | null }) {
  try {
    await $fetch(`/api/admin/tickets/${ticketId}`, {
      method: 'PATCH',
      body: patch,
      credentials: 'include',
    })
    toast.show('Ticket aktualisiert', { variant: 'success' })
    await refresh()
  } catch {
    toast.show('Aktualisierung fehlgeschlagen', { variant: 'error' })
  }
}
</script>

<template>
  <div v-if="ticket" class="flex flex-col gap-lg" data-testid="admin-ticket-detail">
    <div class="flex flex-wrap items-center gap-md">
      <h2 class="text-heading-small">{{ ticket.ticketNumber }}</h2>
      <PsBadge :variant="statusVariant[ticket.status]" data-testid="admin-ticket-status">
        {{ ticket.status }}
      </PsBadge>
      <PsBadge v-if="ticket.priority !== 'normal'" :variant="ticket.priority === 'urgent' ? 'danger' : 'warning'">
        {{ ticket.priority }}
      </PsBadge>
    </div>

    <div class="grid gap-lg lg:grid-cols-[2fr_1fr]">
      <div class="flex flex-col gap-lg">
        <PsCard>
          <h3 class="text-label-medium">{{ ticket.subject }}</h3>
          <div class="mt-md flex flex-col gap-md">
            <div
              v-for="message in ticket.messages"
              :key="message.id"
              class="rounded-card border border-subtle p-md"
              :class="message.authorType === 'staff' ? 'bg-surface' : 'bg-surface-elevated'"
              data-testid="admin-ticket-message"
            >
              <p class="text-caption text-secondary">
                {{
                  message.authorType === 'staff'
                    ? `Team${message.user ? ` · ${message.user.name}` : ''}`
                    : `Kunde · ${ticket.name}`
                }}
                · {{ new Date(message.createdAt).toLocaleString('de') }}
              </p>
              <p class="mt-sm text-body-regular whitespace-pre-line">{{ message.body }}</p>
            </div>
          </div>
        </PsCard>

        <PsCard v-if="auth.can('tickets:write') && ticket.status !== 'closed'">
          <h3 class="text-label-medium">Antworten</h3>
          <form class="mt-md flex flex-col gap-md" @submit.prevent="sendReply">
            <PsTextarea v-model="reply" label="Antwort an den Kunden" name="reply" required :rows="4" data-testid="admin-ticket-reply" />
            <PsButton type="submit" :disabled="submitting || reply.trim().length === 0" data-testid="admin-ticket-reply-submit">
              Antwort senden
            </PsButton>
          </form>
        </PsCard>
      </div>

      <div class="flex flex-col gap-lg">
        <PsCard>
          <h3 class="text-label-medium">Kunde</h3>
          <p class="mt-md text-body-regular">{{ ticket.name }}</p>
          <p class="text-body-regular text-secondary">{{ ticket.email }}</p>
          <p class="mt-sm text-caption text-secondary">
            Kategorie: {{ ticket.category }} · Sprache: {{ ticket.locale }} ·
            {{ new Date(ticket.createdAt).toLocaleDateString('de') }}
          </p>
          <p v-if="ticket.order" class="mt-md text-body-regular">
            Bestellung:
            <NuxtLink :to="`/admin/orders/${ticket.order.id}`" class="text-brand hover:underline" data-testid="ticket-order-link">
              {{ ticket.order.orderNumber }}
            </NuxtLink>
          </p>
        </PsCard>

        <PsCard v-if="auth.can('tickets:write')">
          <h3 class="text-label-medium">Aktionen</h3>
          <div class="mt-md flex flex-wrap gap-sm">
            <PsButton
              v-for="status in nextStatuses"
              :key="status"
              variant="secondary"
              size="sm"
              :data-testid="`ticket-status-${status}`"
              @click="setStatus(status)"
            >
              → {{ status }}
            </PsButton>
          </div>
          <div class="mt-lg flex flex-col gap-md border-t border-subtle pt-lg">
            <PsSelect
              :model-value="ticket.priority"
              label="Priorität"
              :options="TICKET_PRIORITIES.map((p) => ({ value: p, label: p }))"
              @update:model-value="update({ priority: $event })"
            />
            <PsSelect
              :model-value="ticket.category"
              label="Kategorie"
              :options="TICKET_CATEGORIES.map((c) => ({ value: c, label: c }))"
              @update:model-value="update({ category: $event })"
            />
            <PsSelect
              :model-value="ticket.assignedTo?.id ?? ''"
              label="Zugewiesen an"
              :options="assigneeOptions"
              data-testid="ticket-assignee"
              @update:model-value="update({ assignedToId: $event || null })"
            />
          </div>
        </PsCard>
      </div>
    </div>
  </div>
</template>
