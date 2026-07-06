<script setup lang="ts">
import type { TicketCategory, TicketPriority, TicketStatus } from '@print-shop/types'
import { TICKET_PRIORITIES, TICKET_STATUSES } from '@print-shop/types'
import { PsAdminTable, PsTicketPriorityBadge, PsTicketStatusBadge } from '@print-shop/ui'

definePageMeta({ layout: 'admin', middleware: 'admin-auth' })

const auth = useAdminAuthStore()

interface AdminTicketRow {
  id: string
  ticketNumber: string
  subject: string
  name: string
  email: string
  status: TicketStatus
  priority: TicketPriority
  category: TicketCategory
  createdAt: string
  order: { orderNumber: string } | null
  assignedTo: { id: string; name: string } | null
  _count: { messages: number }
}

const statusFilter = ref('')
const priorityFilter = ref('')
const onlyMine = ref(false)

const { data, refresh } = await useFetch<{ tickets: AdminTicketRow[] }>('/api/admin/tickets', {
  credentials: 'include',
  server: false,
  query: computed(() => ({
    ...(statusFilter.value ? { status: statusFilter.value } : {}),
    ...(priorityFilter.value ? { priority: priorityFilter.value } : {}),
    ...(onlyMine.value && auth.user ? { assignedToId: auth.user.id } : {}),
  })),
})
watch([statusFilter, priorityFilter, onlyMine], () => refresh())

const columns = [
  { key: 'ticketNumber', label: 'Ticket' },
  { key: 'subject', label: 'Betreff' },
  { key: 'category', label: 'Kategorie' },
  { key: 'priority', label: 'Priorität' },
  { key: 'status', label: 'Status' },
  { key: 'assignedTo', label: 'Zugewiesen' },
  { key: 'actions', label: '' },
]
</script>

<template>
  <div data-testid="admin-tickets">
    <div class="mb-lg flex flex-wrap items-center gap-md">
      <select
        v-model="statusFilter"
        class="rounded-card border border-subtle bg-surface-elevated px-md py-sm text-body-regular"
        data-testid="ticket-status-filter"
      >
        <option value="">Alle Status</option>
        <option v-for="s in TICKET_STATUSES" :key="s" :value="s">{{ s }}</option>
      </select>
      <select
        v-model="priorityFilter"
        class="rounded-card border border-subtle bg-surface-elevated px-md py-sm text-body-regular"
        data-testid="ticket-priority-filter"
      >
        <option value="">Alle Prioritäten</option>
        <option v-for="p in TICKET_PRIORITIES" :key="p" :value="p">{{ p }}</option>
      </select>
      <label class="flex cursor-pointer items-center gap-sm text-body-regular">
        <input v-model="onlyMine" type="checkbox" data-testid="ticket-filter-mine" />
        Nur meine Tickets
      </label>
    </div>

    <PsAdminTable :columns="columns" :rows="data?.tickets ?? []" empty="Keine Tickets">
      <template #cell-subject="{ row }">
        <div>
          <p>{{ (row as unknown as AdminTicketRow).subject }}</p>
          <p class="text-caption text-secondary">
            {{ (row as unknown as AdminTicketRow).name }} ·
            {{ (row as unknown as AdminTicketRow)._count.messages }} Nachricht(en)
            <template v-if="(row as unknown as AdminTicketRow).order">
              · {{ (row as unknown as AdminTicketRow).order!.orderNumber }}
            </template>
          </p>
        </div>
      </template>
      <template #cell-priority="{ row }">
        <PsTicketPriorityBadge :priority="(row as unknown as AdminTicketRow).priority" />
      </template>
      <template #cell-status="{ row }">
        <PsTicketStatusBadge :status="(row as unknown as AdminTicketRow).status" />
      </template>
      <template #cell-assignedTo="{ row }">
        <span class="text-body-regular text-secondary">
          {{ (row as unknown as AdminTicketRow).assignedTo?.name ?? '—' }}
        </span>
      </template>
      <template #cell-actions="{ row }">
        <NuxtLink
          :to="`/admin/tickets/${(row as unknown as AdminTicketRow).id}`"
          class="text-caption text-brand hover:underline"
          data-testid="ticket-detail-link"
          >Öffnen</NuxtLink
        >
      </template>
    </PsAdminTable>
  </div>
</template>
