import { ORDER_STATUSES } from '@print-shop/types'
import type { Meta, StoryObj } from '@storybook/vue3-vite'
import PsOrderStatusBadge from './PsOrderStatusBadge.vue'

const meta: Meta<typeof PsOrderStatusBadge> = {
  title: 'Shop/OrderStatusBadge',
  component: PsOrderStatusBadge,
  args: { status: 'in_production', label: 'In Produktion' },
  argTypes: {
    status: { control: 'select', options: [...ORDER_STATUSES] },
  },
  render: (args) => ({
    components: { PsOrderStatusBadge },
    setup: () => ({ args }),
    template: '<PsOrderStatusBadge v-bind="args" />',
  }),
}
export default meta
type Story = StoryObj<typeof PsOrderStatusBadge>

export const Default: Story = {}
export const FallbackLabel: Story = { args: { status: 'shipped', label: undefined } }

export const AllStatuses: Story = {
  render: () => ({
    components: { PsOrderStatusBadge },
    setup: () => {
      const labels: Record<string, string> = {
        pending: 'Offen',
        awaiting_payment: 'Wartet auf Zahlung',
        awaiting_bank_transfer: 'Wartet auf Überweisung',
        paid: 'Bezahlt',
        in_production: 'In Produktion',
        quality_check: 'Qualitätsprüfung',
        ready_to_ship: 'Versandbereit',
        shipped: 'Versendet',
        completed: 'Abgeschlossen',
        cancelled: 'Storniert',
        refunded: 'Erstattet',
      }
      return { statuses: ORDER_STATUSES, labels }
    },
    template: `
      <div class="flex max-w-[32rem] flex-wrap gap-sm">
        <PsOrderStatusBadge
          v-for="status in statuses"
          :key="status"
          :status="status"
          :label="labels[status]"
        />
      </div>
    `,
  }),
}
