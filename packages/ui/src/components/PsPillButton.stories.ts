import type { Meta, StoryObj } from '@storybook/vue3-vite'
import PsPillButton from './PsPillButton.vue'

const meta: Meta<typeof PsPillButton> = {
  title: 'UI/PillButton',
  component: PsPillButton,
  args: { variant: 'primary', size: 'md', disabled: false },
  argTypes: {
    variant: { control: 'select', options: ['primary', 'secondary', 'inverse'] },
    size: { control: 'select', options: ['sm', 'md', 'lg', 'xl'] },
  },
  render: (args) => ({
    components: { PsPillButton },
    setup: () => ({ args }),
    template: '<PsPillButton v-bind="args">Jetzt konfigurieren</PsPillButton>',
  }),
}
export default meta
type Story = StoryObj<typeof PsPillButton>

export const Primary: Story = {}
export const Secondary: Story = { args: { variant: 'secondary' } }
export const Inverse: Story = { args: { variant: 'inverse' } }

export const AllSizes: Story = {
  render: () => ({
    components: { PsPillButton },
    template: `
      <div class="flex flex-wrap items-center gap-md">
        <PsPillButton size="sm">Klein</PsPillButton>
        <PsPillButton size="md">Mittel</PsPillButton>
        <PsPillButton size="lg">Groß</PsPillButton>
        <PsPillButton size="xl">Extra groß</PsPillButton>
      </div>
    `,
  }),
}
