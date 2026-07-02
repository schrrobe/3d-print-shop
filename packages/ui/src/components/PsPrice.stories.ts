import type { Meta, StoryObj } from '@storybook/vue3-vite'
import PsPrice from './PsPrice.vue'

const meta: Meta<typeof PsPrice> = {
  title: 'Shop/Price',
  component: PsPrice,
  args: { cents: 2490, locale: 'de', size: 'md' },
  argTypes: {
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
    locale: { control: 'select', options: ['de', 'en', 'pl', 'fr', 'nl', 'cs'] },
  },
  render: (args) => ({
    components: { PsPrice },
    setup: () => ({ args }),
    template: '<PsPrice v-bind="args" />',
  }),
}
export default meta
type Story = StoryObj<typeof PsPrice>

export const Default: Story = {}
export const Large: Story = { args: { size: 'lg', cents: 12900 } }
export const AllSizes: Story = {
  render: () => ({
    components: { PsPrice },
    template: `
      <div class="flex items-baseline gap-lg">
        <PsPrice :cents="990" size="sm" />
        <PsPrice :cents="2490" size="md" />
        <PsPrice :cents="14900" size="lg" />
      </div>
    `,
  }),
}
