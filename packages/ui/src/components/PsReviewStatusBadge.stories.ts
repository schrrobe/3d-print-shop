import { REVIEW_STATUSES } from '@print-shop/types'
import type { Meta, StoryObj } from '@storybook/vue3-vite'
import PsReviewStatusBadge from './PsReviewStatusBadge.vue'

const meta: Meta<typeof PsReviewStatusBadge> = {
  title: 'Shop/ReviewStatusBadge',
  component: PsReviewStatusBadge,
  args: { status: 'pending', label: 'Ausstehend' },
  argTypes: {
    status: { control: 'select', options: [...REVIEW_STATUSES] },
  },
  render: (args) => ({
    components: { PsReviewStatusBadge },
    setup: () => ({ args }),
    template: '<PsReviewStatusBadge v-bind="args" />',
  }),
}
export default meta
type Story = StoryObj<typeof PsReviewStatusBadge>

export const Default: Story = {}
export const FallbackLabel: Story = { args: { status: 'approved', label: undefined } }

export const AllStatuses: Story = {
  render: () => ({
    components: { PsReviewStatusBadge },
    setup: () => {
      const labels: Record<string, string> = {
        pending: 'Ausstehend',
        approved: 'Freigegeben',
        rejected: 'Abgelehnt',
        hidden: 'Ausgeblendet',
      }
      return { statuses: REVIEW_STATUSES, labels }
    },
    template: `
      <div class="flex max-w-[32rem] flex-wrap gap-sm">
        <PsReviewStatusBadge
          v-for="status in statuses"
          :key="status"
          :status="status"
          :label="labels[status]"
        />
      </div>
    `,
  }),
}
