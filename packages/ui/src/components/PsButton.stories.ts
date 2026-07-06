import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { expect, fn, userEvent, within } from 'storybook/test'
import PsButton from './PsButton.vue'

const meta: Meta<typeof PsButton> = {
  title: 'UI/Button',
  component: PsButton,
  args: { variant: 'primary', size: 'md', disabled: false, loading: false },
  argTypes: {
    variant: { control: 'select', options: ['primary', 'secondary', 'ghost', 'danger'] },
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
  },
  render: (args) => ({
    components: { PsButton },
    setup: () => ({ args }),
    template: '<PsButton v-bind="args">In den Warenkorb</PsButton>',
  }),
}
export default meta
type Story = StoryObj<typeof PsButton>

export const Primary: Story = {}
export const Secondary: Story = { args: { variant: 'secondary' } }
export const Ghost: Story = { args: { variant: 'ghost' } }
export const Danger: Story = { args: { variant: 'danger' } }
export const Loading: Story = { args: { loading: true } }
export const Disabled: Story = {
  args: { disabled: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByRole('button', { name: 'In den Warenkorb' })).toBeDisabled()
  },
}

const onClick = fn()
export const ClickInteraction: Story = {
  render: () => ({
    components: { PsButton },
    setup: () => ({ onClick }),
    template: '<PsButton @click="onClick">In den Warenkorb</PsButton>',
  }),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole('button', { name: 'In den Warenkorb' }))
    await expect(onClick).toHaveBeenCalled()
  },
}

export const AllVariants: Story = {
  render: () => ({
    components: { PsButton },
    template: `
      <div class="flex flex-wrap items-center gap-md">
        <PsButton variant="primary">Primary</PsButton>
        <PsButton variant="secondary">Secondary</PsButton>
        <PsButton variant="ghost">Ghost</PsButton>
        <PsButton variant="danger">Danger</PsButton>
        <PsButton variant="primary" loading>Loading</PsButton>
        <PsButton variant="primary" disabled>Disabled</PsButton>
      </div>
    `,
  }),
}
