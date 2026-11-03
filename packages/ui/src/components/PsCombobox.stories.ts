import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { ref } from 'vue'
import PsCombobox from './PsCombobox.vue'

const calibers = ['.223 Rem', '.308', '6.5 Creedmoor', '7.62x51', '9mm', '.45 ACP', '.22 LR']
const productOptions = calibers.flatMap((c) =>
  ['50 Schuss', '100 Schuss'].map((n) => ({
    value: `${c}-${n}`,
    label: `Patronenbox – ${c} – ${n}`,
  })),
)

const meta: Meta<typeof PsCombobox> = {
  title: 'UI/Combobox',
  component: PsCombobox,
  args: { label: 'Aus dem Shop', options: productOptions, placeholder: 'Shop-Produkt suchen …' },
  render: (args) => ({
    components: { PsCombobox },
    setup: () => ({ args, selected: ref<string | undefined>(undefined) }),
    template: '<div class="max-w-[24rem]"><PsCombobox v-bind="args" v-model="selected" /></div>',
  }),
}
export default meta
type Story = StoryObj<typeof PsCombobox>

export const Default: Story = {}
export const WithError: Story = { args: { required: true, error: 'Bitte ein Produkt auswählen.' } }
export const Disabled: Story = { args: { disabled: true } }
