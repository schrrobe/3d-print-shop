import type { Meta, StoryObj } from '@storybook/vue3-vite'
import PsStepper from './PsStepper.vue'

const checkoutSteps = [
  { key: 'cart', label: 'Warenkorb' },
  { key: 'address', label: 'Adresse' },
  { key: 'payment', label: 'Zahlung' },
  { key: 'confirm', label: 'Bestätigung' },
]

const meta: Meta<typeof PsStepper> = {
  title: 'Shop/Stepper',
  component: PsStepper,
  args: { steps: checkoutSteps, current: 'payment' },
  render: (args) => ({
    components: { PsStepper },
    setup: () => ({ args }),
    template: '<PsStepper v-bind="args" />',
  }),
}
export default meta
type Story = StoryObj<typeof PsStepper>

export const Default: Story = {}
export const FirstStep: Story = { args: { current: 'cart' } }
export const LastStep: Story = { args: { current: 'confirm' } }
