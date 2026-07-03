import { COMPLAINT_STATUSES } from '@print-shop/types'
import type { Meta, StoryObj } from '@storybook/vue3-vite'
import PsComplaintStatusBadge from './PsComplaintStatusBadge.vue'

const meta: Meta<typeof PsComplaintStatusBadge> = {
  title: 'Admin/ComplaintStatusBadge',
  component: PsComplaintStatusBadge,
  args: { status: 'in_review' },
  argTypes: {
    status: { control: 'select', options: [...COMPLAINT_STATUSES] },
  },
  render: (args) => ({
    components: { PsComplaintStatusBadge },
    setup: () => ({ args }),
    template: '<PsComplaintStatusBadge v-bind="args" />',
  }),
}
export default meta
type Story = StoryObj<typeof PsComplaintStatusBadge>

export const Default: Story = {}

export const AllStatuses: Story = {
  render: () => ({
    components: { PsComplaintStatusBadge },
    setup: () => ({ statuses: COMPLAINT_STATUSES }),
    template: `
      <div class="flex max-w-[32rem] flex-wrap gap-sm">
        <PsComplaintStatusBadge v-for="status in statuses" :key="status" :status="status" />
      </div>
    `,
  }),
}
