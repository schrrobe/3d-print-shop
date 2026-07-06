import { TICKET_STATUSES } from '@print-shop/types'
import type { Meta, StoryObj } from '@storybook/vue3-vite'
import PsTicketStatusBadge from './PsTicketStatusBadge.vue'

const meta: Meta<typeof PsTicketStatusBadge> = {
  title: 'Support/TicketStatusBadge',
  component: PsTicketStatusBadge,
  args: { status: 'open', label: 'Offen' },
  argTypes: {
    status: { control: 'select', options: [...TICKET_STATUSES] },
  },
  render: (args) => ({
    components: { PsTicketStatusBadge },
    setup: () => ({ args }),
    template: '<PsTicketStatusBadge v-bind="args" />',
  }),
}
export default meta
type Story = StoryObj<typeof PsTicketStatusBadge>

export const Default: Story = {}
export const FallbackLabel: Story = { args: { status: 'resolved', label: undefined } }

export const AllStatuses: Story = {
  render: () => ({
    components: { PsTicketStatusBadge },
    setup: () => {
      const labels: Record<string, string> = {
        open: 'Offen',
        in_progress: 'In Bearbeitung',
        waiting_customer: 'Wartet auf Kunde',
        resolved: 'Gelöst',
        closed: 'Geschlossen',
      }
      return { statuses: TICKET_STATUSES, labels }
    },
    template: `
      <div class="flex max-w-[32rem] flex-wrap gap-sm">
        <PsTicketStatusBadge
          v-for="status in statuses"
          :key="status"
          :status="status"
          :label="labels[status]"
        />
      </div>
    `,
  }),
}
