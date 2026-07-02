import type { Meta, StoryObj } from '@storybook/vue3-vite'
import PsTextarea from './PsTextarea.vue'

const meta: Meta<typeof PsTextarea> = {
  title: 'UI/Textarea',
  component: PsTextarea,
  args: {
    label: 'Anmerkungen zur Bestellung',
    placeholder: 'z. B. Wunschtermin, Farbhinweise …',
    rows: 4,
  },
  render: (args) => ({
    components: { PsTextarea },
    setup: () => ({ args }),
    template: '<div class="max-w-md"><PsTextarea v-bind="args" /></div>',
  }),
}
export default meta
type Story = StoryObj<typeof PsTextarea>

export const Default: Story = {}
export const WithError: Story = {
  args: { required: true, error: 'Bitte eine Nachricht eingeben.' },
}
export const TallAndDisabled: Story = { args: { rows: 8, disabled: true } }
