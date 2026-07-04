import type { Meta, StoryObj } from '@storybook/vue3-vite'
import PsStockBar from './PsStockBar.vue'

const meta: Meta<typeof PsStockBar> = {
  title: 'Admin/StockBar',
  component: PsStockBar,
  args: {
    value: 540,
    max: 1000,
    min: 200,
    labelText: '540 g / 1000 g',
  },
  render: (args) => ({
    components: { PsStockBar },
    setup: () => ({ args }),
    template: '<div class="max-w-[24rem]"><PsStockBar v-bind="args" /></div>',
  }),
}
export default meta
type Story = StoryObj<typeof PsStockBar>

export const Voll: Story = {
  args: { value: 1000, max: 1000, labelText: '1000 g / 1000 g' },
}
export const Niedrig: Story = {
  args: { value: 240, max: 1000, min: 200, labelText: '240 g / 1000 g' },
}
export const UnterMinimum: Story = {
  args: { value: 120, max: 1000, min: 200, labelText: '120 g / 1000 g' },
}
export const OhneMinimum: Story = {
  args: { value: 540, max: 1000, min: null, labelText: '540 g / 1000 g' },
}
