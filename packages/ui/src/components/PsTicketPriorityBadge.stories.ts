import { TICKET_PRIORITIES } from '@print-shop/types'
import type { Meta, StoryObj } from '@storybook/vue3-vite'
import PsTicketPriorityBadge from './PsTicketPriorityBadge.vue'

const meta: Meta<typeof PsTicketPriorityBadge> = {
  title: 'Support/TicketPriorityBadge',
  component: PsTicketPriorityBadge,
  args: { priority: 'normal', label: 'Normal' },
  argTypes: {
    priority: { control: 'select', options: [...TICKET_PRIORITIES] },
  },
  render: (args) => ({
    components: { PsTicketPriorityBadge },
    setup: () => ({ args }),
    template: '<PsTicketPriorityBadge v-bind="args" />',
  }),
}
export default meta
type Story = StoryObj<typeof PsTicketPriorityBadge>

export const Default: Story = {}
export const FallbackLabel: Story = { args: { priority: 'urgent', label: undefined } }

export const AllPriorities: Story = {
  render: () => ({
    components: { PsTicketPriorityBadge },
    setup: () => {
      const labels: Record<string, string> = {
        low: 'Niedrig',
        normal: 'Normal',
        high: 'Hoch',
        urgent: 'Dringend',
      }
      return { priorities: TICKET_PRIORITIES, labels }
    },
    template: `
      <div class="flex max-w-[32rem] flex-wrap gap-sm">
        <PsTicketPriorityBadge
          v-for="priority in priorities"
          :key="priority"
          :priority="priority"
          :label="labels[priority]"
        />
      </div>
    `,
  }),
}
