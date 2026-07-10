import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { expect, userEvent, within } from 'storybook/test'
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

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const input = canvas.getByLabelText('E-Mail-Adresse')
    await userEvent.type(input, 'max@beispiel.de')
    await expect(input).toHaveValue('max@beispiel.de')
  },
}
export const Required: Story = { args: { required: true } }
export const WithError: Story = {
  args: { error: 'Bitte eine gültige E-Mail-Adresse eingeben.', required: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const input = canvas.getByLabelText(/E-Mail-Adresse/)
    await expect(input).toHaveAttribute('aria-invalid', 'true')
    await expect(canvas.getByRole('alert')).toHaveTextContent(
      'Bitte eine gültige E-Mail-Adresse eingeben.',
    )
  },
}
export const Disabled: Story = {
  args: { disabled: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByLabelText('E-Mail-Adresse')).toBeDisabled()
  },
}
