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
type ClickInteractionArgs = Partial<InstanceType<typeof PsButton>['$props']> & {
  onClick: ReturnType<typeof fn>
}

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

export const ClickInteraction: StoryObj<ClickInteractionArgs> = {
  args: {
    variant: 'primary',
    size: 'md',
    disabled: false,
    loading: false,
    onClick: fn(),
  },
  render: (args) => ({
    components: { PsButton },
    setup: () => ({ args }),
    template:
      '<PsButton :variant="args.variant" :size="args.size" :disabled="args.disabled" :loading="args.loading" @click="args.onClick">In den Warenkorb</PsButton>',
  }),
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole('button', { name: 'In den Warenkorb' }))
    await expect(args.onClick).toHaveBeenCalled()
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
