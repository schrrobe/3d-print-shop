import { SHIPMENT_STATUSES } from '@print-shop/types'
import type { Meta, StoryObj } from '@storybook/vue3-vite'
import PsShipmentStatusBadge from './PsShipmentStatusBadge.vue'

const meta: Meta<typeof PsShipmentStatusBadge> = {
  title: 'Admin/ShipmentStatusBadge',
  component: PsShipmentStatusBadge,
  args: { status: 'ready_for_shipping' },
  argTypes: {
    status: { control: 'select', options: [...SHIPMENT_STATUSES] },
  },
  render: (args) => ({
    components: { PsShipmentStatusBadge },
    setup: () => ({ args }),
    template: '<PsShipmentStatusBadge v-bind="args" />',
  }),
}
export default meta
type Story = StoryObj<typeof PsShipmentStatusBadge>

export const Default: Story = {}

export const AllStatuses: Story = {
  render: () => ({
    components: { PsShipmentStatusBadge },
    setup: () => ({ statuses: SHIPMENT_STATUSES }),
    template: `
      <div class="flex max-w-[32rem] flex-wrap gap-sm">
        <PsShipmentStatusBadge v-for="status in statuses" :key="status" :status="status" />
      </div>
    `,
  }),
}
