import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { ref } from 'vue'
import PsButton from './PsButton.vue'
import PsDropdown from './PsDropdown.vue'

const orderActions = [
  { key: 'view', label: 'Bestellung ansehen' },
  { key: 'invoice', label: 'Rechnung herunterladen' },
  { key: 'reprint', label: 'Reprint anstoßen', disabled: true },
  { key: 'cancel', label: 'Stornieren', danger: true },
]

const meta: Meta<typeof PsDropdown> = {
  title: 'UI/Dropdown',
  component: PsDropdown,
  args: { items: orderActions },
  render: (args) => ({
    components: { PsDropdown, PsButton },
    setup: () => {
      const lastAction = ref('–')
      return { args, lastAction }
    },
    template: `
      <div class="flex flex-col items-start gap-md">
        <PsDropdown v-bind="args" @select="(key) => (lastAction = key)">
          <template #trigger>
            <PsButton variant="secondary">Aktionen ▾</PsButton>
          </template>
        </PsDropdown>
        <span class="text-caption text-secondary">Zuletzt gewählt: {{ lastAction }}</span>
      </div>
    `,
  }),
}
export default meta
type Story = StoryObj<typeof PsDropdown>

export const Default: Story = {}
export const OnlySafeActions: Story = {
  args: {
    items: [
      { key: 'edit', label: 'Bearbeiten' },
      { key: 'duplicate', label: 'Duplizieren' },
    ],
  },
}
