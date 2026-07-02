import type { Meta, StoryObj } from '@storybook/vue3-vite'
import PsStatCounter from './PsStatCounter.vue'

const meta: Meta<typeof PsStatCounter> = {
  title: 'UI/StatCounter',
  component: PsStatCounter,
  args: {
    value: 12500,
    suffix: '+',
    label: 'Gedruckte Teile',
    durationSeconds: 1.6,
  },
  render: (args) => ({
    components: { PsStatCounter },
    setup: () => ({ args }),
    template: '<PsStatCounter v-bind="args" />',
  }),
}
export default meta
type Story = StoryObj<typeof PsStatCounter>

export const Default: Story = {}
export const Percentage: Story = {
  args: { value: 98, suffix: ' %', label: 'Zufriedene Kunden', durationSeconds: 2.4 },
}
export const StatRow: Story = {
  render: () => ({
    components: { PsStatCounter },
    template: `
      <div class="flex flex-wrap gap-4xl">
        <PsStatCounter :value="12500" suffix="+" label="Gedruckte Teile" />
        <PsStatCounter :value="14" label="Drucker im Einsatz" />
        <PsStatCounter :value="98" suffix=" %" label="Zufriedene Kunden" />
      </div>
    `,
  }),
}
