import type { Meta, StoryObj } from '@storybook/vue3-vite'
import PsInput from './PsInput.vue'

const meta: Meta<typeof PsInput> = {
  title: 'UI/Input',
  component: PsInput,
  args: {
    label: 'E-Mail-Adresse',
    placeholder: 'max@beispiel.de',
    required: false,
    disabled: false,
  },
  render: (args) => ({
    components: { PsInput },
    setup: () => ({ args }),
    template: '<div class="max-w-[24rem]"><PsInput v-bind="args" /></div>',
  }),
}
export default meta
type Story = StoryObj<typeof PsInput>

export const Default: Story = {}
export const Required: Story = { args: { required: true } }
export const WithError: Story = {
  args: { error: 'Bitte eine gültige E-Mail-Adresse eingeben.', required: true },
}
export const Disabled: Story = { args: { disabled: true } }
