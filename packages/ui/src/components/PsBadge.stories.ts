import type { Meta, StoryObj } from '@storybook/vue3-vite'
import PsBadge from './PsBadge.vue'

const meta: Meta<typeof PsBadge> = {
  title: 'UI/Badge',
  component: PsBadge,
  args: { variant: 'default' },
  argTypes: {
    variant: { control: 'select', options: ['default', 'brand', 'warning', 'danger', 'info'] },
  },
  render: (args) => ({
    components: { PsBadge },
    setup: () => ({ args }),
    template: '<PsBadge v-bind="args">Neu</PsBadge>',
  }),
}
export default meta
type Story = StoryObj<typeof PsBadge>

export const Default: Story = {}
export const Brand: Story = { args: { variant: 'brand' } }

export const AllVariants: Story = {
  render: () => ({
    components: { PsBadge },
    template: `
      <div class="flex flex-wrap items-center gap-md">
        <PsBadge variant="default">Standard</PsBadge>
        <PsBadge variant="brand">Bestseller</PsBadge>
        <PsBadge variant="warning">Wenig Lager</PsBadge>
        <PsBadge variant="danger">Ausverkauft</PsBadge>
        <PsBadge variant="info">In Produktion</PsBadge>
      </div>
    `,
  }),
}
