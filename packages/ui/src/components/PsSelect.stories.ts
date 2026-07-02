import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { ref } from 'vue'
import PsSelect from './PsSelect.vue'

const materialOptions = [
  { value: 'pla', label: 'PLA (matt)' },
  { value: 'petg', label: 'PETG (wetterfest)' },
  { value: 'abs', label: 'ABS (hitzebeständig)' },
  { value: 'tpu', label: 'TPU (flexibel)', disabled: true },
]

const meta: Meta<typeof PsSelect> = {
  title: 'UI/Select',
  component: PsSelect,
  args: {
    label: 'Material',
    options: materialOptions,
    placeholder: 'Material wählen',
  },
  render: (args) => ({
    components: { PsSelect },
    setup: () => ({ args, selected: ref<string | undefined>(undefined) }),
    template: '<div class="max-w-sm"><PsSelect v-bind="args" v-model="selected" /></div>',
  }),
}
export default meta
type Story = StoryObj<typeof PsSelect>

export const Default: Story = {}
export const WithError: Story = {
  args: { required: true, error: 'Bitte ein Material auswählen.' },
}
export const Disabled: Story = { args: { disabled: true } }
