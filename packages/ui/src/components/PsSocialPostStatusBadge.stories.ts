import { SOCIAL_POST_STATUSES } from '@print-shop/types'
import type { Meta, StoryObj } from '@storybook/vue3-vite'
import PsSocialPostStatusBadge from './PsSocialPostStatusBadge.vue'

const meta: Meta<typeof PsSocialPostStatusBadge> = {
  title: 'Social/SocialPostStatusBadge',
  component: PsSocialPostStatusBadge,
  args: { status: 'scheduled' },
  argTypes: {
    status: { control: 'select', options: [...SOCIAL_POST_STATUSES] },
  },
  render: (args) => ({
    components: { PsSocialPostStatusBadge },
    setup: () => ({ args }),
    template: '<PsSocialPostStatusBadge v-bind="args" />',
  }),
}
export default meta
type Story = StoryObj<typeof PsSocialPostStatusBadge>

export const Entwurf: Story = { args: { status: 'draft' } }
export const Geplant: Story = { args: { status: 'scheduled' } }
export const Veroeffentlicht: Story = { args: { status: 'published' } }
export const Fehlgeschlagen: Story = { args: { status: 'failed' } }

export const AllStatusesDark: Story = {
  globals: { theme: 'dark' },
  render: () => ({
    components: { PsSocialPostStatusBadge },
    setup: () => ({ statuses: SOCIAL_POST_STATUSES }),
    template: `
      <div class="flex max-w-[32rem] flex-wrap gap-sm">
        <PsSocialPostStatusBadge v-for="status in statuses" :key="status" :status="status" />
      </div>
    `,
  }),
}

export const AllStatusesLight: Story = {
  ...AllStatusesDark,
  globals: { theme: 'light' },
}
